# PROMPT — Secciones que faltan en la web Daniel Pinho Automóveis

> Pega este documento en el chat de la IA que vaya a hacer el trabajo. Es la lista de lo que la web actual del stand (danielpinhoautomoveis.pt) tiene y nuestra web premium todavía no. Hay que replicarlo con el estilo de nuestra web, no copiar su diseño.

---

## 0. CONTEXTO (no cambiar)

- **Repositorio:** `francobrito2010-png/daniel-pinho-showroom`. Se publica en GitHub Pages desde `main`: https://francobrito2010-png.github.io/daniel-pinho-showroom/
- **Archivos:**
  - `index.html`: un solo archivo con HTML, CSS y JS vanilla, sin frameworks ni build.
  - `cars.js`: `window.DP_CARS`, el stock.
  - `tools/`: herramientas en Node.
- **Web de referencia:** https://www.danielpinhoautomoveis.pt/ (sus datos se leen del DOM; su API pide token).
- **Idioma de la web:** portugués de Portugal. **Idioma conmigo:** español, respuestas cortas, con capturas.
- **Estilo que hay que respetar:**
  - Tema claro blanco y verde por defecto: `--brand #19644D`, `--accent #81C995`.
  - Tipografía Outfit (Michroma solo en el póster), botones en píldora y tarjetas con borde fino.
  - Todo color sale de las variables CSS, para que funcione también en tema oscuro.
- **Lo que ya existe y NO se toca:**
  - El showroom estilo póster de la portada: banda del color de la marca, nombre gigante, bocetos y botón "Rodar".
  - El stock en tarjetas con 3 fotos (carrusel con flechas, puntos y deslizar), filtro por marca en chips y "Ver mais viaturas".
  - El WhatsApp con 3 vendedores, Serviços, O stand, el contacto con formulario a WhatsApp, y el tema claro/oscuro.
- **Reglas:**
  - No inventar datos: lo que no venga de su web se marca para confirmar.
  - No añadir los 669 vendidos.
  - Comprobar cada cambio con `cd tools && npm run probar` (Playwright con Edge, a 390, 768 y 1440 px: sin errores de consola y sin scroll horizontal) y mirar las capturas antes de publicar.
  - Commit y push a `main`. Añadir comprobaciones nuevas a `tools/probar.mjs` para cada función nueva.

---

## 1. "QUE VIATURA PROCURA?" — buscador (encima del stock)

Como el bloque de su portada: **MARCA → MODELO** y el botón **PESQUISA DETALHADA**.

- **Marca** (desplegable): "Selecionar" + las marcas del stock, con el número entre paréntesis.
- **Modelo** (desplegable): desactivado hasta elegir marca. Lista los modelos de esa marca: la primera palabra de `modelo` agrupa, por ejemplo "992", "Cayenne", "SL 43 AMG".
- **Contador en vivo** al lado ("**12** viaturas"), como el "93" de su web.
- **Pesquisa detalhada**: un panel que se despliega con suavidad, con:
  - Combustível (Gasolina, Gasóleo, Híbrido, Elétrico).
  - Preço até (25 000, 50 000, 100 000, 200 000 €, Sem limite).
  - Ano desde.
  - Quilómetros até.
  - Caixa (Automática, Manual).
  - Botón **Limpar**.
- **Comportamiento:**
  - El buscador filtra la misma cuadrícula del stock y se combina con los chips de marca: elegir marca en el desplegable marca también el chip.
  - Los filtros se guardan en la URL (`?marca=Porsche&modelo=992`), así se puede compartir una búsqueda.
- **En móvil:** los dos desplegables en una fila y la pesquisa detalhada debajo, a ancho completo.

## 2. "ORDENAR POR" — completo, como el suyo

El desplegable de orden debe tener exactamente sus opciones:
- Marca: A a Z
- Marca: Z a A
- Preço mais baixo
- Preço mais alto
- Mais novos (por ano)
- Mais antigos (por ano)
- Mais recentes (últimas entradas, por id descendente)
- Atualizações recentes

Mantén "Destaques" como opción por defecto.

## 3. "ÚLTIMAS ENTRADAS — OS MAIS RECENTES"

- Una franja horizontal antes del stock con las **8–10 viaturas más recientes** (id más alto).
- Cada una con su foto, marca y modelo, igual que su bloque "Últimas entradas".
- **Desplazamiento:** deslizar en móvil y flechas en escritorio.
- Al tocar una, se abre la **ficha** (sección 5).

