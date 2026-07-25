const NICHE_TAGS = {
  cafe: ['amenity=cafe'],
  coffee: ['amenity=cafe'],
  restaurant: ['amenity=restaurant'],
}

const USER_AGENT = 'CoreCraft-LeadFinder/1.0 (lead-system-app)'
const SEARCH_RADIUS = 4000
const OVERPASS_ENDPOINTS = [
  'https://z.overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter'
]

function buildOverpassQuery(lat, lon, niche) {
  const tags = NICHE_TAGS[niche]
  const around = `(around:${SEARCH_RADIUS},${lat},${lon})`
  const filters = tags
    .map((tag) => {
      const [k, v] = tag.split('=')
      return `  node["${k}"="${v}"]["name"]${around};\n  way["${k}"="${v}"]["name"]${around};\n  relation["${k}"="${v}"]["name"]${around};`
    })
    .join('\n')
  return `[out:json][timeout:20];\n(\n${filters}\n);\nout center tags 30;`
}

async function fetchFromOverpass(query) {
  let lastError = null
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      console.log(`Querying mirror ${ep}...`)
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
      })
      const text = await res.text()
      if (res.ok) {
        console.log(`Success on mirror ${ep}`)
        return JSON.parse(text)
      } else {
        console.warn(`Mirror ${ep} failed with status ${res.status}:`, text.substring(0, 150))
        lastError = new Error(`Overpass mirror returned status ${res.status}`)
      }
    } catch (err) {
      console.warn(`Mirror ${ep} fetch failed:`, err.message)
      lastError = err
    }
  }
  throw lastError
}

const lat = 24.8154624
const lon = 67.0718989
const query = buildOverpassQuery(lat, lon, 'restaurant')
console.log('Query Overpass QL:\n', query)

try {
  const data = await fetchFromOverpass(query)
  console.log('Elements count:', data.elements?.length)
  if (data.elements?.length > 0) {
    console.log('Sample elements:', data.elements.slice(0, 5).map(e => e.tags?.name))
  }
} catch (e) {
  console.error('Final Error:', e.message)
}
