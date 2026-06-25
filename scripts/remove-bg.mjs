import sharp from 'sharp';
import { readdirSync } from 'fs';
import { join } from 'path';

const ICONS_DIR = './public/icons';
const files = readdirSync(ICONS_DIR).filter(f => f.endsWith('.png'));

async function removeDarkBackground(filePath) {
  const image = sharp(filePath);
  const meta = await image.metadata();
  const { width, height } = meta;

  const { data } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buf = Buffer.from(data);

  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i];
    const g = buf[i + 1];
    const b = buf[i + 2];

    // Piksel parlaklığı
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luminance < 40) {
      // Çok koyu → tamamen şeffaf
      buf[i + 3] = 0;
    } else if (luminance < 90) {
      // Geçiş bölgesi → yarı şeffaf (yumuşak kenar)
      buf[i + 3] = Math.round((luminance - 40) / 50 * 255);
    }
    // Parlak pikseller (altın çizgiler) → dokunma, tam opak
  }

  await sharp(buf, {
    raw: { width: width, height: height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(filePath);
}

console.log(`${files.length} ikon işleniyor...\n`);

for (const file of files) {
  process.stdout.write(`  ${file}... `);
  try {
    await removeDarkBackground(join(ICONS_DIR, file));
    console.log('✓');
  } catch (e) {
    console.log(`✗ ${e.message}`);
  }
}

console.log('\nTamamlandı!');
