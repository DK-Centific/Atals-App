// Builds src/data/zipCentroids.js from the US Census ZCTA gazetteer text file
// (2020_Gaz_zcta_national.txt: GEOID, ALAND, AWATER, ..., INTPTLAT, INTPTLONG).
// Keeps only the ZIP prefixes Atlas works in (Washington: 980-994).
//   node scripts/zip-centroids.mjs path/to/2020_Gaz_zcta_national.txt

import { readFileSync, writeFileSync } from 'node:fs'

const PREFIXES = /^(98\d|99[0-4])/
const [file] = process.argv.slice(2)
if (!file) { console.error('Usage: node scripts/zip-centroids.mjs <gazetteer .txt>'); process.exit(1) }

const [head, ...rows] = readFileSync(file, 'utf8').trim().split('\n').map((l) => l.split('\t').map((c) => c.trim()))
const col = (name) => head.indexOf(name)
const [zipI, latI, lngI] = [col('GEOID'), col('INTPTLAT'), col('INTPTLONG')]
const table = {}
for (const r of rows) {
  if (!PREFIXES.test(r[zipI])) continue
  table[r[zipI]] = [Number(Number(r[latI]).toFixed(4)), Number(Number(r[lngI]).toFixed(4))]
}

const out = 'src/data/zipCentroids.js'
const src = readFileSync(out, 'utf8').replace(/export const ZIP_CENTROIDS = [\s\S]*$/, `export const ZIP_CENTROIDS = ${JSON.stringify(table)}\n`)
writeFileSync(out, src)
console.log(`${Object.keys(table).length} ZIP centres written to ${out}`)
