import sharp from 'sharp'
import { execFileSync } from 'node:child_process'
import { stat, unlink } from 'node:fs/promises'

const source = 'public/hero-drop.png'
const optimized = 'public/hero-drop.webp'
const outputPng = 'dist/hero-drop.png'

const original = await stat(source)
await sharp(source).webp({ quality: 82, effort: 5 }).toFile(optimized)
const webp = await stat(optimized)

try {
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { stdio: 'inherit' })
  await unlink(outputPng).catch(() => {})
  console.log(`Hero image optimized: ${(original.size / 1024 / 1024).toFixed(2)} MB → ${(webp.size / 1024).toFixed(0)} KB WebP`)
} finally {
  await unlink(optimized).catch(() => {})
}
