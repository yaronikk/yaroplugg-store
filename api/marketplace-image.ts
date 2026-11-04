import type { IncomingMessage, ServerResponse } from 'node:http'
import sharp from 'sharp'

const STORAGE_ORIGIN = 'https://itbatnhmrmvegspsqmgb.supabase.co'
const MAX_SOURCE_BYTES = 10 * 1024 * 1024
const ALLOWED_WIDTHS = new Set([640, 1600, 2200])

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    res.setHeader('Cache-Control', 'no-store')
    res.statusCode = 405
    res.end('Method not allowed')
    return
  }

  const requestUrl = new URL(req.url || '/', 'https://yaropluggstore.vercel.app')
  const path = requestUrl.searchParams.get('path') || ''
  const width = Number(requestUrl.searchParams.get('width') || 640)

  if (!path.startsWith('marketplace-listings/') || path.includes('..') || path.includes('\\') || !ALLOWED_WIDTHS.has(width)) {
    res.setHeader('Cache-Control', 'no-store')
    res.statusCode = 400
    res.end('Invalid image request')
    return
  }

  try {
    const safePath = path.split('/').map(encodeURIComponent).join('/')
    const sourceUrl = STORAGE_ORIGIN + '/storage/v1/object/public/' + safePath
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15000) })
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (!response.ok || contentLength > MAX_SOURCE_BYTES) {
      res.setHeader('Cache-Control', 'no-store')
      res.statusCode = response.status === 404 ? 404 : 502
      res.end('Source image unavailable')
      return
    }

    const source = Buffer.from(await response.arrayBuffer())
    if (source.length > MAX_SOURCE_BYTES) {
      res.setHeader('Cache-Control', 'no-store')
      res.statusCode = 413
      res.end('Source image too large')
      return
    }

    const output = await sharp(source, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 74, effort: 4 })
      .toBuffer()

    res.setHeader('Content-Type', 'image/webp')
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (req.method === 'HEAD') {
      res.statusCode = 200
      res.end()
      return
    }
    res.statusCode = 200
    res.end(output)
  } catch {
    res.setHeader('Cache-Control', 'no-store')
    res.statusCode = 502
    res.end('Image optimization failed')
  }
}
