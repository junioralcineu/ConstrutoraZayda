/* ============================================================
   PAGE ROUTING + TRANSITION
============================================================ */
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('[data-link]');
const veil = document.getElementById('veil');
const nav = document.getElementById('nav');

function syncActiveNav(route) {
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
}

async function goTo(route, push = true) {
  const current = document.querySelector('.page.active');
  const next = document.querySelector(`.page[data-page="${route}"]`);
  if (!next || current === next) return;

  // 1) slide veil up to cover
  veil.style.transition = 'transform 620ms cubic-bezier(0.7, 0, 0.3, 1)';
  veil.style.transform = 'translateY(0)';
  veil.classList.add('show');

  await new Promise(r => setTimeout(r, 480));

  // 2) swap page
  current.classList.remove('active');
  next.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });

  // re-trigger reveals
  document.querySelectorAll('.r').forEach(el => el.classList.remove('in'));
  observeReveals();

  syncActiveNav(route);
  if (push) history.pushState({ route }, '', `#${route}`);

  /* footer visível apenas na home; social bar nas demais */
  const _footer    = document.querySelector('footer');
  const _socialBar = document.getElementById('socialBar');
  if (_footer)    _footer.classList.toggle('page-hidden', route !== 'inicio');
  if (_socialBar) _socialBar.classList.toggle('active',   route !== 'inicio');

  await new Promise(r => setTimeout(r, 120));

  // 3) slide veil up out
  veil.style.transition = 'transform 720ms cubic-bezier(0.7, 0, 0.3, 1)';
  veil.style.transform = 'translateY(-100%)';

  setTimeout(() => {
    veil.classList.remove('show');
    veil.style.transition = 'none';
    veil.style.transform = 'translateY(100%)';
  }, 760);
}

navLinks.forEach(a => {
  a.addEventListener('click', e => {
    const route = a.dataset.route;
    if (!route) return;
    e.preventDefault();
    closeMenu();
    goTo(route);
  });
});

window.addEventListener('popstate', e => {
  const route = (location.hash || '#inicio').slice(1);
  goTo(route, false);
});

// load initial route from hash
const initialRoute = (location.hash || '#inicio').slice(1);
if (initialRoute !== 'inicio') {
  document.querySelector('.page.active')?.classList.remove('active');
  document.querySelector(`.page[data-page="${initialRoute}"]`)?.classList.add('active');
  syncActiveNav(initialRoute);
  /* estado inicial do footer e social bar para rota não-home */
  document.querySelector('footer')?.classList.add('page-hidden');
  document.getElementById('socialBar')?.classList.add('active');
}

/* ============================================================
   BLOG — filtro de categoria
============================================================ */
document.querySelectorAll('.jn-cat').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.jn-cat').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    const posts = document.querySelectorAll('#jnGrid .jn-post');
    let shown = 0;
    posts.forEach(p => {
      const match = cat === 'all' || p.dataset.cat === cat;
      p.style.display = match ? '' : 'none';
      if (match) shown++;
    });
    const empty = document.getElementById('jnEmpty');
    if (empty) empty.style.display = shown === 0 ? '' : 'none';
  });
});
document.getElementById('jnReset')?.addEventListener('click', () => {
  document.querySelectorAll('.jn-cat').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
  document.querySelectorAll('#jnGrid .jn-post').forEach(p => p.style.display = '');
  const empty = document.getElementById('jnEmpty');
  if (empty) empty.style.display = 'none';
});

