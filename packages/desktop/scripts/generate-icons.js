// Script to generate app icons from SVG
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputSvg = path.join(__dirname, '../build/icon.svg');
const outputDir = path.join(__dirname, '../build/icons');

// Sizes needed for different platforms
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

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

  // Generate icon.ico for Windows (256x256 is sufficient, electron-builder handles it)
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(path.join(__dirname, '../build/icon-256.png'));
  
  console.log('Icons generated successfully!');
}

generateIcons().catch(console.error);
