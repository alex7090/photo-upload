import express, { Application, Request, Response } from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// AWS S3 Configuration
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1',
});

const s3 = new AWS.S3();
const bucketName = process.env.AWS_S3_BUCKET_NAME || 'bapteme-josephine-photos';

// Configure multer with memory storage (for streaming to S3)
const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Only allow image files
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req: Request, res: Response) => {
  res.send('Photo upload server running');
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Upload endpoint
app.post('/api/upload', upload.array('photos', 100), async (req: Request, res: Response) => {
  try {
    if (!req.files || req.files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const uploadedFiles = [];

    // Upload each file to S3
    for (const file of files) {
      const uniqueFilename = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);

      const params = {
        Bucket: bucketName,
        Key: uniqueFilename,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      await s3.upload(params).promise();

      uploadedFiles.push({
        filename: uniqueFilename,
        originalName: file.originalname,
        size: file.size,
        uploadedAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get files list with signed URLs
app.get('/api/files', async (req: Request, res: Response) => {
  try {
    const params = { Bucket: bucketName };
    const data = await s3.listObjects(params).promise();

    const filesList = await Promise.all(
      (data.Contents || []).map(async (file) => {
        // Generate a signed URL valid for 1 hour
        const signedUrl = await s3.getSignedUrlPromise('getObject', {
          Bucket: bucketName,
          Key: file.Key,
          Expires: 3600, // 1 hour
        });

        return {
          name: file.Key,
          url: signedUrl,
          size: file.Size,
          updated: file.LastModified,
        };
      })
    );

    res.json({ files: filesList });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Using S3 bucket: ${bucketName}`);
});