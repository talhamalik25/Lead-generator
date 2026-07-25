const area = 'DHA Karachi'
const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(area)}&format=json&limit=5`, {
  headers: { 'User-Agent': 'CoreCraft-LeadFinder/1.0' }
})
const geoData = await res.json()
console.log('Nominatim items:')
geoData.forEach((item, i) => {
  console.log(`${i}: Name: "${item.display_name}", Class/Type: "${item.class}/${item.type}", Addresstype: "${item.addresstype}"`)
})

let bestMatch = geoData[0]
for (const item of geoData) {
  if (['neighbourhood', 'suburb', 'administrative', 'village', 'town', 'city'].includes(item.addresstype)) {
    bestMatch = item
    break
  }
}
console.log('Selected bestMatch:', bestMatch.display_name, 'Lat/Lon:', bestMatch.lat, bestMatch.lon)