## 4. Estados "VENDIDO" y "RESERVADO" en las tarjetas

- En su listado algunas viaturas salen con la etiqueta **VENDIDO** o **RESERVADO**.
- Nuestro `cars.js` ya tiene `reservado: true`. Añadir soporte para `vendido: true`:
  - Una cinta diagonal o etiqueta clara "Vendido" sobre la foto.
  - La foto en gris suave.
  - El precio sustituido por "Vendido".
  - El botón de WhatsApp cambia a "Procuro uma igual".
- Las vendidas van al final de la lista. **No** se añade el historial de 669 vendidos: solo las que aparecen en su listado actual con esa etiqueta.

## 5. FICHA DE LA VIATURA — al tocar un coche

Al tocar la foto o el nombre de cualquier coche (stock, últimas entradas o "também vai gostar") se abre la ficha. Debe sentirse como **otra página dedicada al coche**:
- **A pantalla completa**: `<dialog>` o vista propia.
- **Con URL propia** (`#viatura-1722938`): el botón "atrás" del móvil la cierra y el enlace se puede compartir.
- Se vuelve al inicio con la cruz, con "atrás" o con el **menú** de la cabecera, que sigue visible.

**Contenido, de arriba abajo (como su página de carro):**

1. **Galería grande**:
   - La foto principal ocupa el ancho; se pasa con deslizar, flechas y teclado.
   - Miniaturas debajo y contador "1 / 47 Fotos".
   - Al tocar la foto, galería a pantalla completa con zoom.
   - Fotos: variante `-0` (2100 px) para la grande y `-6` para las miniaturas (`https://cdn.easysite.pt/pub/15144/<id>/<foto>`). Hasta 14 en la página; si tiene más, un enlace "Ver todas no anúncio original".
2. **Cabecera**: marca, modelo, **Registo** (Jan. 2021), **Preço** grande, etiquetas (Porsche Approved, Nacional, IVA dedutível…) y los botones:
   - **LIGAR**: llama al móvil del stand.
   - **MAIS INFO**: abre WhatsApp con el coche ya escrito.
   - **Partilhar**: Web Share API o copiar enlace.
   - **Ver no showroom**: solo si el coche está en el póster.
3. **Características**, en una tabla de 2 columnas con estos campos, en este orden:
   Registo · Quilómetros · Lugares · Segmento · Combustível · Potência · Cilindrada · Transmissão · Cor · Portas · Estado · Garantia · Tipo de Bateria (si hay) · Cor Interior · Portagem · 2ª Chave.
   Botón "**Ver mais características**" que despliega el resto.
4. **Observações**: el texto del vendedor (plan de mantenimiento, garantía, histórico, "viatura nacional"…), con "Ver mais".
   - Quitar las líneas de rutina: "Visite o nosso site", el teléfono y "Este anúncio foi publicado por rotina informática…".
   - Mantener el aviso "*todos os dados carecem de confirmação junto do vendedor*" en letra pequeña.
5. **Criar PDF / Imprimir**: una hoja de impresión limpia con `@media print` (logo, fotos, características, precio, contacto).
6. **"Também vai gostar destes!"**: 3–6 coches parecidos (misma marca o precio ±30 %) en una franja, que abren su propia ficha.

**De dónde salen los datos de la ficha:**
- Ya hay un lector hecho. `tools/.work/ficha.js` lee cada página de coche y devuelve las características, las observaciones, el número de fotos y la lista de fotos `-0`.
- `tools/fichas.mjs <fichas.json>` las une a `cars.js` como `ficha` (pares `[rótulo, valor]`), `obs`, `galeria` y `total_fotos`.
- Para leer las 87 páginas: navegador integrado, guardando en `localStorage` del dominio del stand en lotes de 12 (ver cómo se hizo en el historial).
- Las fichas leídas el 15/10/2026 están en `tools/.work/fichas.json`. Si el stock cambió, vuelve a leerlas.

## 6. "ONDE ESTAMOS? VISITE-NOS!" — mapa de Google

- Antes del pie, un bloque con el **mapa de Google Maps embebido** (iframe `https://www.google.com/maps?q=Rua+Capit%C3%A3o+Ramires+14,+1000-085+Lisboa&output=embed`).
  - Bordes redondeados y en gris suave en tema claro, con filtro CSS.
  - Carga diferida: `loading="lazy"`.
