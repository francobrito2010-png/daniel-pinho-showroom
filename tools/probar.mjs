// Verificação automática do showroom (Playwright + Chromium sem interface).
//
//   npm run probar
//
// Arranca um servidor local, abre a página a 390, 768 e 1440 px e verifica:
//  · zero erros de consola · sem scroll horizontal · os botões principais não ficam tapados pelos flutuantes
//  · tecla →, swipe com rato, clique numa miniatura · link do WhatsApp com o carro certo
//  · botão "Rodar": pré-carrega, roda sozinho e o arrastar muda de ângulo
//  · tema claro/escuro guardado ao recarregar · carros laterais sem tocar no carro principal
// Capturas em tools/.work/probas/ (também a meio da transição, para ver o desfoque e o ressalto).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(import.meta.dirname, '.work', 'probas');
fs.rmSync(OUT, {recursive: true, force: true}); fs.mkdirSync(OUT, {recursive: true});

// ---------- servidor estático ----------
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css'};
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, p.endsWith('/') ? p + 'index.html' : p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(res);
}).listen(0);
const URL0 = `http://127.0.0.1:${server.address().port}/`;

const resultados = [];
const ok = (nome, passou, detalhe = '') => { resultados.push({nome, passou, detalhe}); console.log(`${passou ? '✔' : '✖'} ${nome}${detalhe ? ' — ' + detalhe : ''}`); };
const espera = ms => new Promise(r => setTimeout(r, ms));

// Edge do Windows (motor Chromium); fora do Windows usa o Chromium do Playwright
const browser = await chromium.launch(process.platform === 'win32' ? {channel: 'msedge'} : {});
async function abrir(w, h, extra = {}){
  const ctx = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1, ...extra});
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('response', r => { if (r.status() >= 400) erros.push(r.status() + ' ' + r.url()); });
  page.on('console', m => { if (m.type() === 'error' && !/cdn\.easysite|fonts\.g/.test(m.text())) erros.push(m.text()); });
  await page.goto(URL0, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.querySelector('#carActive .car-img:not(.car-xf)')?.complete && document.querySelector('#carActive .car-img:not(.car-xf)').naturalWidth > 0);
  await espera(1600);                                     // animação de entrada
  return {ctx, page, erros};
}
const modelo = page => page.locator('#pModelo').textContent();

// ---------- 1. três larguras ----------
for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
  const {ctx, page, erros} = await abrir(w, h);
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  ok(`${w}px: sem scroll horizontal`, sw[0] <= sw[1], `scrollWidth ${sw[0]} / janela ${sw[1]}`);
  // botões principais vs botões flutuantes
  const tapa = await page.evaluate(() => {
    const fab = document.querySelector('.fab').getBoundingClientRect();
    return [...document.querySelectorAll('.ctas .btn')].some(b => { const r = b.getBoundingClientRect(); return r.right > fab.left && r.left < fab.right && r.bottom > fab.top && r.top < fab.bottom; });
  });
  if (w === 390) {
    await page.locator('.ctas').scrollIntoViewIfNeeded(); await espera(300);
    const tapa2 = await page.evaluate(() => {
      const fab = document.querySelector('.fab').getBoundingClientRect();
      return [...document.querySelectorAll('.ctas .btn')].some(b => { const r = b.getBoundingClientRect(); return r.right > fab.left + 1 && r.left < fab.right && r.bottom > fab.top && r.top < fab.bottom; });
    });
    ok(`${w}px: botões "Agendar visita"/"Ver stock" livres dos flutuantes`, !tapa2);
    await page.evaluate(() => scrollTo(0, 0)); await espera(300);
  } else ok(`${w}px: botões principais livres dos flutuantes`, !tapa);
  await page.screenshot({path: path.join(OUT, `${w}-ecra.png`)});
  await page.locator('#stage').screenshot({path: path.join(OUT, `${w}-palco.png`)});
  ok(`${w}px: zero erros de consola`, erros.length === 0, erros.slice(0, 2).join(' | '));
  await ctx.close();
}

