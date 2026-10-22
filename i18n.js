/* Idiomas da página: PT (original), ES e EN.
   O texto é escrito em português no HTML/JS; aqui traduz-se por dicionário (frases exatas) e por algumas regras
   (contagens, datas, linhas "ano · km · combustível"). Nomes de carros, marcas e lemas dos pósteres não se traduzem.
   Um MutationObserver traduz também o que a página gera depois (stock, ficha, leitor de Reels…). */
(function(){
  // pt: [es, en]
  const D = {
    'Showroom': ['Showroom', 'Showroom'], 'Viaturas': ['Vehículos', 'Cars'], 'Serviços': ['Servicios', 'Services'], 'Eventos': ['Eventos', 'Events'],
    'O stand': ['El concesionario', 'The dealership'], 'Contacto': ['Contacto', 'Contact'], 'Agendar visita': ['Agendar visita', 'Book a visit'],
    'Rodar': ['Girar', 'Rotate'], 'Velocidade máx.': ['Velocidad máx.', 'Top speed'], 'Preço': ['Precio', 'Price'],
    'Ver todo o stock': ['Ver todo el stock', 'See all stock'],
    '* Velocidade máxima e 0-100 km/h: dados de fábrica do modelo.': ['* Velocidad máxima y 0-100 km/h: datos de fábrica del modelo.', '* Top speed and 0-100 km/h: manufacturer figures for the model.'],
    'Esboços a partir de fotografias do Wikimedia Commons:': ['Bocetos a partir de fotografías de Wikimedia Commons:', 'Sketches based on photos from Wikimedia Commons:'],
    'Últimas entradas': ['Últimas entradas', 'Latest arrivals'], 'Os mais recentes': ['Los más recientes', 'Just arrived'],
    'As viaturas que entraram mais recentemente no stand. Toque para ver a ficha completa.': ['Los vehículos que han llegado más recientemente. Toque para ver la ficha completa.', 'The most recent arrivals at the dealership. Tap to see the full details.'],
    'Em movimento': ['En movimiento', 'In motion'],
    'As nossas viaturas em vídeo. Toque para ver com som; deslize para o seguinte.': ['Nuestros vehículos en vídeo. Toque para verlos con sonido; deslice para el siguiente.', 'Our cars on video. Tap to watch with sound; swipe for the next one.'],
    'Mais vídeos': ['Más vídeos', 'More videos'], 'no Instagram': ['en Instagram', 'on Instagram'],
    'Viaturas disponíveis': ['Vehículos disponibles', 'Available cars'],
    'Mais viaturas do nosso stand em Lisboa, além das do showroom. Toque numa viatura para ver a galeria e a ficha completa.': ['Más vehículos de nuestro concesionario en Lisboa, además de los del showroom. Toque un vehículo para ver la galería y la ficha completa.', 'More cars from our Lisbon dealership, beyond those in the showroom. Tap a car to see the gallery and full details.'],
    'Que viatura procura?': ['¿Qué vehículo busca?', 'What car are you looking for?'], 'Marca': ['Marca', 'Make'], 'Selecionar': ['Seleccionar', 'Select'],
    'Modelo': ['Modelo', 'Model'], 'Ordenar por': ['Ordenar por', 'Sort by'], 'Destaques': ['Destacados', 'Featured'],
    'Marca: A a Z': ['Marca: A a Z', 'Make: A to Z'], 'Marca: Z a A': ['Marca: Z a A', 'Make: Z to A'], 'Preço mais baixo': ['Precio más bajo', 'Lowest price'],
    'Preço mais alto': ['Precio más alto', 'Highest price'], 'Mais novos (por ano)': ['Más nuevos (por año)', 'Newest (by year)'],
    'Mais antigos (por ano)': ['Más antiguos (por año)', 'Oldest (by year)'], 'Mais recentes': ['Más recientes', 'Most recent'],
    'viaturas': ['vehículos', 'cars'], 'viatura': ['vehículo', 'car'], 'Limpar': ['Limpiar', 'Clear'], 'Nacional': ['Nacional', 'Portuguese-registered'],
    'Sob consulta': ['Consultar', 'On request'], 'Reservado': ['Reservado', 'Reserved'], 'Vendido': ['Vendido', 'Sold'], 'Caixa Manual 6': ['Caja manual 6', '6-speed manual'],
    'Ver mais viaturas': ['Ver más vehículos', 'See more cars'],
    'Mais do que vender carros': ['Más que vender coches', 'More than selling cars'],
    'Do financiamento à oficina, tratamos de tudo no mesmo sítio. Fale connosco pelo WhatsApp e respondemos rapidamente.': ['De la financiación al taller, nos encargamos de todo en el mismo sitio. Escríbanos por WhatsApp y le respondemos enseguida.', 'From financing to servicing, we handle everything in one place. Message us on WhatsApp and we will reply quickly.'],
    'Intermediação de crédito': ['Intermediación de crédito', 'Financing'],
    'Ajudamos a encontrar a solução de financiamento certa para a viatura que escolheu e tratamos do processo consigo.': ['Le ayudamos a encontrar la financiación adecuada para el vehículo que ha elegido y gestionamos el proceso con usted.', 'We help you find the right financing for the car you have chosen and handle the process with you.'],
    'Simular financiamento →': ['Simular financiación →', 'Get a financing quote →'], 'Compramos o seu carro': ['Compramos su coche', 'We buy your car'],
    'Diga-nos a marca, o modelo e os quilómetros. Avaliamos a sua viatura e fazemos-lhe uma proposta.': ['Díganos la marca, el modelo y los kilómetros. Valoramos su vehículo y le hacemos una oferta.', 'Tell us the make, model and mileage. We will value your car and make you an offer.'],
    'Pedir avaliação →': ['Pedir valoración →', 'Request a valuation →'], 'Consultadoria automóvel': ['Asesoría de compra', 'Car sourcing'],
    'Procura um modelo concreto? Indique a versão, os quilómetros e os extras que quer. Nós encontramos a viatura por si.': ['¿Busca un modelo concreto? Indíquenos la versión, los kilómetros y los extras que quiere. Nosotros encontramos el vehículo por usted.', 'Looking for a specific model? Tell us the version, mileage and options you want. We will find the car for you.'],
    'Encomendar pesquisa →': ['Encargar búsqueda →', 'Request a search →'], 'Oficina': ['Taller', 'Workshop'],
    'Manutenção e preparação da sua viatura, com o mesmo cuidado que damos ao nosso stock.': ['Mantenimiento y preparación de su vehículo, con el mismo cuidado que damos a nuestro stock.', 'Maintenance and preparation of your car, with the same care we give our own stock.'],
    'Marcar serviço →': ['Reservar servicio →', 'Book a service →'], 'Automóveis selecionados, um a um': ['Automóviles seleccionados, uno a uno', 'Cars hand-picked, one by one'],
    'No centro de Lisboa reunimos desportivos, clássicos e SUV de exceção. Cada viatura é escolhida pelo estado, pelo historial e pela exclusividade. Venha vê-las pessoalmente, sem pressas.': ['En el centro de Lisboa reunimos deportivos, clásicos y SUV excepcionales. Cada vehículo se elige por su estado, su historial y su exclusividad. Venga a verlos en persona, sin prisas.', 'In the heart of Lisbon we bring together exceptional sports cars, classics and SUVs. Each car is chosen for its condition, history and exclusivity. Come and see them in person, at your own pace.'],
    'Marcas': ['Marcas', 'Makes'], 'A mais antiga': ['El más antiguo', 'The oldest'],
    '— viaturas entregues com garantia e segunda chave.': ['— vehículos entregados con garantía y segunda llave.', '— cars delivered with warranty and a second key.'],
    'Certificadas': ['Certificados', 'Certified'], '— várias viaturas Porsche Approved e Ferrari Approved.': ['— varios vehículos Porsche Approved y Ferrari Approved.', '— several Porsche Approved and Ferrari Approved cars.'],
    'Atendimento pessoal': ['Atención personal', 'Personal service'], 'Daniel Pinho, Nelson Costa e João Maciel': ['Daniel Pinho, Nelson Costa y João Maciel', 'Daniel Pinho, Nelson Costa and João Maciel'],
    'Onde estivemos': ['Dónde hemos estado', 'Where we have been'],
    'Salões, encontros e passeios de clássicos e desportivos em que o stand participou.': ['Salones, encuentros y rutas de clásicos y deportivos en los que ha participado el concesionario.', 'Shows, meets and classic and sports car tours the dealership has taken part in.'],
    'Leiria sobre Rodas': ['Leiria sobre Rodas', 'Leiria sobre Rodas'], 'Passeio dos Alemães 2024': ['Passeio dos Alemães 2024', 'Passeio dos Alemães 2024'],
    'Agende a sua visita': ['Agende su visita', 'Book your visit'],
    'Diga-nos que viatura quer ver e quando lhe dá jeito. Respondemos pelo WhatsApp.': ['Díganos qué vehículo quiere ver y cuándo le viene bien. Le respondemos por WhatsApp.', 'Tell us which car you want to see and when suits you. We reply on WhatsApp.'],
    'Telefone': ['Teléfono', 'Phone'], 'Chamada para a rede fixa nacional': ['Llamada a red fija nacional (Portugal)', 'Call to a Portuguese landline'],
    'Telemóveis': ['Móviles', 'Mobile'], 'Chamada para a rede móvel nacional': ['Llamada a red móvil nacional (Portugal)', 'Call to a Portuguese mobile'],
    'Morada': ['Dirección', 'Address'], 'Horário': ['Horario', 'Opening hours'], 'Fechado agora': ['Cerrado ahora', 'Closed now'], 'Aberto agora': ['Abierto ahora', 'Open now'],
    'Obter direções': ['Cómo llegar', 'Get directions'], 'Nome': ['Nombre', 'Name'], 'Viatura de interesse': ['Vehículo de interés', 'Car of interest'],
    'Ainda não sei': ['Aún no lo sé', 'Not sure yet'], 'Mensagem': ['Mensaje', 'Message'], 'Enviar pelo WhatsApp': ['Enviar por WhatsApp', 'Send via WhatsApp'],
    'Ao enviar, abre o WhatsApp com a mensagem já escrita.': ['Al enviar, se abre WhatsApp con el mensaje ya escrito.', 'Sending opens WhatsApp with the message already written.'],
    'Livro de Reclamações': ['Libro de Reclamaciones', 'Complaints Book'],
    'Estamos aqui para ajudar! Escolha com quem quer falar.': ['¡Estamos aquí para ayudarle! Elija con quién quiere hablar.', 'We are here to help! Choose who you would like to talk to.'],
    'Vendas': ['Ventas', 'Sales'], 'online': ['en línea', 'online'], 'Abre o WhatsApp com a mensagem já escrita.': ['Abre WhatsApp con el mensaje ya escrito.', 'Opens WhatsApp with the message already written.'],
    'Tenho interesse': ['Me interesa', "I'm interested"], 'Ver no showroom': ['Ver en el showroom', 'See in the showroom'], 'Ver no Instagram': ['Ver en Instagram', 'See on Instagram'],
    'Ligar': ['Llamar', 'Call'], 'Mais info': ['Más info', 'More info'], 'Partilhar': ['Compartir', 'Share'],
    'Ver mais características': ['Ver más características', 'See more specs'], 'Ver menos características': ['Ver menos características', 'See fewer specs'],
    'Também vai gostar destes': ['También le gustarán', 'You may also like'], 'Observações': ['Observaciones', 'Notes'],
    'Todos os dados carecem de confirmação junto do vendedor.': ['Todos los datos deben confirmarse con el vendedor.', 'All details to be confirmed with the seller.'],
    // ficha: campos e valores
    'Registo': ['Matriculación', 'Registration'], 'Quilómetros': ['Kilómetros', 'Mileage'], 'Lugares': ['Plazas', 'Seats'], 'Segmento': ['Segmento', 'Body type'],
    'Combustível': ['Combustible', 'Fuel'], 'Potência': ['Potencia', 'Power'], 'Cilindrada': ['Cilindrada', 'Engine size'], 'Transmissão': ['Transmisión', 'Gearbox'],
    'Cor': ['Color', 'Colour'], 'Portas': ['Puertas', 'Doors'], 'Estado': ['Estado', 'Condition'], 'Garantia': ['Garantía', 'Warranty'],
    'Tipo de Bateria': ['Tipo de batería', 'Battery type'], 'Cor Interior': ['Color interior', 'Interior colour'], 'Portagem': ['Peaje', 'Toll class'], '2ª Chave': ['2.ª llave', 'Second key'],
    'Gasolina': ['Gasolina', 'Petrol'], 'Gasóleo': ['Diésel', 'Diesel'], 'Híbrido': ['Híbrido', 'Hybrid'], 'Elétrico': ['Eléctrico', 'Electric'],
    'Híbrido Plug-In Gasolina': ['Híbrido enchufable gasolina', 'Petrol plug-in hybrid'], 'Automática': ['Automática', 'Automatic'], 'Manual': ['Manual', 'Manual'],
    'Preto': ['Negro', 'Black'], 'Azul': ['Azul', 'Blue'], 'Azul Claro': ['Azul claro', 'Light blue'], 'Bege': ['Beige', 'Beige'], 'Cinza': ['Gris', 'Grey'],
    'Verde Escuro': ['Verde oscuro', 'Dark green'], 'Vermelho': ['Rojo', 'Red'], 'Castanho': ['Marrón', 'Brown'], 'Branco': ['Blanco', 'White'], 'Bordeaux': ['Burdeos', 'Burgundy'],
    'Como novo': ['Como nuevo', 'As new'], 'Bom': ['Bueno', 'Good'], 'Clássico': ['Clásico', 'Classic'], 'Sim': ['Sí', 'Yes'], 'Própria': ['Propia', 'Owned'],
    'Classe 1': ['Clase 1', 'Class 1'], 'SUV / TT': ['SUV / TT', 'SUV / 4x4'], 'Sedan': ['Berlina', 'Saloon'],
    // texto de pósteres em português
    'Tração': ['Tracción', 'All-wheel'], 'integral': ['integral', 'drive'], 'ADN de': ['ADN de', 'Formula 1'], 'Fórmula 1': ['Fórmula 1', 'DNA'], 'desde 1947': ['desde 1947', 'since 1947'],
  };
  // atributos (aria-label, placeholder) — frases fixas
  const A = {
    'Daniel Pinho Automóveis — início': ['Daniel Pinho Automóveis — inicio', 'Daniel Pinho Automóveis — home'], 'Menu principal': ['Menú principal', 'Main menu'],
    'Mudar para tema escuro': ['Cambiar a tema oscuro', 'Switch to dark theme'], 'Mudar para tema claro': ['Cambiar a tema claro', 'Switch to light theme'],
    'Abrir menu': ['Abrir menú', 'Open menu'], 'Menu móvel': ['Menú móvil', 'Mobile menu'],
    'Showroom: deslize ou use as setas para mudar de carro': ['Showroom: deslice o use las flechas para cambiar de coche', 'Showroom: swipe or use the arrows to change car'],
    'Escolher carro': ['Elegir coche', 'Choose car'], 'Carro anterior': ['Coche anterior', 'Previous car'], 'Carro seguinte': ['Coche siguiente', 'Next car'],
    'Ver o Reel desta viatura': ['Ver el vídeo de este vehículo', "Watch this car's video"], 'Rodar a viatura': ['Girar el vehículo', 'Rotate the car'],
    'Ficha da viatura': ['Ficha del vehículo', 'Car details'], 'Anterior': ['Anterior', 'Previous'], 'Seguinte': ['Siguiente', 'Next'],
    'Que viatura procura?': ['¿Qué vehículo busca?', 'What car are you looking for?'], 'Fotografia anterior': ['Foto anterior', 'Previous photo'], 'Fotografia seguinte': ['Foto siguiente', 'Next photo'],
    'Procurar uma viatura igual por WhatsApp': ['Buscar un vehículo igual por WhatsApp', 'Find a car like this via WhatsApp'], 'O stand em números': ['El concesionario en cifras', 'The dealership in numbers'],
    'Ex.: gostava de ver o carro no sábado de manhã.': ['Ej.: me gustaría ver el coche el sábado por la mañana.', 'E.g.: I would like to see the car on Saturday morning.'],
    'Daniel Pinho Automóveis — voltar ao início': ['Daniel Pinho Automóveis — volver al inicio', 'Daniel Pinho Automóveis — back to top'], 'Rodapé': ['Pie de página', 'Footer'],
    'Falar por WhatsApp': ['Hablar por WhatsApp', 'Chat on WhatsApp'], 'Ligar para o stand': ['Llamar al concesionario', 'Call the dealership'],
    'Vídeo da viatura': ['Vídeo del vehículo', 'Car video'], 'Fechar o vídeo': ['Cerrar el vídeo', 'Close the video'], 'Vídeo anterior': ['Vídeo anterior', 'Previous video'],
    'Vídeo seguinte': ['Vídeo siguiente', 'Next video'], 'Fechar e voltar': ['Cerrar y volver', 'Close and go back'], 'Ligar o som': ['Activar el sonido', 'Turn sound on'], 'Desligar o som': ['Silenciar', 'Mute'],
  };
  const MES = {jan: ['ene', 'Jan'], fev: ['feb', 'Feb'], mar: ['mar', 'Mar'], abr: ['abr', 'Apr'], mai: ['may', 'May'], jun: ['jun', 'Jun'], jul: ['jul', 'Jul'], ago: ['ago', 'Aug'], set: ['sep', 'Sep'], out: ['oct', 'Oct'], nov: ['nov', 'Nov'], dez: ['dic', 'Dec']};
  // frases com números ou nomes (k = 0 ES, 1 EN)
  const R = [
    [/^(\d+) \/ (\d+) Fotos$/, (m, k) => `${m[1]} / ${m[2]} ${['fotos', 'photos'][k]}`],
    [/^Ver as (\d+) fotografias no anúncio$/, (m, k) => [`Ver las ${m[1]} fotos en el anuncio`, `See all ${m[1]} photos in the listing`][k]],
    [/^([\d.,]+(?: mil)?) visualizações no Instagram$/, (m, k) => [`${m[1]} visualizaciones en Instagram`, `${m[1].replace(' mil', 'K')} views on Instagram`][k]],
    [/^([\d.,]+) mil$/, (m, k) => [`${m[1]} mil`, `${m[1]}K`][k]],
    [/^(\d{1,2}) (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez) (\d{4})$/, (m, k) => k ? `${MES[m[2]][1]} ${m[1]}, ${m[3]}` : `${m[1]} ${MES[m[2]][0]} ${m[3]}`],
    [/^(Automática|Manual) de (\d) velocidades$/, (m, k) => k ? `${m[2]}-speed ${m[1] === 'Manual' ? 'manual' : 'automatic'}` : `${m[1]} de ${m[2]} velocidades`],
    [/^Ver o vídeo do (.+)$/, (m, k) => [`Ver el vídeo del ${m[1]}`, `Watch the ${m[1]} video`][k]],
    [/^Pedir informações do (.+) por WhatsApp$/, (m, k) => [`Pedir información del ${m[1]} por WhatsApp`, `Ask about the ${m[1]} on WhatsApp`][k]],
    [/^Agendar visita para ver o (.+) por WhatsApp$/, (m, k) => [`Agendar visita para ver el ${m[1]} por WhatsApp`, `Book a visit to see the ${m[1]} via WhatsApp`][k]],
    [/^Fotografia (\d+)$/, (m, k) => `${['Foto', 'Photo'][k]} ${m[1]}`],
    [/^Mapa: (.+)$/, (m, k) => `${['Mapa', 'Map'][k]}: ${m[1]}`],
  ];

  const LANGS = ['pt', 'es', 'en'];
  let lang = 'pt';
  try { lang = localStorage.getItem('dp-lang') || (navigator.language || '').slice(0, 2); } catch(e){}
  if(!LANGS.includes(lang)) lang = 'pt';

  const tr = (t, dic) => {
    if(lang === 'pt') return t;
    const k = lang === 'es' ? 0 : 1, s = t.replace(/\s+/g, ' ').trim();
    if(!s) return t;
    let o = dic[s] ? dic[s][k] : null;
    if(o == null) for(const [re, f] of R){ const m = s.match(re); if(m){ o = f(m, k); break; } }
    if(o == null && s.includes(' · ')){                                    // "2021 · 6.800 km · Gasolina"
      const p = s.split(' · '); if(p.some(x => D[x])) o = p.map(x => D[x] ? D[x][k] : x).join(' · ');
    }
    if(o == null) return t;
    return t.replace(s, o).replace(/^\s*/, t.match(/^\s*/)[0]);
  };

  const orig = new WeakMap(), origAttr = new WeakMap();
  const ATTRS = ['aria-label', 'placeholder', 'title'];
  let aMudar = false;
  function textNode(n){
    if(!n.parentElement || n.parentElement.closest('script,style,[data-no-i18n]')) return;
    const atual = n.nodeValue, salvo = orig.get(n);
    // se a página mudou o texto (não fomos nós), esse passa a ser o original
    const base = salvo && salvo.out === atual ? salvo.pt : atual;
    const out = tr(base, D);
    orig.set(n, {pt: base, out});
    if(out !== atual) n.nodeValue = out;
  }
  function attrs(el){
    let m = origAttr.get(el); if(!m){ m = {}; origAttr.set(el, m); }
    for(const a of ATTRS){
      const v = el.getAttribute(a); if(v == null) continue;
      const base = m[a] && m[a].out === v ? m[a].pt : v;
      const out = tr(base, Object.assign({}, D, A));
      m[a] = {pt: base, out};
      if(out !== v) el.setAttribute(a, out);
    }
  }
  function percorrer(root){
    if(root.nodeType === 3) return textNode(root);
    if(root.nodeType !== 1) return;
    if(root.closest && root.closest('script,style')) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while((n = w.nextNode())) textNode(n);
    if(root.hasAttribute && ATTRS.some(a => root.hasAttribute(a))) attrs(root);
    root.querySelectorAll && root.querySelectorAll('[aria-label],[placeholder],[title]').forEach(attrs);
  }
  const mo = new MutationObserver(ms => {
    if(aMudar) return;
    aMudar = true;
    for(const m of ms){
      if(m.type === 'characterData') textNode(m.target);
      else if(m.type === 'attributes') attrs(m.target);
      else m.addedNodes.forEach(percorrer);
    }
    mo.takeRecords(); aMudar = false;
  });

  function aplicar(l){
    lang = l;
    try { localStorage.setItem('dp-lang', l); } catch(e){}
    document.documentElement.lang = l === 'pt' ? 'pt-PT' : l;
    aMudar = true; percorrer(document.body); mo.takeRecords(); aMudar = false;
    document.querySelectorAll('.lang-opt').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === l ? 'true' : 'false'));
    const cur = document.getElementById('langCur'); if(cur) cur.textContent = l.toUpperCase();
  }

  // botão: mostra o idioma atual; ao tocar abre as três opções; ao escolher volta a encolher
  function botao(){
    const box = document.getElementById('langBox'); if(!box) return;
    const btn = document.getElementById('langBtn');
    const fechar = () => { box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', e => { e.stopPropagation(); const a = !box.classList.contains('is-open'); box.classList.toggle('is-open', a); btn.setAttribute('aria-expanded', String(a)); });
    box.querySelectorAll('.lang-opt').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); aplicar(b.dataset.lang); fechar(); }));
    document.addEventListener('click', e => { if(!box.contains(e.target)) fechar(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape') fechar(); });
  }

  botao();
  aplicar(lang);
  mo.observe(document.body, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS});
})();