- **Junto al mapa:**
  - La dirección (Rua Capitão Ramires nº14 A-C, 1000-085 Lisboa).
  - El estado "**Aberto / Fechado agora**", calculado con el horario: 09:00–13:00 y 14:30–19:00 (**confirmar los días con el cliente**).
  - Un botón "**Obter direções**" que abre `https://maps.app.goo.gl/T4DMG3MT79e88D1v6`.
- Los teléfonos llevan debajo su nota legal: "(Chamada para a rede fixa nacional)" o "(… rede móvel nacional)".

## 7. "PRECISA DE AJUDA? NÓS LIGAMOS!"

- Una caja pequeña en Contacto con nombre y teléfono y el botón **Ligue-me**, más la casilla "Li e aceito os Termos de Utilização e Proteção de Dados" (obligatoria).
- Como no hay servidor, al enviar abre WhatsApp al vendedor principal con "Olá! Sou [nome]. Podem ligar-me para o [telefone]?".

## 8. NOTÍCIAS

- Una sección o página "**Notícias**" con las entradas de su web, sacadas de https://www.danielpinhoautomoveis.pt/noticias/: título, fecha y, si la tienen, la foto de portada (leerla de su página).
- Lista actual (más reciente primero):
  - Estoril Classics 2024 (5 out 2024)
  - Porsche Club GT (27 jun 2024)
  - Automobilia de Aveiro 30ª Edição (24 mai 2024)
  - Portugal GT Tour 2024 (14 mai 2024)
  - 49th International Porsche 356 Meeting (10 mai 2024)
  - Passeio dos Alemães 2024 (16 mar 2024)
  - Motor Clássico Salão 2024 (20 fev 2024)
  - Salon Retro Mobile 2024 (31 jan 2024)
  - Estoril Classics 2023 (4 out 2023)
  - Leiria sobre rodas (30 set 2023)
  - Algarve Classic Cars 2023 (13 jul 2023)
  - Redbull Show Race (25 jun 2023)
  - Motor Clássico 2023 (3 mar 2023)
  - autoClássico 2022 (30 set 2022)
  - Caramulo Motor Festival (2 set 2022)
  - Estoril Classics 2022 (25 ago 2022)
  - Altice Algarve Classic Cars 2022 (8 jul 2022)
  - Portugal GT Tour 2022 (13 mai 2022)
  - Techno Classica Essen 2022 (21 mar 2022)
  - Retro Mobile 2022 (16 mar 2022)
  - Passeio dos ingleses (ACP Clássicos) (4 fev 2022)
- **Formato:** tarjetas en cuadrícula, las 6 primeras visibles y "Ver mais".
- Si una noticia tiene texto y fotos en su página, abrirla en una vista propia. Si no, que la tarjeta enlace a la noticia original.
- Añadir "Notícias" al menú.

## 9. Menú y pie como el suyo

- **Menú:** Showroom · Viaturas · Pesquisar · Serviços · Notícias · Contactos.
  - **Viaturas** lleva al stock.
  - **Pesquisar** lleva al buscador y abre la pesquisa detalhada.
- **Pie de página:**
  - Política de Privacidade · Política de Cookies · Termos e Condições, enlazados a sus páginas: `/politica-de-privacidade/`, `/politica-de-cookies/`, `/termos-condicoes/`.
  - Livro de Reclamações.
  - NIF 516555901 y © año.
- **Aviso de cookies discreto**, con "Aceitar" guardado en `localStorage` (dentro de `try/catch`). Como no usamos cookies propias, dejarlo solo si el cliente lo pide; si no, omitirlo y anotarlo.

---

## 10. ORDEN DE TRABAJO

1. Ficha de la viatura (5): es la base de "Últimas entradas" y de "Também vai gostar". Primero lee las fichas y únelas con `tools/fichas.mjs`.
2. Buscador "Que viatura procura?" + Ordenar completo (1, 2).
3. Últimas entradas (3) y estados Vendido/Reservado (4).
4. Mapa + horario + Nós ligamos (6, 7).
5. Notícias (8) y menú/pie (9).
6. Después de cada paso: `npm run probar` en verde, capturas a 390 y 1440 px, commit y push, y comprobar la URL publicada.

**Entrega:** enlace, capturas de móvil y escritorio de cada sección nueva y la lista de lo que hay que confirmar con el cliente (días del horario, fotos de las noticias, aviso de cookies).