// ---------- 2. interações (1440) ----------
{
  const {ctx, page, erros} = await abrir(1440, 900);
  const stage = page.locator('#stage'), box = await stage.boundingBox();

  // tecla → com capturas a meio da transição
  const m0 = await modelo(page);
  await page.keyboard.press('ArrowRight');
  await espera(200); await stage.screenshot({path: path.join(OUT, 'transicao-200ms.png')});
  await espera(250); await stage.screenshot({path: path.join(OUT, 'transicao-450ms.png')});
  await espera(1200);
  const m1 = await modelo(page);
  ok('tecla → muda de carro', m1 !== m0, `${m0} → ${m1}`);

  // swipe com rato
  await page.mouse.move(box.x + box.width * .6, box.y + box.height * .55);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(box.x + box.width * .6 - i * 40, box.y + box.height * .55); await espera(12); }
  await page.mouse.up(); await espera(1600);
  const m2 = await modelo(page);
  ok('swipe com o rato muda de carro', m2 !== m1, `${m1} → ${m2}`);

  // miniatura
  const alvo = await page.evaluate(() => { const c = window.DP_CARS.filter(c => c.showroom && c.imagem).sort((a, b) => a.showroom - b.showroom)[4]; return c.modelo; });
  await page.locator('#thumbs .thumb').nth(4).click(); await espera(1800);
  ok('clique na miniatura salta para esse carro', (await modelo(page)) === alvo, alvo);

  // WhatsApp do carro ativo
  const href = await page.locator('#ctaVisit').getAttribute('href');
  ok('"Agendar visita" leva o carro certo no WhatsApp', href.includes('wa.me/351964619165') && decodeURIComponent(href).includes(alvo), decodeURIComponent(href).slice(0, 110));

  // carros laterais separados do principal
  const sep = await page.evaluate(() => {
    const d = el => { const im = el.querySelector('.car-img'), r = el.getBoundingClientRect(), k = Math.min(r.width / im.naturalWidth, r.height / im.naturalHeight), dw = im.naturalWidth * k; return [r.left + (r.width - dw) / 2, r.right - (r.width - dw) / 2]; };
    const a = d(document.getElementById('carActive')), p = d(document.getElementById('carPrev')), n = d(document.getElementById('carNext'));
    return [Math.round(a[0] - p[1]), Math.round(n[0] - a[1]), Math.round(n[1]), innerWidth];
  });
  ok('carros laterais não tocam no principal', sep[0] > 0 && sep[1] > 0, `folga esq. ${sep[0]} px · dir. ${sep[1]} px`);

  // botão Rodar no SF90 (1.º carro)
  await page.locator('#thumbs .thumb').nth(0).click(); await espera(1800);
  await page.locator('#btn360').click();
  await page.waitForFunction(() => document.getElementById('btn360').getAttribute('aria-pressed') === 'true', null, {timeout: 8000});
  const vistos = new Set();
  for (let t = 0; t < 30; t++) { vistos.add(await page.locator('#carActive .car-img:not(.car-xf)').getAttribute('src')); await espera(80); }
  ok('"Rodar" percorre os ângulos sozinho', vistos.size >= 3, [...vistos].map(s => s.split('/').pop()).join(' → '));
  await espera(800);
  const antes = await page.locator('#carActive .car-img:not(.car-xf)').getAttribute('src');
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .55); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + box.width * .5 - i * 30, box.y + box.height * .55); await espera(15); }
  await page.mouse.up(); await espera(400);
  const depois = await page.locator('#carActive .car-img:not(.car-xf)').getAttribute('src');
  ok('arrastar em modo "Rodar" muda de ângulo', depois !== antes, `${antes.split('/').slice(-2).join('/')} → ${depois.split('/').slice(-2).join('/')}`);
  await stage.screenshot({path: path.join(OUT, 'rodar-arrastado.png')});

  // tema: muda e mantém-se ao recarregar
  const t0 = await page.evaluate(() => document.documentElement.dataset.theme || 'dark');
  await page.locator('#themeBtn').click(); await espera(500);
  await page.reload({waitUntil: 'networkidle'}); await espera(1200);
  const t1 = await page.evaluate(() => document.documentElement.dataset.theme || 'dark');
  ok('tema muda e fica guardado ao recarregar', t0 !== t1, `${t0} → ${t1}`);
  await stage.screenshot({path: path.join(OUT, `1440-palco-${t1}.png`)});
  ok('interações: zero erros de consola', erros.length === 0, erros.slice(0, 2).join(' | '));
  await ctx.close();
}

await browser.close(); server.close();
const falhas = resultados.filter(r => !r.passou);
fs.writeFileSync(path.join(OUT, 'relatorio.json'), JSON.stringify(resultados, null, 2));
console.log(`\n${resultados.length - falhas.length}/${resultados.length} verificações OK · capturas em tools/.work/probas/`);
process.exit(falhas.length ? 1 : 0);
