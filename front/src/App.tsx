import React, { useRef, useState } from 'react'
import './App.css'

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadCount, setUploadCount] = useState(0)

  const handleUpload = async (files: FileList) => {
    if (files.length === 0) return

    setUploading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i])
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setSuccess(true)
      setUploadCount(data.files.length)
      console.log('Upload successful:', data)
      
      // Reset after 3 seconds
      setTimeout(() => {
        setSuccess(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>👶 Baptême de Joséphine</h1>
        <p className="subtitle">Partagez vos plus beaux moments</p>
        
        <button
          className={`upload-button ${uploading ? 'loading' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : '📸 Select Photos'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          style={{ display: 'none' }}
        />

        {success && (
          <div className="message success">
            ✓ {uploadCount} photo(s) uploaded successfully!
          </div>
        )}

        {error && (
          <div className="message error">
            ✗ {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
