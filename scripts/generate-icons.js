import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const toCrc = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(toCrc), 8 + len);
  return buf;
}

function generatePNG(size, isMaskable = false) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  // Background: Emerald-600 #059669 (5, 150, 105)
  // Maskable: Full bleed background
  // Non-maskable: Rounded squircle or badge
  const bgR = 5, bgG = 150, bgB = 105;
  const radius = isMaskable ? 0 : Math.floor(size * 0.22);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Distance from corners for rounded rectangle
      let inShape = true;
      if (!isMaskable && radius > 0) {
        const dx = Math.max(0, Math.max(radius - x, x - (width - 1 - radius)));
        const dy = Math.max(0, Math.max(radius - y, y - (height - 1 - radius)));
        if (dx * dx + dy * dy > radius * radius) {
          inShape = false;
        }
      }

      if (!inShape) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0; // Transparent
        continue;
      }

      // Inside icon shape
      // Check if pixel is part of "IW" monogram in the center
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = size / 100; // coordinate space -50 to +50

      const relX = (x - centerX) / scale;
      const relY = (y - centerY) / scale;

      let isWhiteText = false;

      // Draw "I"
      // Vertical bar from x=-22 to x=-14, y=-22 to y=22
      // Top bar from x=-26 to x=-10, y=-22 to y=-16
      // Bottom bar from x=-26 to x=-10, y=16 to y=22
      if (
        (relX >= -22 && relX <= -14 && relY >= -22 && relY <= 22) ||
        (relX >= -26 && relX <= -10 && relY >= -22 && relY <= -16) ||
        (relX >= -26 && relX <= -10 && relY >= 16 && relY <= 22)
      ) {
        isWhiteText = true;
      }

      // Draw "W"
      // Left stroke: from x=-2, y=-22 to x=5, y=22
      // Center middle join: from x=5, y=22 to x=12, y=-5
      // Right middle: from x=12, y=-5 to x=19, y=22
      // Right stroke: from x=19, y=22 to x=26, y=-22
      // Simpler thick pixel W:
      if (
        // Left vertical-ish bar
        (relX >= -2 && relX <= 5 && relY >= -22 && relY <= 22 && Math.abs((relX - 1.5) - (relY * 0.15)) <= 3.5) ||
        // Center V
        (relX >= 4 && relX <= 13 && relY >= -6 && relY <= 22 && Math.abs((relX - 8.5) + (relY * 0.25)) <= 3.5) ||
        (relX >= 11 && relX <= 20 && relY >= -6 && relY <= 22 && Math.abs((relX - 15.5) - (relY * 0.25)) <= 3.5) ||
        // Right bar
        (relX >= 19 && relX <= 26 && relY >= -22 && relY <= 22 && Math.abs((relX - 22.5) + (relY * 0.15)) <= 3.5)
      ) {
        isWhiteText = true;
      }

      if (isWhiteText) {
        rawData[pxOffset] = 255;
        rawData[pxOffset + 1] = 255;
        rawData[pxOffset + 2] = 255;
        rawData[pxOffset + 3] = 255;
      } else {
        // Gradient shading on background
        const grad = Math.floor((y / height) * 25);
        rawData[pxOffset] = Math.max(0, bgR - grad / 2);
        rawData[pxOffset + 1] = Math.max(0, bgG - grad);
        rawData[pxOffset + 2] = Math.max(0, bgB - grad / 2);
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter 0
  ihdr[12] = 0; // no interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePNG(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePNG(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePNG(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePNG(180, false));

// Generate SVG icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#059669"/>
  <text x="50" y="62" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="38" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-1">IW</text>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svg);

console.log('Successfully generated all PWA icons in /public:');
console.log(fs.readdirSync(publicDir));
