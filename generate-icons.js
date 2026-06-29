/**
 * Generate Android + iOS app launcher icons from a single square PNG.
 * Usage:  node generate-icons.js [path-to-source.png]   (default: logo_source.png)
 *
 * Run once after saving the logo; the resized files are written into the
 * android/ and ios/ asset folders. Uses jimp (pure JS, no native build).
 */
const path = require('path');
const fs = require('fs');
const { Jimp } = require('jimp');

const SRC = process.argv[2] || 'logo_source.png';

const ANDROID = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];

const IOS_DIR = path.join('ios', 'InvoiceApp', 'Images.xcassets', 'AppIcon.appiconset');
// size px -> filename
const IOS = [
  [40, 'icon-40.png'],
  [60, 'icon-60.png'],
  [58, 'icon-58.png'],
  [87, 'icon-87.png'],
  [80, 'icon-80.png'],
  [120, 'icon-120.png'],
  [180, 'icon-180.png'],
  [1024, 'icon-1024.png'],
];

const IOS_CONTENTS = {
  images: [
    { idiom: 'iphone', scale: '2x', size: '20x20', filename: 'icon-40.png' },
    { idiom: 'iphone', scale: '3x', size: '20x20', filename: 'icon-60.png' },
    { idiom: 'iphone', scale: '2x', size: '29x29', filename: 'icon-58.png' },
    { idiom: 'iphone', scale: '3x', size: '29x29', filename: 'icon-87.png' },
    { idiom: 'iphone', scale: '2x', size: '40x40', filename: 'icon-80.png' },
    { idiom: 'iphone', scale: '3x', size: '40x40', filename: 'icon-120.png' },
    { idiom: 'iphone', scale: '2x', size: '60x60', filename: 'icon-120.png' },
    { idiom: 'iphone', scale: '3x', size: '60x60', filename: 'icon-180.png' },
    { idiom: 'ios-marketing', scale: '1x', size: '1024x1024', filename: 'icon-1024.png' },
  ],
  info: { author: 'xcode', version: 1 },
};

async function resizeTo(src, size, outPath) {
  const img = await Jimp.read(src);
  img.resize({ w: size, h: size });
  await img.write(outPath);
  console.log('  wrote', outPath, `(${size}x${size})`);
}

(async () => {
  if (!fs.existsSync(SRC)) {
    console.error(`\nSource image not found: ${SRC}\nSave the logo PNG there (or pass a path) and re-run.\n`);
    process.exit(1);
  }

  console.log('Android icons:');
  for (const [dir, size] of ANDROID) {
    const base = path.join('android', 'app', 'src', 'main', 'res', dir);
    await resizeTo(SRC, size, path.join(base, 'ic_launcher.png'));
    await resizeTo(SRC, size, path.join(base, 'ic_launcher_round.png'));
  }

  console.log('iOS icons:');
  if (!fs.existsSync(IOS_DIR)) fs.mkdirSync(IOS_DIR, { recursive: true });
  for (const [size, name] of IOS) {
    await resizeTo(SRC, size, path.join(IOS_DIR, name));
  }
  fs.writeFileSync(
    path.join(IOS_DIR, 'Contents.json'),
    JSON.stringify(IOS_CONTENTS, null, 2),
  );
  console.log('  wrote', path.join(IOS_DIR, 'Contents.json'));

  console.log('\nDone. Rebuild the app to see the new icon.');
})();
