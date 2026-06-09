import React, { useRef, useState, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import './App.css'

interface UploadedFile {
  filename: string
  originalName: string
  size: number
  uploadedAt: string
  url: string
}

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadCount, setUploadCount] = useState(0)
  const [photos, setPhotos] = useState<UploadedFile[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  useEffect(() => {
    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    try {
      setLoadingPhotos(true)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/api/files`)
      if (response.ok) {
        const data = await response.json()
        setPhotos(data.files || [])
      }
    } catch (err) {
      console.error('Error fetching photos:', err)
    } finally {
      setLoadingPhotos(false)
    }
  }

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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/api/upload`, {
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
      
      // Refresh photo list
      fetchPhotos()
      
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

        {/* Carousel Section */}
        {photos.length > 0 && (
          <div className="carousel-section">
            <h2>📸 Gallery</h2>
            <Swiper
              modules={[Navigation, Pagination]}
              navigation
              pagination={{ clickable: true }}
              spaceBetween={10}
              slidesPerView={1}
              className="photos-carousel"
            >
              {photos.map((photo) => (
                <SwiperSlide key={photo.name}>
                  <img src={photo.url} alt={photo.originalName} />
                </SwiperSlide>
              ))}
            </Swiper>
            <p className="photo-count">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'} uploaded
            </p>
          </div>
        )}

        {loadingPhotos && <p className="loading-text">Loading photos...</p>}
      </div>
    </div>
  )
}

export default App
