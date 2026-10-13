# Showroom Virtual — v2.0 (stock real)

Versão premium do site do stand **Daniel Pinho Automóveis** (Lisboa), com um showroom tipo "seleção de carro" de videojogo.
Um único `index.html` (HTML + CSS + JS vanilla), sem build, pronto para GitHub Pages.

```
daniel-pinho-showroom/
├── index.html   ← tudo (cena, swipe, transição, painel, stock, serviços, contacto)
├── cars.js      ← stock real (window.DP_CARS) — funciona também ao abrir em file://
├── cars/        ← recortes sem fundo (WebP transparente) dos carros do showroom
└── assets/      ← foto da fachada do stand
```

## De onde vêm os dados

Tudo foi lido do site atual, [danielpinhoautomoveis.pt](https://www.danielpinhoautomoveis.pt/), a 13/10/2026:

- **Contacto** (objeto `STAND` no início do `<script>`): fixo 210 548 083, telemóveis 964 619 165 (WhatsApp) · 924 694 380 · 926 902 755, geral@danielpinhoautomoveis.pt, Rua Capitão Ramires nº14 A-C, 1000-085 Lisboa, horário 09:00–13:00 · 14:30–19:00, Facebook, Instagram, equipa comercial (Daniel Pinho, Nelson Costa, João Maciel), NIF 516555901.
- **Stock** (`cars.js`): as 84 viaturas disponíveis (as vendidas ficam de fora), com preço, ano, km, combustível, selos do site (Porsche Approved, Nacional…), "Reservado" e as 5 primeiras fotos de cada uma. As fotos são carregadas do CDN do site atual (`cdn.easysite.pt`).
- **Showroom 3D**: 12 viaturas com `"showroom": n` (ordem no palco) e `"imagem"` recortada. Estas têm também a ficha técnica (cv, caixa, cor, interior), lida da página de cada carro.
- **Em destaque**: a viatura com `"destaque": true` (agora o Ferrari SF90 Stradale).

Viaturas com `"sem_fotos": true` só tinham no site a imagem genérica "Brevemente disponível". Mostram um cartão "Fotografias em breve" e vão para o fim da lista.

## ⚠️ A confirmar com o cliente

- **Textos dos serviços** (Intermediação de crédito, Compramos o seu carro, Consultadoria, Oficina): os serviços são os do site, mas o site não tem texto. Os textos são nossos.
- **Texto "O stand"**: escrito por nós a partir do stock (garantia, Approved, equipa).
- **Horário**: o site só mostra "Hoje 09:00–13:00 e 14:30–19:00", sem os dias da semana.
- **Fotos**: vêm do CDN do site atual. Se o cliente mudar de plataforma, é preciso copiá-las para o repositório.

## Cores e estilo

Tirados do site do stand:
- `--brand: #19644D`: o verde da marca, usado em botões, chips e selos.
- `--accent: #81C995`: o verde-claro de apoio, para texto, ícones e linhas finas sobre o escuro.
- Tipografia **Outfit**, formas em pílula, logótipo em moldura fina.

**Tema claro / escuro:** botão sol/lua no cabeçalho. O padrão é o escuro (showroom). O claro é branco e verde, como o site atual. A escolha fica guardada no navegador do visitante.

## Como pôr mais carros no showroom

1. **Foto**: as fotos do stand já são todas iguais (3/4 frente, à porta do stand). Serve a primeira foto do anúncio.
2. **Remover o fundo**: com [remove.bg](https://www.remove.bg), no iPhone (manter o dedo sobre o carro → "Copiar") ou no Photoshop (*Selecionar assunto*). Rever o teto e os vidros, onde às vezes fica um pedaço da fachada.
3. **Recortar e exportar**: recortar rente ao carro e exportar em **WebP transparente**. Guardar em `cars/`.
4. **Em `cars.js`**: na viatura, acrescentar `"showroom": 13, "imagem": "cars/nome.webp", "potencia_cv": …, "caixa": "Automática", "cor_nome": "…", "interior": "…"`.

A imagem assenta pela base (rodas) na plataforma, por isso o recorte rente em baixo é o que garante que todos os carros "pousam" à mesma altura.

As fotos do CDN têm ~800 px de largura. Os recortes ficam com ~600 px e, num ecrã grande, aparecem um pouco ampliados. Para máxima nitidez, pedir ao stand as fotos originais.

## Vista 360°

Se um carro tiver `"frames": ["cars/…/1.webp", …]` (várias imagens à volta do carro, com o mesmo enquadramento), o botão **360°** fica ativo e arrastar sobre o carro roda-o. Agora só o Aston Martin Vantage Roadster tem frames (6 ângulos). Nos outros, o botão mostra "Em breve".

## Publicar no GitHub Pages

Settings → Pages → Deploy from branch → escolher o branch e a pasta raiz. O showroom fica em `https://francobrito2010-png.github.io/daniel-pinho-showroom/`.

Para testar localmente: `npx http-server` (ou `python3 -m http.server`) na raiz do repositório.
