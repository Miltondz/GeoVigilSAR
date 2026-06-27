// Copy Cesium static assets to public/cesium so they are served at /cesium/*
// Run: node scripts/copy-cesium.js  (also wired as npm run copy-cesium)
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const src = path.join(root, 'node_modules', 'cesium', 'Build', 'Cesium')
const dest = path.join(root, 'public', 'cesium')

if (!fs.existsSync(src)) {
  console.error('[copy-cesium] cesium Build/Cesium not found — run npm install first')
  process.exit(1)
}

const dirs = ['Workers', 'ThirdParty', 'Assets', 'Widgets']

for (const dir of dirs) {
  const from = path.join(src, dir)
  const to = path.join(dest, dir)
  if (!fs.existsSync(from)) {
    console.warn(`[copy-cesium] skipping missing dir: ${from}`)
    continue
  }
  fs.mkdirSync(to, { recursive: true })
  fs.cpSync(from, to, { recursive: true })
  console.log(`[copy-cesium] ${dir} → public/cesium/${dir}`)
}

console.log('[copy-cesium] done.')
