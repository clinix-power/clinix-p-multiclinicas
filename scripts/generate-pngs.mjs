import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const svgBuffer = readFileSync(join(publicDir, 'icon.svg'))

async function generate(size, filename) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(join(publicDir, filename))
  console.log(`✅ ${filename} (${size}x${size})`)
}

/**
 * Build a valid ICO file from one or more PNG buffers.
 * ICO format: 6-byte header + 16-byte directory per image + raw PNG data.
 */
function buildIco(pngBuffers) {
  const count = pngBuffers.length
  const headerSize = 6
  const dirSize = 16 * count
  let dataOffset = headerSize + dirSize

  // ICO header: reserved(2) + type=1(2) + count(2)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)      // reserved
  header.writeUInt16LE(1, 2)      // type: 1 = ICO
  header.writeUInt16LE(count, 4)  // image count

  const dirs = []
  const datas = []

  for (const png of pngBuffers) {
    // Read PNG header for dimensions
    // PNG: 8-byte signature, then IHDR chunk: 4-byte length, 4-byte type, 4-byte width, 4-byte height
    const w = png.readUInt32BE(16)
    const h = png.readUInt32BE(20)

    const dir = Buffer.alloc(16)
    dir.writeUInt8(w >= 256 ? 0 : w, 0)    // width (0 = 256)
    dir.writeUInt8(h >= 256 ? 0 : h, 1)    // height (0 = 256)
    dir.writeUInt8(0, 2)                     // color palette
    dir.writeUInt8(0, 3)                     // reserved
    dir.writeUInt16LE(1, 4)                  // color planes
    dir.writeUInt16LE(32, 6)                 // bits per pixel
    dir.writeUInt32LE(png.length, 8)         // image data size
    dir.writeUInt32LE(dataOffset, 12)        // offset to image data

    dirs.push(dir)
    datas.push(png)
    dataOffset += png.length
  }

  return Buffer.concat([header, ...dirs, ...datas])
}

// Generate all PNGs
await generate(16, '_ico-16.png')
await generate(32, '_ico-32.png')
await generate(48, '_ico-48.png')
await generate(180, 'apple-touch-icon.png')
await generate(192, 'icon-192.png')
await generate(512, 'icon-512.png')

// Build favicon.ico from 16, 32, 48 PNGs
const ico16 = readFileSync(join(publicDir, '_ico-16.png'))
const ico32 = readFileSync(join(publicDir, '_ico-32.png'))
const ico48 = readFileSync(join(publicDir, '_ico-48.png'))

const icoBuffer = buildIco([ico16, ico32, ico48])
writeFileSync(join(publicDir, 'favicon.ico'), icoBuffer)
console.log(`✅ favicon.ico (16+32+48 multi-size)`)

// Clean up temp files
import { unlinkSync } from 'fs'
for (const f of ['_ico-16.png', '_ico-32.png', '_ico-48.png']) {
  try { unlinkSync(join(publicDir, f)) } catch {}
}

console.log(`✅ apple-touch-icon.png (180x180)`)
console.log('\nAll icons generated successfully.')
