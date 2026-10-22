// Atualiza o stock (cars.js) e os vendidos (vendidos.js) a partir do que foi lido do site do stand.
//
//   node sincronizar.mjs <stock.json> [vendidos.json]
//
// Os ficheiros de entrada são a lista lida no browser: [[caminho, "textos|separados|por|barras", "id/foto-6.webp,…"], …]
// (pode vir embrulhada no resultado de uma ferramenta: o script procura o primeiro "[[" e o último "]]").
// Mantém tudo o que já existe em cars.js para cada id (showroom, poster, rodas, base, frames, ficha…),
// atualiza preço/km/selos/fotos, junta os carros novos e tira os vendidos.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {ROOT, CDN, lerStock, gravarStock} from './lib.mjs';

const [fStock, fVend] = process.argv.slice(2);
const MES = {Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6, Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12};
const FUEL = {Electrico: 'Elétrico'};
const TITULO = t => t.toLowerCase().replace(/(^|\s)\S/g, s => s.toUpperCase()).replace(/\bIva\b/, 'IVA').replace(/^Cx\b/, 'Caixa');
// imagens genéricas "Brevemente disponível" do site (não são fotos da viatura)
const PLACEHOLDER_MD5 = new Set(['875a5850a188f4cb78dd0d6e33b88326', 'ac1dc50c61d6e6a17f7437dc3b355045']);

function lerLista(f){
  let s = fs.readFileSync(f, 'utf8');
  if (!s.trimStart().startsWith('[[')) {                 // resultado embrulhado: [{"type":"text","text":"\"STOCK[[...]]FIM###\""}]
    try { s = JSON.parse(s)[0].text; } catch {}
    if (s.startsWith('"')) s = JSON.parse(s.slice(0, s.lastIndexOf('"') + 1));
  }
  return JSON.parse(s.slice(s.indexOf('[['), s.lastIndexOf(']]') + 2));
}

// "Vendido|Fev. 2024|Gasolina|-|Abarth|695|Competizione|Sob/Consulta"  /  "...|Aston Martin|DB9 Volante|Touchtronic 2|130|000 €"
function ler([caminho, texto, fotos]){
  const p = texto.split('|');
  const tags = [];
  while (p.length && !/^[A-Z][a-z]{2}\. \d{4}$/.test(p[0])) tags.push(p.shift());
  if (!p.length) return null;                           // linha sem data (cartão incompleto no site)
  const [m, y] = p.shift().split('. ');
  let combustivel = p.shift(), potMota = null;
  if (combustivel === 'potencia') { potMota = p.shift(); combustivel = null; }   // motas
  const km = p.shift();
  let preco = null;
  if (p.at(-1) === 'Sob/Consulta') p.pop();
  else if (/€$/.test(p.at(-1) || '')) { const fim = p.pop(); const ini = /^\d{1,3}$/.test(p.at(-1)) ? p.pop() : ''; preco = +(ini + fim).replace(/\D/g, ''); }
  if (p.at(-1) === 'Viatura') p.pop();
  const [marca, modeloBase, ...versao] = p;
  const id = caminho.split('/').filter(Boolean).pop();
  return {
    id, marca: marca.replace('Mercedes Benz', 'Mercedes-Benz'), modelo: [modeloBase, ...versao].join(' ').replace(/\s+\./g, ' .').trim(),
    ano: +y, mes: MES[m], km: km === '-' ? null : +km.replace(/\D/g, ''), combustivel: FUEL[combustivel] || combustivel, preco,
    vendido: tags.some(t => /^vendido$/i.test(t)), reservado: tags.some(t => /^reservado$/i.test(t)),
    tags: tags.filter(t => !/^(vendido|reservado)$/i.test(t)).map(TITULO),
    fotos: (fotos ? fotos.split(',') : []).filter(Boolean).map(f => CDN + f),
    url: 'https://www.danielpinhoautomoveis.pt' + (caminho.startsWith('/') ? caminho : '/carros/' + caminho),
    ...(potMota ? {mota: true} : {}),
  };
}
const md5 = async url => crypto.createHash('md5').update(Buffer.from(await (await fetch(url)).arrayBuffer())).digest('hex');

// ---------- stock ----------
const antigos = new Map(lerStock().map(c => [c.id, c]));
const lidos = lerLista(fStock).map(ler).filter(Boolean);
const stock = [];
for (const n of lidos.filter(c => !c.vendido)) {
  const a = antigos.get(n.id) || {};
  const c = {...a, ...n};
  for (const k of ['reservado', 'vendido']) if (!c[k]) delete c[k];
  if (!c.tags.length) delete c.tags;
  // fotos de anúncio com só a imagem genérica → "fotografias em breve"
  if (c.fotos.length === 1 && PLACEHOLDER_MD5.has(await md5(c.fotos[0]))) { c.fotos = []; c.sem_fotos = true; } else delete c.sem_fotos;
  if (a.potencia_cv) c.potencia_cv = a.potencia_cv;
  stock.push(c);
}
const novos = stock.filter(c => !antigos.has(c.id)), saidos = [...antigos.keys()].filter(id => !stock.some(c => c.id === id));
gravarStock(stock);
console.log(`stock: ${stock.length} viaturas · novas: ${novos.map(c => c.marca + ' ' + c.modelo).join(', ') || '—'} · saíram: ${saidos.length}`);

// ---------- vendidos ----------
if (fVend) {
  const vend = lerLista(fVend).map(r => ler([r[0], r[1].replace(/\|Viatura$/, ''), r[2]])).filter(Boolean)
    .map(c => ({id: c.id, marca: c.marca, modelo: c.modelo, ano: c.ano, foto: c.fotos[0] || null}));
  const out = path.join(ROOT, 'vendidos.js');
  fs.writeFileSync(out, `/* Viaturas já vendidas pelo stand (lidas do site, /vendidos/). Só para mostrar o historial. */\nwindow.DP_VENDIDOS = [\n${vend.map(v => '  ' + JSON.stringify(v)).join(',\n')}\n];\n`);
  console.log(`vendidos: ${vend.length} → vendidos.js`);
}
