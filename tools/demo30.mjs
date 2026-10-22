// Versão de demonstração: 30 viaturas = as 12 do showroom + 18 escolhidas (16 em stock + 2 vendidas reais).
//
//   node demo30.mjs <stock-lido.json> <fichas.json>
//
// Guarda só essas viaturas em cars.js (mantém showroom/poster/rodas/etc.), junta a ficha completa
// e acrescenta as vendidas (marcadas "vendido": true) a partir da lista lida do site.
import fs from 'node:fs';
import {CDN, lerStock, gravarStock} from './lib.mjs';

const [fStock, fFichas] = process.argv.slice(2);
export const ESCOLHA = [
  '1651865', '1709495', '1715152', '1364107', '1626070', '1726224', '1535703', '1726139',   // Ferrari FF, Mondial, Roma · Porsche 356, S/T, Turbo S Cabrio, 997 GT3 RS, Ferrari 812 Superfast
  '1587901', '1661656', '1597901', '1310745', '1655800', '1646886', '1679485', '1385450',   // 996 GT3 CS · 300 SE 1964 · G 450 · SL 63 · AMG GT S · R8 manual · DB9 Volante · Land Cruiser BJ40
];
const VENDIDAS = ['1713027', '1713438'];                                                       // Porsche 992 Carrera GTS · Taycan Sport Turismo

const MES = {Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6, Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12};
function lerLista(f){
  let s = fs.readFileSync(f, 'utf8');
  if (!s.trimStart().startsWith('[[')) { try { s = JSON.parse(s)[0].text; } catch {} if (s.startsWith('"')) s = JSON.parse(s.slice(0, s.lastIndexOf('"') + 1)); }
  return JSON.parse(s.slice(s.indexOf('[['), s.lastIndexOf(']]') + 2));
}

const antigos = lerStock();
const fichas = JSON.parse(fs.readFileSync(fFichas, 'utf8'));
const stock = antigos.filter(c => c.showroom || ESCOLHA.includes(c.id));
for (const [caminho, texto, fotos] of lerLista(fStock)) {
  const id = caminho.split('/').filter(Boolean).pop();
  if (!VENDIDAS.includes(id)) continue;
  const p = texto.split('|').filter(t => !/^vendido$/i.test(t));
  const [m, y] = p.shift().split('. ');
  const combustivel = p.shift().replace('Electrico', 'Elétrico'), km = p.shift();
  if (p.at(-1) === 'Sob/Consulta') p.pop();
  const [marca, ...modelo] = p;
  stock.push({id, marca, modelo: modelo.join(' ').replace(/\s+\./g, ' .'), ano: +y, mes: MES[m], km: km === '-' ? null : +km.replace(/\D/g, ''),
    combustivel, preco: null, vendido: true, fotos: fotos.split(',').filter(Boolean).map(f => CDN + f), url: 'https://www.danielpinhoautomoveis.pt' + caminho});
}
for (const car of stock) {
  const f = fichas[car.id];
  if (!f || !f.c.length) continue;
  const pares = [];
  for (let i = 0; i + 1 < f.c.length; i += 2) if (!['Stand', 'Matrícula'].includes(f.c[i])) pares.push([f.c[i], f.c[i + 1]]);
  car.ficha = pares;
  const obs = f.o.split('\n').map(s => s.trim()).filter(s => !/^(Visite o nosso site|\+351|\* Este anúncio foi publicado|Aceitamos retomas$)/i.test(s)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (obs) car.obs = obs;
  if (f.f.length) car.galeria = f.f;
  car.total_fotos = f.n;
  const cv = parseInt((pares.find(p => p[0] === 'Potência') || [])[1]);
  if (!car.potencia_cv && cv > 0) car.potencia_cv = cv;
}
gravarStock(stock);
console.log(`${stock.length} viaturas: ${stock.filter(c => c.showroom).length} showroom · ${stock.filter(c => !c.showroom && !c.vendido).length} stock · ${stock.filter(c => c.vendido).length} vendidas · ${stock.filter(c => c.ficha).length} com ficha`);