/* ============================================================
   MEGA-MENU: Preview cursor-following
   O cartão de preview segue o cursor com lerp suave (rAF).
   Ao hover de cada nd-link, troca o slide correspondente.
============================================================ */
(function () {
  const ndcp      = document.getElementById('ndCursorPreview');
  if (!ndcp) return;

  const ndcpCap   = ndcp.querySelector('.ndcp-cap');
  const allSlides = ndcp.querySelectorAll('.ndcp-slide');

  let targetX = 0, targetY = 0;
  let curX    = 0, curY    = 0;
  let rafId   = null;
  const LERP  = 0.14;           /* suavidade: 0 = instantâneo, 1 = parado */
  const OFFSET_X =  28;         /* deslocamento à direita do cursor       */
  const OFFSET_Y = -50;         /* deslocamento vertical (centro no cursor)*/

  /* ── Animação de posição com interpolação linear ── */
  function tick() {
    curX += (targetX - curX) * LERP;
    curY += (targetY - curY) * LERP;

    const w  = ndcp.offsetWidth;
    const h  = ndcp.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x  = Math.min(curX + OFFSET_X, vw - w - 16);
    const y  = Math.max(Math.min(curY + OFFSET_Y, vh - h - 16), 16);

    ndcp.style.transform = `translate(${x}px, ${y}px)`;
    rafId = requestAnimationFrame(tick);
  }

  /* ── Mostrar preview com slide específico ── */
  function showPreview(key, caption) {
    allSlides.forEach(s => s.classList.remove('active'));
    const target = ndcp.querySelector(`.ndcp-slide[data-for="${key}"]`);
    if (target) target.classList.add('active');
    if (ndcpCap) ndcpCap.textContent = caption || '';

    if (!ndcp.classList.contains('visible')) {
      ndcp.classList.add('visible');
      rafId = requestAnimationFrame(tick);
    }
  }

  /* ── Ocultar preview ── */
  function hidePreview() {
    ndcp.classList.remove('visible');
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  /* Rastrear cursor globalmente */
  document.addEventListener('mousemove', e => {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  /* Hover em cada nd-link → troca slide */
  document.querySelectorAll('.nd-link[data-preview]').forEach(link => {
    link.addEventListener('mouseenter', () =>
      showPreview(link.dataset.preview, link.dataset.caption || ''));
  });

  /* Saiu do dropdown → oculta preview */
  document.querySelectorAll('.nav-dropdown').forEach(panel => {
    panel.addEventListener('mouseleave', hidePreview);
  });

  /* Expõe funções para uso no openNavPanel / closeNavPanels */
  window._ndcpShow = showPreview;
  window._ndcpHide = hidePreview;
})();

/* ============================================================
   MEGA-MENU (dropdown estilo Apple)
============================================================ */
const navBackdrop = document.getElementById('navBackdrop');
const navMenuItems = document.querySelectorAll('.nav-item[data-menu]');
const navPanels    = document.querySelectorAll('.nav-dropdown');
let menuHideTimer;

function openNavPanel(id) {
  clearTimeout(menuHideTimer);
  navMenuItems.forEach(i => i.classList.toggle('active', i.dataset.menu === id));
  navPanels.forEach(p => p.classList.toggle('active', p.dataset.panel === id));
  navBackdrop.classList.add('show');
}

function closeNavPanels(delay = 120) {
  menuHideTimer = setTimeout(() => {
    navMenuItems.forEach(i => i.classList.remove('active'));
    navPanels.forEach(p => p.classList.remove('active'));
    navBackdrop.classList.remove('show');
    if (window._ndcpHide) window._ndcpHide();
  }, delay);
}

navMenuItems.forEach(item => {
  item.addEventListener('mouseenter', () => openNavPanel(item.dataset.menu));
  item.addEventListener('mouseleave', () => closeNavPanels());
});

navPanels.forEach(panel => {
  panel.addEventListener('mouseenter', () => clearTimeout(menuHideTimer));
  panel.addEventListener('mouseleave', () => closeNavPanels());
});

/* Fecha ao clicar no backdrop ou num link do dropdown */
navBackdrop.addEventListener('click', () => closeNavPanels(0));
navPanels.forEach(panel => {
  panel.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => closeNavPanels(0));
  });
});

/* ============================================================
   MOBILE MENU
============================================================ */
const menuOverlay = document.getElementById('menuOverlay');
document.getElementById('openMenu').addEventListener('click', () => menuOverlay.classList.add('open'));
function closeMenu() { menuOverlay.classList.remove('open'); }
document.getElementById('closeMenu').addEventListener('click', closeMenu);

/* ============================================================
   CONTACT MODAL
============================================================ */
const modal = document.getElementById('modal');
const stepIdx = document.getElementById('stepIdx');
const steps = document.querySelectorAll('.modal-step');
const backBtn = document.getElementById('backBtn');
const nextBtn = document.getElementById('nextBtn');
const success = document.getElementById('success');
const formInner = document.getElementById('contactForm');
let stepN = 1;
const total = steps.length;

function openContact() { modal.classList.add('open'); stepN = 1; updateStep(); }
function closeContact() { modal.classList.remove('open'); }
document.getElementById('openContact').addEventListener('click', openContact);
document.getElementById('ctaContact').addEventListener('click', openContact);
document.getElementById('closeModal').addEventListener('click', closeContact);

function updateStep() {
  steps.forEach(s => s.classList.toggle('active', +s.dataset.step === stepN));
  stepIdx.textContent = `(0${stepN}/0${total})`;
  backBtn.disabled = stepN === 1;
  nextBtn.textContent = stepN === total ? 'Enviar →' : 'Próximo →';
}

backBtn.addEventListener('click', () => { if (stepN > 1) { stepN--; updateStep(); } });
nextBtn.addEventListener('click', () => {
  if (stepN === total) {
    formInner.style.display = 'none';
    success.classList.add('show');
    stepIdx.textContent = '(enviado)';
    return;
  }
  stepN++; updateStep();
});

// radio-style options
document.querySelectorAll('.options').forEach(group => {
  group.querySelectorAll('.opt').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
});

/* ============================================================
   WORK ITEM HOVER PREVIEW
============================================================ */
/* work-preview hover disabled — image-slots used instead */

/* ============================================================
   CUSTOM CURSOR
============================================================ */
const cursor = document.getElementById('cursor');
window.addEventListener('mousemove', e => {
  cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
});
document.querySelectorAll('a, button, .work-item, .obra, .processo-step, .opt').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

/* ============================================================
   REVEAL ON SCROLL
============================================================ */
let io;
function observeReveals() {
  if (io) io.disconnect();
  io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.page.active .r').forEach(el => io.observe(el));
}
observeReveals();

/* ============================================================
   FILTERS (Obras)
============================================================ */
document.querySelectorAll('.filters .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filters .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const f = chip.dataset.filter;
    document.querySelectorAll('.obra[data-status]').forEach(o => {
      const match = f === 'all' || o.dataset.status === f;
      o.style.display = match ? '' : 'none';
    });
  });
});

/* ============================================================
   CLOCK
============================================================ */
function tick() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const hour = d.getHours();
  const open = hour >= 8 && hour < 18;
  document.getElementById('clockTxt').textContent = `${hh}:${mm} RJ, ${open ? 'estamos atendendo' : 'voltamos às 08h'}`;
}
tick(); setInterval(tick, 30000);

