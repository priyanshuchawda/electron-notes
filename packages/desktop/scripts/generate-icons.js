// Script to generate app icons from SVG
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputSvg = path.join(__dirname, '../build/icon.svg');
const outputDir = path.join(__dirname, '../build/icons');

// Sizes needed for different platforms
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

// ICO file sizes (Windows standard)
const icoSizes = [16, 24, 32, 48, 64, 128, 256];

// Create ICO file from PNG buffers
function createIco(pngBuffers) {
  const images = pngBuffers.map(({ buffer, size }) => {
    const bpp = 32; // bits per pixel (RGBA)
    const data = buffer;
    return { size, bpp, data };
  });

  // ICO header: 6 bytes
  // ICO directory entries: 16 bytes each
  // Image data follows
  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = images.length;
  
  let offset = headerSize + (dirEntrySize * numImages);
  const entries = [];
  
  for (const img of images) {
    entries.push({
      width: img.size >= 256 ? 0 : img.size,
      height: img.size >= 256 ? 0 : img.size,
      colorPalette: 0,
      reserved: 0,
      colorPlanes: 1,
      bitsPerPixel: img.bpp,
      size: img.data.length,
      offset: offset
    });
    offset += img.data.length;
  }

  const totalSize = offset;
  const icoBuffer = Buffer.alloc(totalSize);
  let pos = 0;

  // ICO header
  icoBuffer.writeUInt16LE(0, pos); pos += 2; // reserved
  icoBuffer.writeUInt16LE(1, pos); pos += 2; // type (1 = ICO)
  icoBuffer.writeUInt16LE(numImages, pos); pos += 2; // number of images

  // Directory entries
  for (const entry of entries) {
    icoBuffer.writeUInt8(entry.width, pos); pos += 1;
    icoBuffer.writeUInt8(entry.height, pos); pos += 1;
    icoBuffer.writeUInt8(entry.colorPalette, pos); pos += 1;
    icoBuffer.writeUInt8(entry.reserved, pos); pos += 1;
    icoBuffer.writeUInt16LE(entry.colorPlanes, pos); pos += 2;
    icoBuffer.writeUInt16LE(entry.bitsPerPixel, pos); pos += 2;
    icoBuffer.writeUInt32LE(entry.size, pos); pos += 4;
    icoBuffer.writeUInt32LE(entry.offset, pos); pos += 4;
  }

  // Image data
  for (const img of images) {
    img.data.copy(icoBuffer, pos);
    pos += img.data.length;
  }

  return icoBuffer;
}

async function generateIcons() {
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svgBuffer = fs.readFileSync(inputSvg);

  // Generate PNG icons for each size
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `${size}x${size}.png`));
    console.log(`Generated ${size}x${size}.png`);
  }

  // Generate main icon.png (256x256 for electron-builder)
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(path.join(__dirname, '../build/icon.png'));
  console.log('Generated icon.png');

  // Generate icon-256.png
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(path.join(__dirname, '../build/icon-256.png'));

  // Generate ICO file for Windows
  const pngBuffers = [];
  for (const size of icoSizes) {
    const buffer = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push({ buffer, size });
  }

  const icoBuffer = createIco(pngBuffers);
  fs.writeFileSync(path.join(__dirname, '../build/icon.ico'), icoBuffer);
  console.log('Generated icon.ico');
  
  console.log('Icons generated successfully!');
}

generateIcons().catch(console.error);
