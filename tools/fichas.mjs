// Junta a ficha completa de cada viatura (lida das páginas do site) a cars.js.
//
//   node fichas.mjs <fichas.json>
//
// fichas.json: { "<id>": { c: ["Registo","Jan. 2021","Quilómetros","6800",…], o: "observações", n: 47, f: ["API_…-0.webp",…] } }
// Grava em cada carro: ficha (pares [rótulo, valor]), obs (observações sem as linhas de rotina), galeria (até 14 fotos
// grandes, nomes -0) e total_fotos; preenche potencia_cv e caixa quando ainda não existem.
import fs from 'node:fs';
import {lerStock, gravarStock} from './lib.mjs';

const fichas = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const FORA = new Set(['Stand', 'Matrícula']);
const ROTINA = /^(Visite o nosso site|\+351|\* Este anúncio foi publicado|Aceitamos retomas$)/i;
const stock = lerStock();
let n = 0;
for (const car of stock) {
  const f = fichas[car.id];
  if (!f || !f.c.length) continue;
  const pares = [];
  for (let i = 0; i + 1 < f.c.length; i += 2) if (!FORA.has(f.c[i])) pares.push([f.c[i], f.c[i + 1]]);
  car.ficha = pares;
  const obs = f.o.split('\n').map(s => s.trim()).filter(s => !ROTINA.test(s)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (obs) car.obs = obs; else delete car.obs;
  if (f.f.length) car.galeria = f.f;
  car.total_fotos = f.n;
  const val = k => (pares.find(p => p[0] === k) || [])[1];
  const cv = parseInt(val('Potência'));
  if (!car.potencia_cv && cv > 0) car.potencia_cv = cv;
  if (!car.caixa && val('Transmissão')) car.caixa = /manual/i.test(val('Transmissão')) ? 'Manual' : 'Automática';
  n++;
}
gravarStock(stock);
console.log(`${n}/${stock.length} viaturas com ficha completa`);
