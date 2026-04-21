import { useState, useRef } from 'react'
import { Upload, Link, HardDrive, X, ImageIcon, Video, Check, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Convert Google Drive share URLs to direct download URLs
function parseDriveUrl(url) {
  const patterns = [
    /drive\.google\.com\/file\/d\/([^/]+)/,
    /drive\.google\.com\/open\?id=([^&]+)/,
    /id=([^&]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`
  }
  return url // Return as-is if not a Drive URL
}

function UploadedMedia({ url, onRemove, label }) {
  const isVideo = url.match(/\.(mp4|webm|mov|avi)$/i) || url.includes('video')
  return (
    <div style={{
      position: 'relative', borderRadius: 8, overflow: 'hidden',
      border: '1px solid var(--border)',
      background: 'var(--surface-2)',
    }}>
      {isVideo ? (
        <div style={{
          height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface)',
        }}>
          <Video size={20} style={{ color: 'var(--text-muted)' }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>Video</span>
        </div>
      ) : (
        <img src={url} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none' }} />
      )}
      {label && (
        <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>
          {label}
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        style={{
          position: 'absolute', top: 4, right: 4,
          width: 20, height: 20,
          background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white',
        }}
      >
        <X size={10} />
      </button>
    </div>
  )
}

export default function MediaUpload({
  label,
  multiple = false,
  value,
  onChange,
  accept = 'image/*',
  bucket = 'itinerary-media',
  folder = '',
  itineraryId = null,
}) {
  const [tab, setTab] = useState('local') // 'local' | 'drive' | 'url'
  const [driveInput, setDriveInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const fileRef = useRef()

  const values = multiple ? (Array.isArray(value) ? value : []) : []
  const singleValue = !multiple ? value : null

  const addUrl = (url) => {
    if (!url.trim()) return
    if (multiple) {
      onChange([...values, url.trim()])
    } else {
      onChange(url.trim())
    }
  }

  const handleLocalUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    setUploadError(null)
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop()
        // Ensure folder has no leading/trailing slashes
        const normalizedFolder = folder ? String(folder).replace(/^\/+|\/+$/g, '') : ''
        const scopedFolder = itineraryId
          ? [normalizedFolder, String(itineraryId)].filter(Boolean).join('/')
          : normalizedFolder
        const folderPath = scopedFolder ? `${scopedFolder}/` : ''
        const path = `${folderPath}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
        addUrl(publicUrl)
        if (!multiple) break // Only first file for single
      }
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDriveAdd = () => {
    const url = parseDriveUrl(driveInput.trim())
    if (!url) return
    addUrl(url)
    setDriveInput('')
  }

  const handleUrlAdd = () => {
    addUrl(urlInput)
    setUrlInput('')
  }

  const remove = (url) => {
    if (multiple) onChange(values.filter(v => v !== url))
    else onChange('')
  }

  const tabStyle = (t) => ({
    padding: '6px 12px', fontSize: 12, fontWeight: tab === t ? 600 : 400,
    color: tab === t ? 'var(--text)' : 'var(--text-muted)',
    borderBottom: tab === t ? '2px solid var(--purple)' : '2px solid transparent',
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
  })

  return (
    <div>
      {/* Preview grid */}
      {multiple && values.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
          {values.map((url, i) => (
            <UploadedMedia key={i} url={url} onRemove={() => remove(url)} label={i === 0 ? 'Cover' : `Photo ${i + 1}`} />
          ))}
        </div>
      )}
      {!multiple && singleValue && (
        <div style={{ marginBottom: 12 }}>
          <UploadedMedia url={singleValue} onRemove={() => remove(singleValue)} />
        </div>
      )}

      {/* Upload tabs */}
      <div style={{
        border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
      }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <button type="button" style={tabStyle('local')} onClick={() => setTab('local')}>
            <Upload size={11} style={{ display: 'inline', marginRight: 4 }} />
            Local Upload
          </button>
          <button type="button" style={tabStyle('drive')} onClick={() => setTab('drive')}>
            <HardDrive size={11} style={{ display: 'inline', marginRight: 4 }} />
            Google Drive
          </button>
          <button type="button" style={tabStyle('url')} onClick={() => setTab('url')}>
            <Link size={11} style={{ display: 'inline', marginRight: 4 }} />
            URL
          </button>
        </div>

        <div style={{ padding: 16 }}>
          {tab === 'local' && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleLocalUpload}
                style={{ display: 'none' }}
                id={`file-${label}`}
              />
              <label htmlFor={`file-${label}`} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '24px 16px',
                border: '2px dashed var(--border)', borderRadius: 8,
                cursor: uploading ? 'not-allowed' : 'pointer',
                transition: 'border-color 0.15s',
                background: 'var(--surface)',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-active)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {uploading ? (
                  <>
                    <Loader size={20} style={{ color: 'var(--purple-light)', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Uploading to Supabase Storage…</span>
                  </>
                ) : (
                  <>
                    <Upload size={20} style={{ color: 'var(--text-dim)' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                      Click to upload · JPG, PNG, WebP, MP4 · Max 50MB
                    </span>
                  </>
                )}
              </label>
              {uploadError && (
                <p style={{ marginTop: 8, fontSize: 12, color: 'var(--red)' }}>{uploadError}</p>
              )}
            </div>
          )}

          {tab === 'drive' && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                Paste a Google Drive sharing link. The file must be set to <strong style={{ color: 'var(--text)' }}>Anyone with the link</strong> can view.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="field"
                  value={driveInput}
                  onChange={e => setDriveInput(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  style={{ flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && handleDriveAdd()}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleDriveAdd}>
                  <Check size={13} /> Add
                </button>
              </div>
              <p style={{ marginTop: 6, fontSize: 11, color: 'var(--text-dim)' }}>
                Supports /file/d/, /open?id=, and ?id= URL formats
              </p>
            </div>
          )}

          {tab === 'url' && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                Paste any direct image or video URL (Unsplash, Cloudinary, CDN, etc.)
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="field"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  style={{ flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && handleUrlAdd()}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleUrlAdd}>
                  <Check size={13} /> Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
