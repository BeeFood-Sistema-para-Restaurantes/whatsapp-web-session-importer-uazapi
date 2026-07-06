import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// Gera os icones da extensao (16/32/48/128) a partir do master do mascote BeeFood.
// Fonte: assets/icon-master.png (mascote sobre o vermelho de marca #ef3f37).
// Resultado: badge vermelho arredondado com CANTOS TRANSPARENTES (sem fundo branco).
// Rode com: npm run icons

const SRC = "assets/icon-master.png";
const SIZES = [16, 32, 48, 128];
const BRAND_RED = { r: 0xef, g: 0x3f, b: 0x37, alpha: 1 };

await mkdir("icons", { recursive: true });

// Remove a moldura branca ao redor da arte para o vermelho preencher o icone.
const trimmed = await sharp(SRC).trim({ threshold: 10 }).toBuffer();

for (const size of SIZES) {
  const radius = Math.round(size * 0.22);
  const roundedMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/>` +
      `</svg>`
  );

  // Encaixa a arte num quadrado preenchendo o vazio com o vermelho de marca...
  const filled = await sharp(trimmed)
    .resize(size, size, { fit: "contain", background: BRAND_RED })
    .png()
    .toBuffer();

  // ...e recorta os cantos com uma mascara arredondada (fica transparente fora do raio).
  await sharp(filled)
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toFile(`icons/icon-${size}.png`);

  console.log(`icons/icon-${size}.png`);
}
