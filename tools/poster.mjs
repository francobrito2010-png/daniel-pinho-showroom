// Showroom em estilo poster: esboços a lápiz + ficha de cada carro.
//
//   npm run poster              (todos os carros de poster-dados.json)
//   npm run poster -- 1722938   (só um carro)
//
// Para cada carro: gera cars/esbocos/<nome>-l.webp e -r.webp (traço de lápiz cinzento sobre transparente,
// a partir dos recortes do próprio carro) e grava "poster" em cars.js com cores da marca, lema, cifras e ícones.
// Esboço da esquerda = vista de frente (ou metade da frente da foto principal); da direita = 3/4 do outro lado.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {ROOT, WORK, lerStock, gravarStock, die, folha} from './lib.mjs';

const dados = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'poster-dados.json'), 'utf8'));
const ids = process.argv.slice(2).filter(a => !a.startsWith('--'));
const alvo = ids.length ? ids : Object.keys(dados).filter(k => !k.startsWith('_'));
const OUT = path.join(ROOT, 'cars', 'esbocos');
fs.mkdirSync(OUT, {recursive: true});

// ---------- efeito lápiz (color dodge + um pouco de contorno) ----------
async function esboco(src, out, recorte = null){
  let img = sharp(path.join(ROOT, src)).ensureAlpha();
  if (recorte) {
    const m = await sharp(path.join(ROOT, src)).metadata();
    const w = Math.round(m.width * recorte[1]), left = Math.round(m.width * recorte[0]);
    img = sharp(await img.extract({left, top: 0, width: w, height: m.height}).png().toBuffer());
  }
  img = sharp(await img.resize({width: 900, withoutEnlargement: true}).png().toBuffer());
  const {data, info} = await img.raw().toBuffer({resolveWithObject: true});
  const {width: w, height: h} = info, N = w * h;
  const gray = Buffer.alloc(N), alpha = Buffer.alloc(N);
  for (let i = 0; i < N; i++) {
    gray[i] = Math.round(.299 * data[i * 4] + .587 * data[i * 4 + 1] + .114 * data[i * 4 + 2]);
    alpha[i] = data[i * 4 + 3];
  }
  const raw1 = {raw: {width: w, height: h, channels: 1}};
  const inv = Buffer.from(gray.map(v => 255 - v));
  const blurInv = await sharp(inv, raw1).blur(9).toColourspace('b-w').extractChannel(0).raw().toBuffer();
  const kx = {width: 3, height: 3, kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1]}, ky = {width: 3, height: 3, kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1]};
  const gx = await sharp(gray, raw1).convolve(kx).toColourspace('b-w').extractChannel(0).raw().toBuffer();
  const gy = await sharp(gray, raw1).convolve(ky).toColourspace('b-w').extractChannel(0).raw().toBuffer();
  const linha = Buffer.alloc(N);
  for (let i = 0; i < N; i++) {
    const dodge = Math.min(255, gray[i] * 255 / Math.max(1, 255 - blurInv[i]));
    linha[i] = Math.min(255, (255 - dodge) * 1.9 + Math.min(255, gx[i] + gy[i]) * .12);
  }
  const suave = await sharp(linha, raw1).blur(.6).toColourspace('b-w').extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(N * 4);
  for (let y = 0; y < h; y++) {
    const fade = y > h * .62 ? Math.max(0, 1 - (y - h * .62) / (h * .38)) : 1;   // desvanece o terço de baixo
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 0x28;
      rgba[i * 4 + 3] = Math.round(Math.min(suave[i] * .62, 150) * alpha[i] / 255 * fade);
    }
  }
  await sharp(rgba, {raw: {width: w, height: h, channels: 4}}).webp({quality: 80, alphaQuality: 80}).toFile(path.join(ROOT, out));
  return path.join(ROOT, out);
}

const stock = lerStock();
const feitos = [];
for (const id of alvo) {
  const car = stock.find(c => c.id === id) || die(`id ${id} não existe em cars.js`);
  const d = dados[id] || die(`id ${id} sem ficha em poster-dados.json`);
  const marca = dados._marcas[car.marca] || die(`marca ${car.marca} sem cores em poster-dados.json → _marcas`);
  const slug = path.basename(car.imagem, '.webp');
  const fr = [...new Set(car.frames || [])];
  // esboços: com rotação → frente (1) e 3/4 do outro lado (2); sem rotação → metades da foto principal
  const [srcL, cL] = fr.length >= 3 ? [fr[1], null] : [car.imagem, [0, .62]];
  const [srcR, cR] = fr.length >= 3 ? [fr[2], null] : [car.imagem, [.38, .62]];
  const esbocoL = `cars/esbocos/${slug}-l.webp`, esbocoR = `cars/esbocos/${slug}-r.webp`;
  feitos.push(await esboco(srcL, esbocoL, cL), await esboco(srcR, esbocoR, cR));
  car.poster = {
    titulo: marca.titulo || car.marca.toUpperCase(),
    cidade: marca.cidade, bandeira: marca.bandeira,
    cor: marca.cor, cor2: marca.cor2,
    modelo: d.modelo, cursiva: d.cursiva || null,
    lema: d.lema, eslogan: d.eslogan, icones: d.icones,
    stats: [
      {l: 'Potência', v: car.potencia_cv, u: 'cv'},
      {l: 'Velocidade máx.', v: d.vmax, u: 'km/h', confirmar: true},
      {l: '0-100 km/h', v: d.zero100, u: 's', d: 1, confirmar: true},
    ],
    rodape: `${marca.rodape || car.marca}<br>desde ${marca.desde}`,
    esbocoL, esbocoR,
  };
  console.log(`✔ ${car.marca} ${car.modelo}: esboços + ficha`);
}
gravarStock(stock);
await folha(feitos, path.join(WORK, 'esbocos.png'), 4);
console.log('cars.js atualizado');
