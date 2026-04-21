/**
 * Migration script
 * Copies existing public image URLs for each itinerary into a per-itinerary
 * folder inside the `itinerary-media` bucket and updates the Itineraries.rows
 * to point to the new public URLs.
 *
 * Usage:
 *   SUPABASE_URL=https://xyz.supabase.co SUPABASE_KEY=<service-or-admin-key> \
 *     node scripts/migrate-itinerary-media.js
 *
 * NOTE: Use a privileged key (service_role) if your storage/upload permissions
 * require it. Always test on a copy or a single itinerary first.
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const BUCKET = 'itinerary-media'

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function downloadAsBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
  const ab = await res.arrayBuffer()
  return { buffer: Buffer.from(ab), contentType: res.headers.get('content-type') }
}

async function migrateItinerary(it) {
  const folder = it.slug && String(it.slug).trim() ? it.slug : slugify(it.title) || `itinerary-${it.id}`
  const images = Array.isArray(it.images) ? it.images : []
  const updatedImages = []

  for (const url of images) {
    try {
      console.log(`Downloading ${url} ...`)
      const { buffer, contentType } = await downloadAsBuffer(url)

      // Derive a filename from the original URL
      const rawName = url.split('/').pop().split('?')[0]
      const name = rawName || `${Date.now()}`
      let destPath = `${folder}/${name}`

      // Try upload; if exists, append suffix
      let attempt = 0
      while (true) {
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(destPath, buffer, {
          upsert: false,
          contentType: contentType || undefined,
        })
        if (!upErr) break
        // If object exists, try a new name
        if (upErr.message && upErr.message.toLowerCase().includes('already exists')) {
          attempt += 1
          destPath = `${folder}/${Date.now()}-${attempt}-${name}`
          continue
        }
        throw upErr
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(destPath)
      updatedImages.push(pub.publicUrl)
      console.log(`Uploaded to ${pub.publicUrl}`)
    } catch (e) {
      console.error('Failed to migrate image', url, e.message || e)
      // Keep original url to avoid losing data
      updatedImages.push(url)
    }
  }

  // Update cover image URL if it matched one of the original images
  let newCover = it.cover_image_url
  if (it.cover_image_url) {
    const idx = images.indexOf(it.cover_image_url)
    if (idx !== -1 && updatedImages[idx]) newCover = updatedImages[idx]
  }

  // Update DB only if changes detected
  try {
    const payload = {}
    if (JSON.stringify(updatedImages) !== JSON.stringify(images)) payload.images = updatedImages
    if (newCover !== it.cover_image_url) payload.cover_image_url = newCover
    if (Object.keys(payload).length > 0) {
      console.log(`Updating itinerary ${it.id} with new image URLs...`)
      const { error } = await supabase.from('Itineraries').update(payload).eq('id', it.id)
      if (error) throw error
      console.log(`Itinerary ${it.id} updated.`)
    } else {
      console.log(`No changes for itinerary ${it.id}`)
    }
  } catch (e) {
    console.error('Failed to update itinerary', it.id, e.message || e)
  }
}

async function run() {
  console.log('Fetching itineraries...')
  const { data, error } = await supabase.from('Itineraries').select('id,slug,title,images,cover_image_url')
  if (error) throw error
  console.log(`Found ${data.length} itineraries`)

  for (const it of data) {
    console.log('\n---')
    console.log(`Migrating itinerary ${it.id} (${it.title || it.slug})`)
    await migrateItinerary(it)
  }

  console.log('\nMigration complete')
}

run().catch(err => {
  console.error('Migration failed', err)
  process.exit(1)
})
