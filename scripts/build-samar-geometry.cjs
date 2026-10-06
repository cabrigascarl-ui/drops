// Builds public/data/samar-island-*.geojson from public PSA/NAMRIA-derived sources.
//
// Sources (place them in .geo-source/ first):
//   .geo-source/hires/bgysubmuns-municity-80{26,48,60}*.0.1.json
//       Barangay geometry, 2023 PSA/NAMRIA boundaries, "hires" set from
//       https://github.com/faeldon/philippines-json-maps/tree/master/2023/geojson/municities/hires
//   .geo-source/{barangays,municipalities,component_cities}.geojson
//       PSGC names and official areas from
//       https://github.com/bendlikeabamboo/barangay-boundaries-repository/releases/tag/v2026.4.13.0
//
// Barangays are the single geometry source. Localities and provinces are dissolved from them,
// so every level shares identical edges with no gaps or overlaps.
// Run: npm run build:geo
const fs = require('node:fs')
const path = require('node:path')
const mapshaper = require('mapshaper')

const source = path.resolve('.geo-source')
const target = path.resolve('public/data')
const SIMPLIFY_METERS = 15
const PRECISION = 0.00001
const provinceNames = {
  '0802600000': 'Eastern Samar',
  '0804800000': 'Northern Samar',
  '0806000000': 'Samar Province'
}
const provinceCodes = new Set(Object.keys(provinceNames))
// Display names for localities whose PSGC names carry suffixes or differ in casing.
const localityNames = {
  '0802604000': 'Borongan City',
  '0806003000': 'Calbayog City',
  '0806005000': 'Catbalogan City',
  '0804805000': 'Catarman',
  '0806022000': 'Paranas',
  '0804824000': 'Lope de Vega',
  '0802607000': 'General MacArthur'
}
const provinceCodeOf = code => `${code.slice(0, 5)}00000`
const localityCodeOf = code => `${code.slice(0, 7)}000`
const psgc = value => String(value).padStart(10, '0')
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const readSource = name => readJson(path.join(source, `${name}.geojson`)).features
const collection = features => ({ type: 'FeatureCollection', features })
const parts = geometry => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
const ringArea = ring => Math.abs(ring.reduce((sum, [x, y], index) => { const [nx, ny] = ring[(index + 1) % ring.length]; return sum + x * ny - nx * y }, 0)) / 2
const insideRing = ([x, y], ring) => ring.reduce((inside, [xi, yi], index) => { const [xj, yj] = ring[(index + ring.length - 1) % ring.length]; return ((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi) + xi ? !inside : inside }, false)
const insidePart = (point, part) => insideRing(point, part[0]) && !part.slice(1).some(hole => insideRing(point, hole))
const round = ([lng, lat]) => [Number(lng.toFixed(5)), Number(lat.toFixed(5))]

async function run(commands, inputs) {
  const output = await mapshaper.applyCommands(commands, inputs)
  return JSON.parse(output['out.json'])
}

async function main() {
  const { default: polylabel } = await import('polylabel')
  // Label point: visual center (pole of inaccessibility) of the part that best represents the area.
  // By default the largest part; localities use the part holding most of their barangays, so an
  // island like Homonhon does not take Guiuan's label away from the town proper.
  const labelPoint = (geometry, points = []) => {
    const candidates = parts(geometry)
    const score = part => points.length ? points.filter(point => insidePart(point, part)).length * 1e6 + ringArea(part[0]) : ringArea(part[0])
    const best = candidates.reduce((top, part) => score(part) > score(top) ? part : top, candidates[0])
    return round(polylabel(best, 0.0002))
  }
  // PSGC attributes keyed by 10-digit code.
  const psaBarangays = readSource('barangays').filter(feature => provinceCodes.has(provinceCodeOf(feature.properties.psgc_code)))
  const barangayInfo = Object.fromEntries(psaBarangays.map(feature => [feature.properties.psgc_code, feature]))
  const localityInfo = Object.fromEntries([...readSource('municipalities'), ...readSource('component_cities')]
    .filter(feature => provinceCodes.has(provinceCodeOf(feature.properties.psgc_code)))
    .map(feature => [feature.properties.psgc_code, feature.properties]))

  // High-resolution barangay geometry.
  const hiresDir = path.join(source, 'hires')
  const hires = fs.readdirSync(hiresDir).filter(name => /^bgysubmuns-municity-80(26|48|60)\d+\.0\.1\.json$/.test(name))
    .flatMap(name => readJson(path.join(hiresDir, name)).features)
    .map(feature => ({ type: 'Feature', properties: { code: psgc(feature.properties.adm4_psgc) }, geometry: feature.geometry }))
  // A few tiny poblacion barangays have no hires polygon (they are merged into a neighbor).
  // Carve them out using the PSA/NAMRIA footprint from the PSGC release.
  const missing = hires.filter(feature => !feature.geometry).map(feature => feature.properties.code)
  const patches = collection(missing.map(code => ({ type: 'Feature', properties: { code }, geometry: barangayInfo[code].geometry })))
  const withGeometry = collection(hires.filter(feature => feature.geometry))
  const carved = missing.length
    ? await run('-i hires.json -erase patches.json -o out.json format=geojson', { 'hires.json': withGeometry, 'patches.json': patches })
    : withGeometry
  const clipped = missing.length
    ? await run('-i patches.json -clip hires.json -o out.json format=geojson', { 'hires.json': withGeometry, 'patches.json': patches })
    : collection([])
  const merged = collection([...carved.features, ...clipped.features].map(feature => ({
    ...feature,
    properties: { code: feature.properties.code, localityCode: localityCodeOf(feature.properties.code), provinceCode: provinceCodeOf(feature.properties.code) }
  })))

  // Fill slivers, simplify along shared arcs, then dissolve upward.
  const simplify = `-i in.json -clean -simplify interval=${SIMPLIFY_METERS} keep-shapes`
  const output = `-o out.json format=geojson precision=${PRECISION}`
  const barangayShapes = await run(`${simplify} ${output}`, { 'in.json': merged })
  const localityShapes = await run(`${simplify} -dissolve2 localityCode ${output}`, { 'in.json': merged })
  const provinceShapes = await run(`${simplify} -dissolve2 provinceCode ${output}`, { 'in.json': merged })

  const barangays = barangayShapes.features.map(feature => {
    const code = feature.properties.code
    const info = barangayInfo[code]?.properties
    if (!info) throw new Error(`No PSGC record for barangay ${code}`)
    const localityCode = localityCodeOf(code)
    const provinceCode = provinceCodeOf(code)
    return {
      type: 'Feature',
      properties: { code, name: info.ADM4_EN, officialName: info.psgc_name, localityCode, locality: localityNames[localityCode] || localityInfo[localityCode].ADM3_EN, provinceCode, province: provinceNames[provinceCode], areaKm2: Number((info.AREA_SQKM || 0).toFixed(2)), labelPoint: labelPoint(feature.geometry) },
      geometry: feature.geometry
    }
  }).sort((a, b) => a.properties.code.localeCompare(b.properties.code))

  const localities = localityShapes.features.map(feature => {
    const code = feature.properties.localityCode
    const info = localityInfo[code]
    if (!info) throw new Error(`No PSGC record for locality ${code}`)
    const provinceCode = provinceCodeOf(code)
    return {
      type: 'Feature',
      properties: { code, name: localityNames[code] || info.ADM3_EN, kind: info.psgc_type === 'component_city' ? 'City' : 'Municipality', provinceCode, province: provinceNames[provinceCode], areaKm2: Math.round(info.AREA_SQKM || 0), labelPoint: labelPoint(feature.geometry, barangays.filter(barangay => barangay.properties.localityCode === code).map(barangay => barangay.properties.labelPoint)) },
      geometry: feature.geometry
    }
  }).sort((a, b) => a.properties.name.localeCompare(b.properties.name))

  const provinces = provinceShapes.features.map(feature => {
    const code = feature.properties.provinceCode
    const areaKm2 = Math.round(localities.filter(locality => locality.properties.provinceCode === code).reduce((sum, locality) => sum + locality.properties.areaKm2, 0))
    return { type: 'Feature', properties: { code, name: provinceNames[code], areaKm2, labelPoint: labelPoint(feature.geometry) }, geometry: feature.geometry }
  }).sort((a, b) => a.properties.name.localeCompare(b.properties.name))

  const unnamed = barangays.filter(feature => !feature.properties.name || !feature.properties.locality)
  if (localities.length !== 73 || barangays.length !== 2117 || provinces.length !== 3 || unnamed.length || new Set(barangays.map(feature => feature.properties.code)).size !== 2117) {
    throw new Error(`Unexpected Samar Island coverage: ${localities.length} localities, ${barangays.length} barangays, ${provinces.length} provinces, ${unnamed.length} unnamed`)
  }
  fs.mkdirSync(target, { recursive: true })
  for (const [name, features] of [['samar-island-localities', localities], ['samar-island-barangays', barangays], ['samar-island-provinces', provinces]]) {
    fs.writeFileSync(path.join(target, `${name}.geojson`), JSON.stringify(collection(features)))
  }
  console.log(`Wrote ${localities.length} localities, ${barangays.length} barangays, and ${provinces.length} provinces${missing.length ? ` (${missing.length} barangay footprint patched: ${missing.join(', ')})` : ''}.`)
}

main().catch(error => { console.error(error); process.exit(1) })