/* ============================================================
   NAV BLEND COLOR (light pages need invert)
============================================================ */
// no-op (difference blend handles it)

/* ============================================================
   ROUTE LIST (extended)
============================================================ */
const ROUTES = ['inicio','empreendimentos','empreendimento','simulador','sobre','processo','esg','carreira','blog','investidores','atendimento'];

document.getElementById('empReset')?.addEventListener('click', () => {
  document.querySelectorAll('#empGrid .obra').forEach(c => c.style.display = '');
  document.querySelectorAll('.filters .chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
  const empty = document.getElementById('empEmpty');
  if (empty) empty.style.display = 'none';
  const cnt = document.getElementById('empCount');
  if (cnt) cnt.textContent = '(08)';
});

/* ============================================================
   EMPREENDIMENTO DETAIL — populate from data-emp on click
============================================================ */
const EMP_DATA = {
  'praia-da-lagoa': {
    name: 'Praia da Lagoa', label:'(00 · 2026 · Centro)', status:'Lançamento',
    tag:'Três quartos com suíte, cozinha integrada e varanda — a duzentos metros da Prainha.',
    local:'Rua São João · Centro · Barra de São João', units:'32 apartamentos',
    tipo:'3 quartos · 1 suíte · cozinha integrada', vagas:'1 vaga por unidade', entrega:'1 ano após contrato', price:'R$ 480 mil',
    cloudinaryTag: 'rua-sao-joao',
    heroImg: 'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779202203/5-IMG_6841_db4c60.jpg',
    galleryImgs: [
      'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779202212/58-IMG_6917_g1zx4c.jpg',
      'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779202210/49-IMG_6891_annyry.jpg',
      'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779202205/30-IMG_6869_kuaxz5.jpg',
      'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779202202/24-IMG_6860_mgphry.jpg',
    ]
  },
  'mares': {
    name: 'Marés', label:'(01 · 2025 · Praia)', status:'Em obra',
    tag:'Vinte e quatro apartamentos a três quadras da areia.',
    local:'Rua das Palmeiras, 88 · Barra de São João', units:'24 apartamentos',
    tipo:'2 quartos · 58–72 m²', vagas:'1 vaga por unidade', entrega:'Ago 2026', price:'R$ 420 mil'
  },
  'vila-do-sol': {
    name: 'Vila do Sol', label:'(02 · 2024 · Centro)', status:'Pronto pra morar',
    tag:'Quarenta e oito unidades em três blocos baixos, com pátio central arborizado.',
    local:'Estrada do Sana, 1.200 · Barra de São João', units:'48 apartamentos',
    tipo:'2 quartos · 54–66 m²', vagas:'1 vaga por unidade', entrega:'Entregue em Mai 2024', price:'R$ 380 mil',
    cloudinaryTag: 'rua-tucunaré-rosangela',
    heroImg: 'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779214464/1-dji_fly_20250818_103402_69_1755526869376_photo_1_qihmg0.jpg'
  },
  'aldeia': {
    name: 'Aldeia', label:'(03 · 2023 · Costa Azul)', status:'Pronto pra morar',
    tag:'Dezoito casas térreas em condomínio fechado, com horta comunitária.',
    local:'Rua Itacolomi, 45 · Costa Azul', units:'18 casas',
    tipo:'3 quartos · 96 m²', vagas:'2 vagas por unidade', entrega:'Entregue em Out 2023', price:'R$ 520 mil'
  },
  'atoba': {
    name: 'Atobá', label:'(04 · 2025 · Pescão)', status:'Em obra',
    tag:'Dezesseis unidades pequenas, pensadas para casais e veranistas.',
    local:'Av. dos Pescadores, 220 · Pescão', units:'16 apartamentos',
    tipo:'2 quartos · 52–60 m²', vagas:'1 vaga por unidade', entrega:'Dez 2026', price:'R$ 460 mil'
  },
  'manguezal': {
    name: 'Manguezal', label:'(05 · 2022 · Beira-Rio)', status:'Pronto pra morar',
    tag:'Vinte e oito apartamentos de frente para o mangue, com varandas de 12m².',
    local:'Rua do Mangue, 70 · Beira-Rio', units:'28 apartamentos',
    tipo:'2 quartos · 56–68 m²', vagas:'1 vaga por unidade', entrega:'Entregue em Mar 2022', price:'R$ 360 mil'
  },
  'costa-verde': {
    name: 'Costa Verde', label:'(06 · 2021 · Praia)', status:'Pronto pra morar',
    tag:'Vinte e duas unidades com vista para o mar, em terreno arborizado.',
    local:'Av. Atlântica, 1.800 · Praia', units:'22 apartamentos',
    tipo:'3 quartos · 72–88 m²', vagas:'1 vaga por unidade', entrega:'Entregue em Jul 2021', price:'R$ 490 mil'
  },
  'ipanema-do-norte': {
    name: 'Ipanema do Norte', label:'(07 · 2020 · Costa Azul)', status:'Pronto pra morar',
    tag:'Quatorze unidades em rua arborizada, a duas quadras do mar.',
    local:'Rua dos Coqueiros, 50 · Costa Azul', units:'14 apartamentos',
    tipo:'2 quartos · 60–74 m²', vagas:'1 vaga por unidade', entrega:'Entregue em Set 2020', price:'R$ 410 mil'
  },
  'rua-lambari-juliana': {
    name: 'Rua Lambari', label:'(08 · 2025 · Centro)', status:'Pronto pra morar',
    tag:'Unidades residenciais em uma das ruas mais tranquilas de Barra de São João.',
    local:'Rua Lambari · Centro · Barra de São João', units:'A definir',
    tipo:'2 quartos', vagas:'1 vaga por unidade', entrega:'A definir', price:'A consultar',
    cloudinaryTag: 'rua-lambari-juliana',
    heroImg: 'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779218018/1-dji_fly_20250904_153658_157_1757011027056_photo_fi39ey.jpg'
  }
};

function populateEmp(key) {
  const d = EMP_DATA[key];
  if (!d) return;
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('empName', d.name);
  setText('empLabel', d.label);
  setText('empStatus', d.status);
  setText('empTag', d.tag);
  setText('specLocal', d.local);
  setText('specUnits', d.units);
  setText('specTipo', d.tipo);
  setText('specVagas', d.vagas);
  setText('specEntrega', d.entrega);
  setText('specPrice', d.price);
  /* Atualiza hero — URL estática ou marcado para o Cloudinary preencher */
  const _hEl = document.getElementById('empHeroImg');
  if (_hEl) {
    if (d.heroImg) { _hEl.src = d.heroImg; _hEl.classList.remove('img-awaiting-cloud'); }
    else            { _hEl.removeAttribute('src'); _hEl.classList.add('img-awaiting-cloud'); }
    _hEl.alt = d.name;
  }
  /* Atualiza 4 células da galeria estática */
  document.querySelectorAll('.emp-g-cell img').forEach((img, i) => {
    const src = d.galleryImgs && d.galleryImgs[i];
    if (src) { img.src = src; img.classList.remove('img-awaiting-cloud'); }
    else       { img.removeAttribute('src'); img.classList.add('img-awaiting-cloud'); }
    img.alt = `${d.name} — foto ${i + 1}`;
  });
  loadCloudinaryGallery(d.cloudinaryTag || null);
  /* Reinicia vídeo ambiente quando o projeto é carregado */
  setTimeout(() => {
    document.querySelectorAll('.emp-map video').forEach(v => {
      v.currentTime = 0;
      v.play().catch(() => {});
    });
  }, 200);
}

/* ============================================================
   GALERIA CLOUDINARY
   Cloud: dovqcebdt  |  Transformações: f_auto,q_auto
   Para adicionar galeria a outro projeto: inclua
   cloudinaryTag: 'nome-do-album' no objeto EMP_DATA.
============================================================ */
const CLOUD_NAME = 'dovqcebdt';

function loadCloudinaryGallery(tag) {
  const section = document.getElementById('empCloudSection');
  const grid    = document.getElementById('empCloudGrid');
  if (!section || !grid) return;

  /* Sem tag: esconde a seção e limpa o grid */
  if (!tag) {
    section.style.display = 'none';
    grid.innerHTML = '';
    return;
  }

  /* Exibe seção e mostra skeletons durante o fetch */
  section.style.display = '';
  grid.innerHTML = Array(6).fill(0).map(() =>
    `<div class="emp-cloud-skeleton"></div>`
  ).join('');

  /* Cloudinary Resource List API — ative em Settings › Security */
  const listUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${tag}.json`;

  fetch(listUrl)
    .then(r => {
      if (!r.ok) throw new Error('Verifique se "Resource List" está ativa no Cloudinary.');
      return r.json();
    })
    .then(data => {
      if (!data.resources || !data.resources.length) {
        section.style.display = 'none';
        grid.innerHTML = '';
        return;
      }
      const buildUrl = r => `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${r.public_id}`;

      /* Preenche hero se ainda aguarda Cloudinary */
      const _hEl = document.getElementById('empHeroImg');
      if (_hEl && _hEl.classList.contains('img-awaiting-cloud') && data.resources[0]) {
        _hEl.src = buildUrl(data.resources[0]);
        _hEl.classList.remove('img-awaiting-cloud');
      }

      /* Preenche células da galeria estática que aguardam Cloudinary (a partir da 2ª imagem) */
      let _ci = 1;
      document.querySelectorAll('.emp-g-cell img').forEach(img => {
        if (img.classList.contains('img-awaiting-cloud') && data.resources[_ci]) {
          img.src = buildUrl(data.resources[_ci++]);
          img.classList.remove('img-awaiting-cloud');
        }
      });

      /* Galeria Cloudinary na base da página — todas as imagens */
      grid.innerHTML = data.resources.map(r => {
        const url = buildUrl(r);
        const alt = r.public_id.split('/').pop().replace(/[-_]/g, ' ');
        return `
          <div class="emp-cloud-item r">
            <img src="${url}" alt="${alt}" loading="lazy">
          </div>`;
      }).join('');
    })
    .catch(err => {
      console.error('[Cloudinary]', err);
      section.style.display = 'none';
      grid.innerHTML = '';
    });
}

// intercept clicks on cards with data-emp BEFORE route handler runs
document.querySelectorAll('[data-emp]').forEach(el => {
  el.addEventListener('click', (e) => {
    const key = el.dataset.emp;
    if (key) {
      window._zaydaCurrentEmp = key;
      populateEmp(key);
    }
  }, true);
});

/* ============================================================
   SIMULADOR — math
============================================================ */
const sim = {
  val: document.getElementById('simVal'),
  ent: document.getElementById('simEnt'),
  prz: document.getElementById('simPrz'),
  rd:  document.getElementById('simRd'),
  sys: 'sac',
  rate: 9,
};

function fmtBRL(n) {
  if (!isFinite(n)) return 'R$ 0';
  return 'R$ ' + Math.round(n).toLocaleString('pt-BR');
}

function calcSim() {
  if (!sim.val) return;
  const valor = +sim.val.value;
  const entPct = +sim.ent.value;
  const entrada = valor * (entPct/100);
  const financiado = valor - entrada;
  const prazoAnos = +sim.prz.value;
  const prazoMeses = prazoAnos * 12;
  const renda = +sim.rd.value;
  const i_a = sim.rate / 100;
  const i = Math.pow(1 + i_a, 1/12) - 1; // taxa mensal equivalente

  let primeira, ultima, total, juros;
  if (sim.sys === 'sac') {
    // SAC: amortização constante = financiado/n
    const amort = financiado / prazoMeses;
    primeira = amort + financiado * i;
    ultima   = amort + amort * i; // último mês: saldo = amort
    // total pago = soma de n parcelas; em SAC, soma juros = saldo_med * i * n = (financiado * (n+1)/2 / n ) * i * n ≈
    // mais simples: total juros = financiado * (n+1)/2 * i
    juros = financiado * (prazoMeses + 1) / 2 * i;
    total = financiado + juros;
  } else {
    // PRICE: parcela fixa = P * i / (1 - (1+i)^-n)
    const pmt = financiado * i / (1 - Math.pow(1 + i, -prazoMeses));
    primeira = pmt;
    ultima = pmt;
    total = pmt * prazoMeses;
    juros = total - financiado;
  }

  // update labels
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('simValTxt', fmtBRL(valor));
  set('simEntTxt', fmtBRL(entrada) + ' (' + entPct + '%)');
  set('simPrzTxt', prazoAnos + ' anos');
  set('simRdTxt',  fmtBRL(renda));
  set('simFinanciado', fmtBRL(financiado));
  set('simPa1', fmtBRL(primeira));
  set('simPa2', fmtBRL(ultima));
  set('simTotal', fmtBRL(total));
  set('simPrzOut', prazoAnos + ' anos');
  set('simSysLabel', sim.sys === 'sac' ? '(Sistema SAC)' : '(Sistema PRICE)');
  set('simPa1Label', sim.sys === 'price' ? 'Parcela fixa' : 'Primeira parcela');
  set('simPa2Label', sim.sys === 'price' ? '·' : 'Última parcela');
  set('simPrincipalTxt', fmtBRL(financiado));
  set('simJurosTxt', fmtBRL(juros));

  // bar fill: principal ratio of total
  const ratio = financiado / total;
  const bar = document.getElementById('simBarFill');
  if (bar) bar.style.width = (ratio * 100).toFixed(1) + '%';

  // comprometimento: primeira parcela / renda
  const compr = (primeira / renda) * 100;
  set('simCompr', compr.toFixed(1).replace('.', ',') + '%');
  const warn = document.getElementById('simWarn');
  if (warn) warn.style.display = compr > 30 ? '' : 'none';
}

if (sim.val) {
  [sim.val, sim.ent, sim.prz, sim.rd].forEach(inp => inp.addEventListener('input', calcSim));
  // system toggle
  document.querySelectorAll('[data-toggle="sys"] button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-toggle="sys"] button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      sim.sys = b.dataset.sys;
      calcSim();
    });
  });
  // rate toggle
  document.querySelectorAll('[data-toggle="rate"] button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-toggle="rate"] button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      sim.rate = parseFloat(b.dataset.rate);
      calcSim();
    });
  });
  calcSim();
}

// Sim CTA → open contact modal
document.getElementById('simContact')?.addEventListener('click', () => {
  document.getElementById('modal').classList.add('open');
});
// detail page CTAs
document.querySelectorAll('[data-cta]').forEach(b => {
  b.addEventListener('click', () => document.getElementById('modal').classList.add('open'));
});
document.getElementById('openContactFooter')?.addEventListener('click', () => {
  document.getElementById('modal').classList.add('open');
});

/* ============================================================
   Empreendimentos page — apply hero search on entry
============================================================ */
const origGoTo = window.goTo;
// wrap goTo from external script — we need to extend the listener for the new pages.
// Since goTo is a top-level function in the original script, it's accessible.
window.addEventListener('hashchange', () => {
  const route = (location.hash || '#inicio').slice(1);
  if (route === 'empreendimentos' && window._zaydaSearch) {
    setTimeout(applyEmpSearch, 60);
  }
});

// Attach to all data-link clicks: if going to empreendimentos and there's a search, apply
document.querySelectorAll('[data-link]').forEach(a => {
  a.addEventListener('click', (e) => {
    const route = a.dataset.route;
    if (route === 'empreendimento') {
      const key = a.dataset.emp;
      if (key) { window._zaydaCurrentEmp = key; populateEmp(key); }
    }
  });
});

/* ============================================================
   Filter chips on empreendimentos — update count
============================================================ */
document.querySelectorAll('.filters .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    setTimeout(() => {
      const visible = [...document.querySelectorAll('#empGrid .obra')].filter(c => c.style.display !== 'none').length;
      const cnt = document.getElementById('empCount');
      if (cnt) cnt.textContent = '(' + String(visible).padStart(2,'0') + ')';
      const empty = document.getElementById('empEmpty');
      if (empty) empty.style.display = visible === 0 ? '' : 'none';
    }, 20);
  });
});

/* ============================================================
   Initial route population
============================================================ */
const _init = (location.hash || '#inicio').slice(1);
if (_init === 'empreendimento') {
  populateEmp(window._zaydaCurrentEmp || 'praia-da-lagoa');
}

/* ============================================================
   MAPA INTERATIVO — Leaflet.js + CartoDB Positron (sem API key)
   ─────────────────────────────────────────────────────────────
   Para ajustar o centro do mapa: edite MAP_CENTER e MAP_ZOOM
   Para adicionar/remover pontos: edite os arrays IMOVEIS e ROTEIRO
   Coordenadas: [latitude, longitude]
============================================================ */
(function () {
  if (typeof L === 'undefined') return; // Leaflet não carregou

  const sobrePage = document.querySelector('[data-page="sobre"]');
  if (!sobrePage) return;

  /* ── Centro do mapa ─────────────────────────────────────── */
  const MAP_CENTER = [-22.6083, -41.9413]; // Barra de São João, RJ
  const MAP_ZOOM   = 14;

  /* ── Dados: Imóveis Zayda ───────────────────────────────── */
  const IMOVEIS = [
    { id: 'praia-da-lagoa', name: 'Praia da Lagoa', meta: 'Lançamento · 2026', lat: -22.6150, lng: -41.9300 },
    { id: 'mares',          name: 'Marés',           meta: 'Em obra · 2025',    lat: -22.6060, lng: -41.9480 },
    { id: 'atoba',          name: 'Atobá',           meta: 'Em obra · 2025',    lat: -22.6125, lng: -41.9355 },
    { id: 'vila-do-sol',    name: 'Vila do Sol',     meta: 'Entregue · 2024',   lat: -22.6072, lng: -41.9432 },
  ];

  /* ── Dados: Roteiro da Cidade ───────────────────────────── */
  const ROTEIRO = [
    { id: 'lagoa-jacare',  name: 'Lagoa de Jacarepiá',      meta: 'Paisagem natural · Pesca',   lat: -22.6210, lng: -41.9190 },
    { id: 'praia-meio',    name: 'Praia do Meio',            meta: 'Praia urbana · Surf',         lat: -22.6180, lng: -41.9140 },
    { id: 'centro',        name: 'Centro Histórico',         meta: 'Comércio · Restaurantes',    lat: -22.6083, lng: -41.9413 },
    { id: 'rio-sao-joao',  name: 'Rio São João',             meta: 'Caiaque · Natureza',          lat: -22.5950, lng: -41.9360 },
    { id: 'barra-furado',  name: 'Praia de Barra do Furado', meta: 'Kitesurf · Mar aberto',       lat: -22.6280, lng: -41.9050 },
  ];

  let zaydaMap    = null;
  let activeMarkers = [];

  /* Cria o ícone HTML para o marcador */
  function makeIcon(type) {
    return L.divIcon({
      className: '',
      html: `<div class="map-marker-${type}"></div>`,
      iconSize:   [14, 14],
      iconAnchor: [7,  7 ],
    });
  }

  /* Renderiza os cards na listagem esquerda */
  function renderCards(data, group) {
    const listing   = document.getElementById('mapListing');
    const isImovel  = group === 'imoveis';
    const dotClass  = isImovel ? 'imovel' : 'turismo';
    const headerLbl = isImovel ? 'Imóveis Zayda'        : 'Roteiro da Cidade';
    const headerTxt = isImovel ? '4 empreendimentos'    : '5 pontos imperdíveis';

    listing.innerHTML = `
      <div class="map-list-header">
        <span class="label">(${headerLbl})</span>
        <h3 class="map-list-title">${headerTxt}</h3>
      </div>
      ${data.map(d => `
        <div class="map-card" data-lat="${d.lat}" data-lng="${d.lng}">
          <div class="map-card-dot ${dotClass}"></div>
          <div class="map-card-body">
            <div class="map-card-name">${d.name}</div>
            <div class="map-card-meta">${d.meta}</div>
          </div>
          <span class="map-card-arr">→</span>
        </div>
      `).join('')}
    `;

    /* Clique no card → voa até o marcador */
    listing.querySelectorAll('.map-card').forEach(card => {
      card.addEventListener('click', () => {
        const lat = parseFloat(card.dataset.lat);
        const lng = parseFloat(card.dataset.lng);
        zaydaMap.flyTo([lat, lng], 16, { duration: 1.2, easeLinearity: 0.4 });
        listing.querySelectorAll('.map-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });
  }

  /* Remove todos os marcadores ativos do mapa */
  function clearMarkers() {
    activeMarkers.forEach(m => zaydaMap.removeLayer(m));
    activeMarkers = [];
  }

  /* Adiciona marcadores e tooltip ao mapa */
  function addMarkers(data, type) {
    data.forEach(d => {
      const m = L.marker([d.lat, d.lng], { icon: makeIcon(type) })
        .addTo(zaydaMap)
        .bindTooltip(d.name, {
          permanent:  false,
          direction:  'top',
          offset:     [0, -12],
          className:  'map-tooltip',
        });
      activeMarkers.push(m);
    });
  }

  /* Alterna entre os dois grupos de conteúdo */
  function switchGroup(group) {
    const data = group === 'imoveis' ? IMOVEIS : ROTEIRO;
    const type = group === 'imoveis' ? 'imoveis' : 'turismo';

    document.getElementById('togImoveis').classList.toggle('active', group === 'imoveis');
    document.getElementById('togRoteiro').classList.toggle('active', group === 'roteiro');

    clearMarkers();
    addMarkers(data, type);
    renderCards(data, group);
    zaydaMap.flyTo(MAP_CENTER, MAP_ZOOM, { duration: 0.9 });
  }

  /* Inicializa o mapa (chamado apenas uma vez, lazily) */
  function initMap() {
    if (zaydaMap) {
      zaydaMap.invalidateSize(); // corrige tiles ao exibir novamente
      return;
    }

    zaydaMap = L.map('zaydaMap', {
      center:           MAP_CENTER,
      zoom:             MAP_ZOOM,
      zoomControl:      false,   // vamos reposicionar
      scrollWheelZoom:  false,   // evita capturar scroll da página
    });

    /* Tiles CartoDB Positron — visual minimalista, sem API key */
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains:  'abcd',
      maxZoom:     19,
    }).addTo(zaydaMap);

    /* Controles de zoom reposicionados no canto inferior direito */
    L.control.zoom({ position: 'bottomright' }).addTo(zaydaMap);

    /* Ativa scroll wheel após clicar no mapa (UX: evita scroll acidental) */
    zaydaMap.on('click', () => zaydaMap.scrollWheelZoom.enable());
    zaydaMap.on('mouseout', () => zaydaMap.scrollWheelZoom.disable());

    /* Estado inicial: imóveis */
    switchGroup('imoveis');

    /* Botões do widget bento box */
    document.getElementById('togImoveis').addEventListener('click', () => switchGroup('imoveis'));
    document.getElementById('togRoteiro').addEventListener('click', () => switchGroup('roteiro'));
  }

  /* Inicialização lazy: só quando a página "sobre" ficar ativa */
  new MutationObserver(() => {
    if (sobrePage.classList.contains('active')) setTimeout(initMap, 80);
  }).observe(sobrePage, { attributes: true, attributeFilter: ['class'] });

  /* Caso a página já esteja ativa ao carregar (URL direta #sobre) */
  if (sobrePage.classList.contains('active')) setTimeout(initMap, 80);
})();

/* ============================================================
   GLOSSÁRIO TÁTIL — tooltip de textura que segue o cursor
   Funciona em qualquer página: basta adicionar a classe
   "tactile-word" e o atributo data-material-img="caminho.jpg"
   em qualquer <span> ou <em> do HTML.
============================================================ */
(function () {
  const tip    = document.getElementById('tactile-tip');
  const tipImg = document.getElementById('tactile-tip-img');
  if (!tip) return;

  let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
  const LERP = 0.11;
  const OX = 22;   /* offset horizontal à direita do cursor */
  const OY = -110; /* offset vertical — acima do cursor     */

  function tick() {
    cx += (tx - cx) * LERP;
    cy += (ty - cy) * LERP;
    const vw = window.innerWidth, vh = window.innerHeight;
    const x = Math.min(cx + OX, vw - 150 - 16);
    const y = Math.max(Math.min(cy + OY, vh - 100 - 16), 16);
    tip.style.transform = `translate(${x}px,${y}px)`;
    raf = requestAnimationFrame(tick);
  }

  document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });

  document.querySelectorAll('.tactile-word[data-material-img]').forEach(word => {
    word.addEventListener('mouseenter', () => {
      tipImg.src = word.dataset.materialImg;
      tip.classList.add('visible');
      if (!raf) raf = requestAnimationFrame(tick);
    });
    word.addEventListener('mouseleave', () => {
      tip.classList.remove('visible');
      cancelAnimationFrame(raf);
      raf = null;
    });
  });
})();

/* ============================================================
   MARGINALIA — Side Drawer de Referências
   Para adicionar uma nota: crie um botão no HTML com
   class="ref-btn" data-ref="ref-N" e adicione o objeto
   correspondente no REFS abaixo.
============================================================ */
(function () {
  const drawer   = document.getElementById('side-drawer');
  const overlay  = document.getElementById('side-drawer-overlay');
  const closeBtn = document.getElementById('side-drawer-close');
  const content  = document.getElementById('side-drawer-content');
  if (!drawer) return;

  /* ── Banco de referências — adicione ou edite aqui ──────── */
  const REFS = {
    'ref-1': {
      num:   'Nota 01',
      title: 'Roger Ulrich, 1984 — Science',
      body:  'Ulrich, R.S. (1984). <em>"View Through a Window May Influence Recovery from Surgery."</em> Science, 224(4647), 420–421. O estudo acompanhou 46 pacientes cirúrgicos ao longo de 9 anos. Os pacientes com vista para a natureza precisaram de <strong>menos analgésicos potentes</strong> e receberam alta 7,96% mais cedo em média.'
    },
    'ref-2': {
      num:   'Nota 02',
      title: 'Travertino — Propriedades Térmicas',
      body:  'Aproximadamente <strong>100.000 m³ de travertino</strong> foram utilizados na construção do Coliseu, extraídos das pedreiras de Tivoli. O travertino romano tem coeficiente de condutividade térmica entre 0,65 e 0,72 W/(m·K), tornando-o naturalmente regulador de temperatura em climas mediterrâneos e subtropicais.'
    },
    'ref-3': {
      num:   'Nota 03',
      title: 'Shou Sugi Ban — Yakisugi (焼き杉)',
      body:  'Técnica desenvolvida no Japão durante o período Edo (1603–1868). A carbonização superficial cria uma camada de carbono que <strong>repele água, insetos e raios UV</strong>, aumentando a vida útil da madeira em até 5× comparada à madeira não tratada. Hoje especificada por escritórios em Oslo, São Paulo e Los Angeles como "inovação sustentável".'
    },
    'ref-4': {
      num:   'Nota 04',
      title: 'Grande Zimbábue — Séc. XI–XV',
      body:  'Complexo edificado pelo povo Shona usando <strong>encaixe gravitacional de granito</strong>, sem argamassa de qualquer tipo. A Grande Muralha atinge 11 metros de altura e 5 metros de espessura em alguns pontos. A estrutura permanece estável após mais de 700 anos — superando em longevidade a maioria das construções modernas.'
    },
    'ref-5': {
      num:   'Nota 05',
      title: 'Cortisol, Ondas Alfa e Materiais Naturais',
      body:  'Estudos de neuroimagem documentaram reduções de <strong>12–15% nos níveis de cortisol salivar</strong> após 20 minutos em ambientes com materiais naturais visíveis. A atividade das ondas alfa — indicadora de relaxamento cognitivo — aumentou em média 11% em interiores com madeira visível versus interiores de acabamento sintético equivalente.'
    }
  };
  /* ──────────────────────────────────────────────────────── */

  function openDrawer(refId) {
    const ref = REFS[refId];
    if (!ref) return;
    content.innerHTML = `
      <span class="sd-num">${ref.num}</span>
      <h3 class="sd-title">${ref.title}</h3>
      <p class="sd-body">${ref.body}</p>
    `;
    drawer.classList.add('active');
    overlay.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer() {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
  }

  /* Delega o clique — funciona mesmo com conteúdo injetado dinamicamente */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.ref-btn');
    if (btn) { e.stopPropagation(); openDrawer(btn.dataset.ref); }
  });

  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
})();

/* ============================================================
   LIGHTBOX — galeria Cloudinary
   Clique em qualquer .emp-cloud-item img para abrir.
   Navegar: ‹ › ou teclas ← →  |  Fechar: × ou Esc ou clique fora
============================================================ */
(function () {
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lbImg');
  const lbClose = document.getElementById('lbClose');
  const lbPrev  = document.getElementById('lbPrev');
  const lbNext  = document.getElementById('lbNext');
  const lbCount = document.getElementById('lbCounter');
  if (!lb) return;

  let imgs = [], cur = 0;

  function show(index) {
    cur = (index + imgs.length) % imgs.length;
    lbImg.style.opacity = '0';
    setTimeout(() => {
      lbImg.src = imgs[cur];
      lbImg.style.opacity = '1';
    }, 160);
    lbCount.textContent = `${cur + 1} / ${imgs.length}`;
  }

  function open(srcs, index) {
    imgs = srcs; show(index);
    lb.classList.add('active');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lb.classList.remove('active');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* Galeria Cloudinary dinâmica */
  document.addEventListener('click', e => {
    const img = e.target.closest('.emp-cloud-item img');
    if (!img) return;
    const all = Array.from(document.querySelectorAll('.emp-cloud-item img'));
    open(all.map(i => i.src), all.indexOf(img));
  });

  /* Galeria estática (4 células do empreendimento) */
  document.addEventListener('click', e => {
    const img = e.target.closest('.emp-g-cell img');
    if (!img) return;
    const all = Array.from(document.querySelectorAll('.emp-g-cell img'));
    open(all.map(i => i.src), all.indexOf(img));
  });

  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', () => show(cur - 1));
  lbNext.addEventListener('click', () => show(cur + 1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('active')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
})();

/* ============================================================
   VIDEO COVER — Artigo "O Concreto Aprendeu a Se Curar Sozinho"
   Busca o vídeo pela tag blog-video-mit no Cloudinary e injeta
   um <video> autoplay no card do blog no lugar do image-slot.
============================================================ */
(function () {
  const slotCard   = document.getElementById('slot-blog-concreto');
  const slotCover  = document.getElementById('slot-artigo-concreto');
  if (!slotCard && !slotCover) return;

  fetch('https://res.cloudinary.com/dovqcebdt/video/list/blog-video-mit.json')
    .then(r => r.ok ? r.json() : Promise.reject('Resource List inativa'))
    .then(data => {
      if (!data.resources || !data.resources.length) return;
      const r   = data.resources[0];
      const url = `https://res.cloudinary.com/dovqcebdt/video/upload/f_auto,q_auto/${r.public_id}.mp4`;

      /* Cria um elemento <video> configurado para cada slot */
      function makeVid(cover) {
        const vid = document.createElement('video');
        vid.src         = url;
        vid.autoplay    = true;
        vid.muted       = true;
        vid.loop        = true;
        vid.playsInline = true;
        vid.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        return vid;
      }

      if (slotCard)  slotCard.replaceWith(makeVid());
      if (slotCover) slotCover.replaceWith(makeVid());
    })
    .catch(err => console.warn('[Blog video]', err));
})();

/* ============================================================
   POI FILTER — Onde fica (Turísticos / Importantes)
============================================================ */
document.addEventListener('click', e => {
  const tog = e.target.closest('.poi-tog');
  if (!tog) return;
  const group = tog.dataset.poi;
  tog.closest('.poi-filter').querySelectorAll('.poi-tog').forEach(b => b.classList.remove('active'));
  tog.classList.add('active');
  document.querySelectorAll('.poi-list').forEach(l => {
    l.style.display = l.id === `poi-${group}` ? '' : 'none';
  });
});
