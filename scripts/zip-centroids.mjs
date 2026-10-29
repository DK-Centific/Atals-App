// Builds src/data/zipCentroids.json from the US Census ZCTA gazetteer text file
// (2020_Gaz_zcta_national.txt: GEOID, ALAND, AWATER, ..., INTPTLAT, INTPTLONG).
// Every US ZIP: OneForma participants live all over the country. Public domain;
// the app loads it as its own file after the page (src/lib/zipPoints.js).
//   node scripts/zip-centroids.mjs path/to/2020_Gaz_zcta_national.txt

import { readFileSync, writeFileSync } from 'node:fs'

const [file] = process.argv.slice(2)
if (!file) { console.error('Usage: node scripts/zip-centroids.mjs <gazetteer .txt>'); process.exit(1) }

const [head, ...rows] = readFileSync(file, 'utf8').trim().split('\n').map((l) => l.split('\t').map((c) => c.trim()))
const col = (name) => head.indexOf(name)
const [zipI, latI, lngI] = [col('GEOID'), col('INTPTLAT'), col('INTPTLONG')]
const table = {}
for (const r of rows) {
  if (!/^\d{5}$/.test(r[zipI] ?? '')) continue
  table[r[zipI]] = [Number(Number(r[latI]).toFixed(4)), Number(Number(r[lngI]).toFixed(4))]
}

const out = 'src/data/zipCentroids.json'
writeFileSync(out, `${JSON.stringify(table)}\n`)
console.log(`${Object.keys(table).length} ZIP centres written to ${out}`)
