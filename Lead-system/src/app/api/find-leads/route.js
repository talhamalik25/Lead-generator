import { NextResponse } from 'next/server'

// ─── Niche → OSM tag mapping ────────────────────────────────────────────────

const NICHE_TAGS = {
  cafe: ['amenity=cafe'],
  coffee: ['amenity=cafe'],
  restaurant: ['amenity=restaurant'],
  food: ['amenity=restaurant', 'amenity=fast_food'],
  bakery: ['shop=bakery'],
  salon: ['shop=hairdresser', 'shop=beauty'],
  barber: ['shop=hairdresser'],
  beauty: ['shop=beauty'],
  spa: ['leisure=spa', 'shop=beauty'],
  clinic: ['amenity=clinic', 'amenity=doctors'],
  doctor: ['amenity=doctors', 'amenity=clinic'],
  hospital: ['amenity=hospital'],
  dentist: ['amenity=dentist'],
  pharmacy: ['amenity=pharmacy'],
  gym: ['leisure=fitness_centre'],
  fitness: ['leisure=fitness_centre'],
  hotel: ['tourism=hotel'],
  guest_house: ['tourism=guest_house'],
  school: ['amenity=school'],
  tutor: ['amenity=school'],
  tailor: ['shop=tailor'],
  clothes: ['shop=clothes'],
  boutique: ['shop=boutique', 'shop=clothes'],
  grocery: ['shop=grocery', 'shop=supermarket'],
  supermarket: ['shop=supermarket'],
  electronics: ['shop=electronics'],
  mobile: ['shop=mobile_phone'],
  phone: ['shop=mobile_phone'],
  jewelry: ['shop=jewelry'],
  optician: ['shop=optician'],
  car: ['shop=car_repair', 'shop=car'],
  mechanic: ['shop=car_repair'],
  laundry: ['shop=laundry'],
  pet: ['shop=pet'],
  bookstore: ['shop=books'],
  stationery: ['shop=stationery'],
  furniture: ['shop=furniture'],
  florist: ['shop=florist'],
  photography: ['shop=photo'],
}

const USER_AGENT = 'CoreCraft-LeadFinder/1.0 (lead-system-app)'
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const SEARCH_RADIUS = 4000 // metres

// Retry mirrors list for Overpass
const OVERPASS_ENDPOINTS = [
  'https://z.overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter'
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getOsmTags(niche) {
  const key = niche.toLowerCase().trim()

  // Direct match
  if (NICHE_TAGS[key]) return NICHE_TAGS[key]

  // Partial match
  for (const [k, v] of Object.entries(NICHE_TAGS)) {
    if (key.includes(k)) return v
  }

  // Fallback to name search
  return null
}

function buildOverpassQuery(lat, lon, niche) {
  const tags = getOsmTags(niche)
  const around = `(around:${SEARCH_RADIUS},${lat},${lon})`

  let filters
  if (tags) {
    filters = tags
      .map((tag) => {
        const [k, v] = tag.split('=')
        return `  node["${k}"="${v}"]["name"]${around};\n  way["${k}"="${v}"]["name"]${around};`
      })
      .join('\n')
  } else {
    // Escape name for Safe Regex
    const escaped = niche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filters = [
      `  node["name"~"${escaped}",i]${around};`,
      `  way["name"~"${escaped}",i]${around};`,
    ].join('\n')
  }

  return `[out:json][timeout:20];\n(\n${filters}\n);\nout center tags 30;`
}

function mapResult(element, fallbackArea) {
  const tags = element.tags || {}

  const name = (tags.name || '').trim()
  if (!name) return null

  // Skip results with existing websites
  if (tags.website || tags['contact:website'] || tags.url) return null

  const area =
    tags['addr:suburb'] ||
    tags['addr:neighbourhood'] ||
    tags['addr:street'] ||
    tags['addr:city'] ||
    fallbackArea

  const phone = (tags.phone || tags['contact:phone'] || '').trim()

  const reason = 'No website listed on OpenStreetMap — good candidate for web design outreach.'

  return { name, area, phone, reason }
}

async function fetchFromOverpass(query) {
  let lastError = null

  for (const ep of OVERPASS_ENDPOINTS) {
    try {
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
        return JSON.parse(text)
      } else {
        // Log individual mirror failure and retry
        console.warn(`Overpass mirror ${ep} failed:`, text.substring(0, 100))
        lastError = new Error(`Overpass mirror returned status ${res.status}`)
      }
    } catch (err) {
      console.warn(`Overpass mirror ${ep} fetch failed:`, err.message)
      lastError = err
    }
  }

  throw lastError || new Error('All Overpass API mirrors were exhausted')
}

// ─── API route handler ──────────────────────────────────────────────────────

export async function POST(req) {
  try {
    const payload = await req.json()
    const niche = String(payload.niche ?? '').trim()
    const area = String(payload.area ?? '').trim()

    if (!niche || !area) {
      return NextResponse.json({ error: 'Both niche and area are required' }, { status: 400 })
    }

    // 1. Geocode area via Nominatim
    const geoUrl = `${NOMINATIM_BASE}/search?${new URLSearchParams({
      q: area,
      format: 'json',
      limit: '5', // Get top 5 results to filter intelligently
    })}`

    const geoRes = await fetch(geoUrl, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!geoRes.ok) {
      return NextResponse.json({ error: `Geocoding request failed (${geoRes.status})` }, { status: 500 })
    }

    const geoData = await geoRes.json()
    if (!geoData.length) {
      return NextResponse.json({ error: `Could not geocode location "${area}".` }, { status: 400 })
    }

    // Heuristically find the best match (favor suburbs/neighbourhoods or administrative over specific POI buildings)
    let bestMatch = geoData[0]
    for (const item of geoData) {
      if (['neighbourhood', 'suburb', 'administrative', 'village', 'town', 'city'].includes(item.addresstype)) {
        bestMatch = item
        break
      }
    }

    const { lat, lon } = bestMatch

    // Rate-limiting pause as per OS/Nominatim guidelines
    await delay(1000)

    // 2. Query Overpass with fallback mirrors
    const query = buildOverpassQuery(lat, lon, niche)
    const overpassData = await fetchFromOverpass(query)
    const elements = overpassData.elements || []

    // 3. Map, clean, and filter
    const parsedResults = elements
      .map((el) => mapResult(el, area))
      .filter(Boolean)

    // Deduplicate by lowercase name
    const seenNames = new Set()
    const uniqueResults = []
    for (const item of parsedResults) {
      const lower = item.name.toLowerCase()
      if (!seenNames.has(lower)) {
        seenNames.add(lower)
        uniqueResults.push(item)
      }
    }

    return NextResponse.json({ results: uniqueResults.slice(0, 15) })
  } catch (err) {
    console.error('Find leads error:', err)
    return NextResponse.json({ error: err.message || 'Find leads operation failed.' }, { status: 500 })
  }
}
