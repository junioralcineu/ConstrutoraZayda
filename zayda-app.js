/* ============================================================
   INTRO SCREEN — loading com contador easeOut
   Roda uma única vez no carregamento inicial.
   Remove o elemento do DOM ao terminar (não repete em navegação SPA).
============================================================ */
(function () {
  const intro    = document.getElementById('introScreen');
  const counter  = document.getElementById('introCounter');
  const lineFill = document.getElementById('introLineFill');
  if (!intro) return;

  const DURATION = 1800; /* ms totais do contador            */
  const HOLD     = 180;  /* pausa em 100 antes de sair       */
  const start    = performance.now();

  /* Quad ease-out: rápido no começo, suave no final */
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }

  function tick(now) {
    const t     = Math.min((now - start) / DURATION, 1);
    const count = Math.round(easeOut(t) * 100);

    if (counter)  counter.textContent  = String(count).padStart(2, '0');
    if (lineFill) lineFill.style.width = count + '%';

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      /* Contador chegou a 100 → pequena pausa → desliza para fora */
      setTimeout(() => {
        intro.classList.add('exit');
        /* Anima o texto da hero enquanto a intro desliza para fora */
        setTimeout(() => {
          document.querySelector('.hero-viewport')?.classList.add('hero-animate');
        }, 180);
        intro.addEventListener('transitionend', () => intro.remove(), { once: true });
      }, HOLD);
    }
  }

  requestAnimationFrame(tick);
})();

/* Dimensões do viewport em cache — lidas no resize, usadas em rAF sem causar reflow */
let _vw = window.innerWidth, _vh = window.innerHeight;
window.addEventListener('resize', () => { _vw = window.innerWidth; _vh = window.innerHeight; }, { passive: true });

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

  /* Áudio do blog: toca no instante em que o veil começa a subir */
  if (route === 'blog' && !sessionStorage.getItem('blog-audio')) {
    sessionStorage.setItem('blog-audio', '1');
    new Audio('https://res.cloudinary.com/dovqcebdt/video/upload/v1779393800/sound_effect_gdl5bo.mp4')
      .play().catch(() => {});
  }

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
const jnCats  = document.querySelectorAll('.jn-cat');
const jnPosts = document.querySelectorAll('#jnGrid .jn-post');
jnCats.forEach(btn => {
  btn.addEventListener('click', () => {
    jnCats.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    let shown = 0;
    jnPosts.forEach(p => {
      const match = cat === 'all' || p.dataset.cat === cat;
      p.style.display = match ? '' : 'none';
      if (match) shown++;
    });
    const empty = document.getElementById('jnEmpty');
    if (empty) empty.style.display = shown === 0 ? '' : 'none';
  });
});
document.getElementById('jnReset')?.addEventListener('click', () => {
  jnCats.forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
  jnPosts.forEach(p => p.style.display = '');
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
  const LERP  = 0.14;
  const OFFSET_X =  28;
  const OFFSET_Y = -50;

  /* Dimensões do preview em cache — ResizeObserver evita leitura de offsetWidth/Height por frame */
  let ndcpW = 0, ndcpH = 0;
  new ResizeObserver(([e]) => { ndcpW = e.contentRect.width; ndcpH = e.contentRect.height; }).observe(ndcp);

  /* ── Animação de posição com interpolação linear ── */
  function tick() {
    curX += (targetX - curX) * LERP;
    curY += (targetY - curY) * LERP;

    const x = Math.min(curX + OFFSET_X, _vw - ndcpW - 16);
    const y = Math.max(Math.min(curY + OFFSET_Y, _vh - ndcpH - 16), 16);

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
  }, { passive: true });

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
document.getElementById('openContactFooter')?.addEventListener('click', openContact);
document.getElementById('ctaContact')?.addEventListener('click', openContact);
document.getElementById('closeModal').addEventListener('click', closeContact);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeContact(); });

function updateStep() {
  steps.forEach(s => s.classList.toggle('active', +s.dataset.step === stepN));
  stepIdx.textContent = `(0${stepN}/0${total})`;
  backBtn.disabled = stepN === 1;
  nextBtn.textContent = stepN === total ? 'Enviar →' : 'Próximo →';
}

/* Validação do Step 1 */
function validateStep1() {
  const nome  = document.getElementById('fNome');
  const email = document.getElementById('fEmail');
  const phone = document.getElementById('phoneInput');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  let ok = true;

  function check(input, errId, condition) {
    const err = document.getElementById(errId);
    if (condition) {
      input.classList.add('invalid');
      err.classList.add('visible');
      ok = false;
    } else {
      input.classList.remove('invalid');
      err.classList.remove('visible');
    }
  }

  check(nome,  'errNome',  !nome.value.trim() || nome.value.trim().length < 2);
  check(email, 'errEmail', !EMAIL_RE.test(email.value.trim()));
  check(phone, 'errPhone', phone.value && phone.value.replace(/\D/g,'').length < 10);

  return ok;
}

/* Limpa erro ao digitar */
['fNome','fEmail','phoneInput'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => {
    const el = document.getElementById(id);
    el.classList.remove('invalid');
    const errMap = { fNome:'errNome', fEmail:'errEmail', phoneInput:'errPhone' };
    document.getElementById(errMap[id])?.classList.remove('visible');
  });
});

backBtn.addEventListener('click', () => { if (stepN > 1) { stepN--; updateStep(); } });
nextBtn.addEventListener('click', () => {
  if (stepN === 1 && !validateStep1()) return;
  if (stepN === total) {
    const nome   = document.getElementById('fNome').value.trim();
    const email  = document.getElementById('fEmail').value.trim();
    const phone  = document.getElementById('phoneInput').value.trim();
    const brief  = document.querySelector('[name="brief"]')?.value.trim() || '';
    const origem = document.querySelector('[name="origem"]')?.value || '';
    const tipo           = document.querySelector('[data-radio="tipo"] .opt.selected')?.textContent.trim() || 'Não informado';
    const empreendimento = document.querySelector('[data-radio="empreendimento"] .opt.selected')?.textContent.trim() || 'Não informado';
    const orcamento      = document.querySelector('[data-radio="orcamento"] .opt.selected')?.textContent.trim() || 'Não informado';

    nextBtn.disabled = true;
    nextBtn.textContent = 'Enviando…';

    const errBox = document.getElementById('submitError');
    if (errBox) errBox.style.display = 'none';

    fetch('https://formspree.io/f/xwvzqlan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ nome, email, phone, tipo, empreendimento, orcamento, brief, origem })
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) throw new Error(data?.errors?.[0]?.message || 'Erro no envio');

      formInner.style.display = 'none';
      success.classList.add('show');
      stepIdx.textContent = '(enviado)';
    })
    .catch(err => {
      nextBtn.disabled = false;
      nextBtn.textContent = 'Enviar →';
      console.error('Formspree:', err);
      if (errBox) errBox.style.display = 'block';
    });

    return;
  }
  stepN++; updateStep();
});

/* Máscara automática do campo WhatsApp — formato (00) 00000-0000 */
(function () {
  const phone = document.getElementById('phoneInput');
  if (!phone) return;
  phone.addEventListener('input', () => {
    const d = phone.value.replace(/\D/g, '').slice(0, 11);
    if (!d) { phone.value = ''; return; }
    let v = '(' + d.slice(0, 2);
    if (d.length > 2) v += ') ' + d.slice(2, 7);
    if (d.length > 7) v += '-' + d.slice(7);
    phone.value = v;
  });
})();

/* Liquid Glass Select — campo "Como você ouviu falar da gente?" */
(function () {
  const sel = document.getElementById('origemSelect');
  if (!sel) return;
  const trigger  = sel.querySelector('.liq-trigger');
  const valEl    = sel.querySelector('.liq-value');
  const hidden   = sel.querySelector('input[type="hidden"]');

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = sel.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(isOpen));
  });

  sel.querySelectorAll('.liq-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      sel.querySelectorAll('.liq-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      valEl.textContent = opt.dataset.val;
      hidden.value      = opt.dataset.val;
      sel.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    });
  });

  /* Fecha ao clicar fora */
  document.addEventListener('click', () => {
    sel.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  });
})();

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
let _curRaf = null, _curX = 0, _curY = 0;
window.addEventListener('mousemove', e => {
  _curX = e.clientX; _curY = e.clientY;
  if (!_curRaf) _curRaf = requestAnimationFrame(() => {
    cursor.style.transform = `translate(${_curX}px, ${_curY}px) translate(-50%, -50%)`;
    _curRaf = null;
  });
}, { passive: true });
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
const filterChips = document.querySelectorAll('.filters .chip');
const filterObras = document.querySelectorAll('.obra[data-status]');
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const f = chip.dataset.filter;
    filterObras.forEach(o => {
      o.style.display = f === 'all' || o.dataset.status === f ? '' : 'none';
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
tick();
let clockInterval = setInterval(tick, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(clockInterval);
  } else {
    tick();
    clockInterval = setInterval(tick, 30000);
  }
});

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
    tipo:'3 quartos · 1 suíte · cozinha integrada', vagas:'1 vaga por unidade', entrega:'1 ano após contrato', price:'A consultar',
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
    tipo:'2 quartos · 58–72 m²', vagas:'1 vaga por unidade', entrega:'Ago 2026', price:'A consultar'
  },
  'vila-do-sol': {
    name: 'Vila do Sol', label:'(02 · 2024 · Centro)', status:'Pronto pra morar',
    tag:'Quarenta e oito unidades em três blocos baixos, com pátio central arborizado.',
    local:'Estrada do Sana, 1.200 · Barra de São João', units:'48 apartamentos',
    tipo:'2 quartos · 54–66 m²', vagas:'1 vaga por unidade', entrega:'Entregue em Mai 2024', price:'A consultar',
    cloudinaryTag: 'rua-tucunaré-rosangela',
    heroImg: 'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779214464/1-dji_fly_20250818_103402_69_1755526869376_photo_1_qihmg0.jpg'
  },
  'aldeia': {
    name: 'Aldeia', label:'(03 · 2023 · Costa Azul)', status:'Pronto pra morar',
    tag:'Dezoito casas térreas em condomínio fechado, com horta comunitária.',
    local:'Rua Itacolomi, 45 · Costa Azul', units:'18 casas',
    tipo:'3 quartos · 96 m²', vagas:'2 vagas por unidade', entrega:'Entregue em Out 2023', price:'A consultar'
  },
  'atoba': {
    name: 'Atobá', label:'(04 · 2025 · Pescão)', status:'Em obra',
    tag:'Dezesseis unidades pequenas, pensadas para casais e veranistas.',
    local:'Av. dos Pescadores, 220 · Pescão', units:'16 apartamentos',
    tipo:'2 quartos · 52–60 m²', vagas:'1 vaga por unidade', entrega:'Dez 2026', price:'A consultar'
  },
  'manguezal': {
    name: 'Manguezal', label:'(05 · 2022 · Beira-Rio)', status:'Pronto pra morar',
    tag:'Vinte e oito apartamentos de frente para o mangue, com varandas de 12m².',
    local:'Rua do Mangue, 70 · Beira-Rio', units:'28 apartamentos',
    tipo:'2 quartos · 56–68 m²', vagas:'1 vaga por unidade', entrega:'Entregue em Mar 2022', price:'A consultar'
  },
  'costa-verde': {
    name: 'Costa Verde', label:'(06 · 2021 · Praia)', status:'Entregue',
    tag:'Vinte e duas unidades com vista para o mar, em terreno arborizado.',
    local:'Av. Atlântica, 1.800 · Praia', units:'22 apartamentos',
    tipo:'3 quartos · 72–88 m²', vagas:'1 vaga por unidade', entrega:'Entregue em Jul 2021', price:'A consultar',
    cloudinaryTag: 'rua-wellington-borges',
    heroImg: 'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779805184/18-IMG_8471_ujhlw3.jpg'
  },
  'ipanema-do-norte': {
    name: 'Ipanema do Norte', label:'(07 · 2020 · Costa Azul)', status:'Entregue',
    tag:'Quatorze unidades em rua arborizada, a duas quadras do mar.',
    local:'Rua dos Coqueiros, 50 · Costa Azul', units:'14 apartamentos',
    tipo:'2 quartos · 60–74 m²', vagas:'1 vaga por unidade', entrega:'Entregue em Set 2020', price:'A consultar',
    cloudinaryTag: 'rua-badejo-entregue',
    heroImg: 'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779807105/90-IMG_0392_eaozi3.jpg'
  },
  'rua-lambari-juliana': {
    name: 'Rua Lambari', label:'(08 · 2025 · Centro)', status:'Pronto pra morar',
    tag:'Unidades residenciais em uma das ruas mais tranquilas de Barra de São João.',
    local:'Rua Lambari · Centro · Barra de São João', units:'A definir',
    tipo:'2 quartos', vagas:'1 vaga por unidade', entrega:'A definir', price:'A consultar',
    cloudinaryTag: 'rua-lambari-juliana',
    heroImg: 'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779218018/1-dji_fly_20250904_153658_157_1757011027056_photo_fi39ey.jpg'
  },
  'rua-lambari-celia': {
    name: 'Rua Lambari — Célia', label:'(09 · 2025 · Centro)', status:'Pronto pra morar',
    tag:'Unidades residenciais em uma das ruas mais tranquilas de Barra de São João.',
    local:'Rua Lambari · Centro · Barra de São João', units:'A definir',
    tipo:'2 quartos', vagas:'1 vaga por unidade', entrega:'A definir', price:'A consultar',
    cloudinaryTag: 'rua-lambari-célia',
    heroImg: 'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779291711/IMG_0148_bupo8n.jpg'
  },
  'rua-lambari-andreia': {
    name: 'Rua Lambari — Andréia', label:'(10 · 2025 · Centro)', status:'Pronto pra morar',
    tag:'Unidades residenciais em uma das ruas mais tranquilas de Barra de São João.',
    local:'Rua Lambari · Centro · Barra de São João', units:'A definir',
    tipo:'2 quartos', vagas:'1 vaga por unidade', entrega:'A definir', price:'A consultar',
    cloudinaryTag: 'rua-lambari-andreia',
    heroImg: 'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779294999/IMG_1850_1_qmpqlz.jpg'
  },
  'rua-lambari-carla': {
    name: 'Rua Lambari — Carla', label:'(11 · 2025 · Centro)', status:'Pronto pra morar',
    tag:'Unidades residenciais em uma das ruas mais tranquilas de Barra de São João.',
    local:'Rua Lambari · Centro · Barra de São João', units:'A definir',
    tipo:'2 quartos', vagas:'1 vaga por unidade', entrega:'A definir', price:'A consultar',
    cloudinaryTag: 'rua-lambari-carla',
    heroImg: 'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779303180/IMG_4185_ew9ihu.jpg'
  }
};

/* ── Paginação da grade de empreendimentos ── */
const EMP_PAGE_SIZE = 6;
let empPage = 0;

function renderEmpPage() {
  const activeFilter = document.querySelector('.filters .chip.active')?.dataset.filter;
  const nav = document.querySelector('.emp-nav');
  if (activeFilter !== 'all') {
    if (nav) nav.style.display = 'none';
    return;
  }
  const cards = Array.from(document.querySelectorAll('#empGrid .obra'));
  const totalPages = Math.ceil(cards.length / EMP_PAGE_SIZE);
  cards.forEach((card, i) => {
    card.style.display = (i >= empPage * EMP_PAGE_SIZE && i < (empPage + 1) * EMP_PAGE_SIZE) ? '' : 'none';
  });
  if (nav) {
    nav.style.display = totalPages <= 1 ? 'none' : '';
    const prevBtn = document.getElementById('empNavPrev');
    const nextBtn = document.getElementById('empNavNext');
    const counter = document.getElementById('empNavCounter');
    if (prevBtn) prevBtn.disabled = empPage === 0;
    if (nextBtn) nextBtn.disabled = empPage >= totalPages - 1;
    if (counter) counter.textContent = `${empPage + 1} / ${totalPages}`;
  }
}

document.getElementById('empNavPrev')?.addEventListener('click', () => {
  if (empPage > 0) { empPage--; renderEmpPage(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});
document.getElementById('empNavNext')?.addEventListener('click', () => {
  const total = Math.ceil(document.querySelectorAll('#empGrid .obra').length / EMP_PAGE_SIZE);
  if (empPage < total - 1) { empPage++; renderEmpPage(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});

/* Reset página ao trocar filtro */
document.querySelectorAll('.filters .chip').forEach(chip => {
  chip.addEventListener('click', () => { empPage = 0; setTimeout(renderEmpPage, 70); });
});
document.getElementById('empReset')?.addEventListener('click', () => { empPage = 0; setTimeout(renderEmpPage, 70); });

renderEmpPage();

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
      /* Lazy video: carrega src se ainda não foi carregado */
      if (v.dataset.src && !v.getAttribute('src')) {
        v.src = v.dataset.src;
        v.load();
      }
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

/* Pré-carrega thumbnails do grid para projetos com cloudinaryTag */
document.querySelectorAll('.obra[data-emp]').forEach(card => {
  const imgEl = card.querySelector('[data-cloud-thumb]');
  if (!imgEl) return;
  const d = EMP_DATA[card.dataset.emp];
  if (!d?.cloudinaryTag) return;
  fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${d.cloudinaryTag}.json`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data?.resources?.[0]) {
        imgEl.src = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_900,f_auto,q_auto/${data.resources[0].public_id}`;
      }
    })
    .catch(() => {});
});

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
   LAZY VIDEO LOADER — Intersection Observer
   Carrega o .mp4 real apenas quando o vídeo estiver a 300px
   de entrar na viewport. preload="none" + poster garantem
   que nenhum byte de vídeo seja baixado antes disso.
============================================================ */
(function () {
  function activateVideo(vid) {
    const src = vid.dataset.src;
    if (!src || vid.getAttribute('src')) return;
    vid.src = src;
    vid.load();
    vid.play().catch(() => {});
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      activateVideo(entry.target);
      obs.unobserve(entry.target);
    });
  }, {
    rootMargin: '300px 0px', /* dispara 300px antes do vídeo entrar na tela */
    threshold:  0
  });

  /* Vídeos já presentes no DOM ao carregar a página */
  document.querySelectorAll('video.lazy-video').forEach(v => observer.observe(v));

  /* Pausa vídeos que saem do viewport — economiza CPU e bateria */
  const pauseObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const v = entry.target;
      if (!v.getAttribute('src')) return; /* ainda não carregado */
      entry.isIntersecting ? v.play().catch(() => {}) : v.pause();
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('video.lazy-video').forEach(v => pauseObserver.observe(v));

  /* Vídeos injetados dinamicamente (blog, galeria, etc.) */
  new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'VIDEO' && node.classList.contains('lazy-video')) {
          observer.observe(node);
          pauseObserver.observe(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll('video.lazy-video').forEach(v => {
            observer.observe(v);
            pauseObserver.observe(v);
          });
        }
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  window._lazyVideoObserver = observer;
})();

/* ============================================================
   HERO WIDGETS — deck empilhado
   · Aparece apenas enquanto a hero (.hero-viewport) está visível
   · Clique no deck → abre/fecha o card de baixo
   · Clique num link dentro do card aberto → navega normalmente
   · Aparece após a intro screen terminar
============================================================ */
(function () {
  const stack = document.getElementById('heroWidgets');
  const deck  = document.getElementById('hwDeck');
  const hero  = document.querySelector('.hero-viewport');
  if (!stack || !deck) return;

  /* Pré-cacheia a altura do card da frente — ResizeObserver evita offsetHeight no click */
  let _frontCardH = 88;
  const frontCard = deck.querySelector('.hw-card:nth-child(1)');
  if (frontCard) {
    new ResizeObserver(([e]) => { _frontCardH = e.contentRect.height; }).observe(frontCard);
  }

  /* Toggle do deck ao clicar (ignora cliques em links filhos) */
  deck.addEventListener('click', e => {
    if (e.target.closest('a')) return;
    const isOpen = !deck.classList.contains('open');
    if (isOpen) deck.style.setProperty('--card-h', _frontCardH + 'px');
    deck.classList.toggle('open', isOpen);
    deck.setAttribute('aria-expanded', String(isOpen));
  });

  /* Visibilidade: só mostra enquanto a hero está na viewport */
  function setVisible(show) {
    stack.classList.toggle('visible', show);
    if (!show) {
      deck.classList.remove('open');
      deck.setAttribute('aria-expanded', 'false');
    }
  }

  if (hero) {
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 } /* some quando 85% da hero saiu de cena */
    );
    obs.observe(hero);
  }

  /* Aparece após a intro screen ser removida do DOM — IntersectionObserver já controla visibilidade */
  function revealWidgets() { setTimeout(() => setVisible(true), 400); }

  const introEl = document.getElementById('introScreen');
  if (introEl) {
    new MutationObserver((_, obs) => {
      if (!document.getElementById('introScreen')) {
        obs.disconnect();
        revealWidgets();
      }
    }).observe(document.body, { childList: true });
  } else {
    revealWidgets();
  }
})();

/* ============================================================
   NAV TRANSPARENTE NA HERO — torna sólida ao rolar
   Transparente apenas na home (inicio) enquanto o hero estiver
   visível. Em qualquer outra página fica sempre sólida.
============================================================ */
(function () {
  const nav = document.getElementById('nav');
  if (!nav) return;

  const THRESHOLD = 0.80; /* % do viewport height para acionar */

  function updateNav() {
    const isHome   = document.querySelector('.page[data-page="inicio"]')
                       ?.classList.contains('active') ?? false;
    const pastHero = window.scrollY > _vh * THRESHOLD;
    nav.classList.toggle('nav--scrolled', !isHome || pastHero);
  }

  /* Atualiza no scroll com rAF para não executar mais de 1x por frame */
  let _navRaf = false;
  window.addEventListener('scroll', () => {
    if (_navRaf) return;
    _navRaf = true;
    requestAnimationFrame(() => { updateNav(); _navRaf = false; });
  }, { passive: true });

  /* Atualiza quando a página "inicio" ganha ou perde a classe active */
  const inicioPage = document.querySelector('.page[data-page="inicio"]');
  if (inicioPage) {
    new MutationObserver(updateNav)
      .observe(inicioPage, { attributes: true, attributeFilter: ['class'] });
  }

  updateNav(); /* estado inicial */
})();

/* ============================================================
   WORKS PREVIEW — cursor-following para a lista "Em destaque"
   Mesmo mecanismo LERP do preview da navbar, elemento separado.
============================================================ */
(function () {
  const wp    = document.getElementById('worksPreview');
  const wpImg = document.getElementById('worksPreviewImg');
  if (!wp) return;

  let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
  const LERP = 0.12, OX = 28, OY = -100;

  function tick() {
    cx += (tx - cx) * LERP;
    cy += (ty - cy) * LERP;
    const w = 300, h = 188; /* 16:10 */
    const x = Math.min(cx + OX, _vw - w - 16);
    const y = Math.max(Math.min(cy + OY, _vh - h - 16), 16);
    wp.style.transform = `translate(${x}px, ${y}px)`;
    raf = requestAnimationFrame(tick);
  }

  document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });

  document.querySelectorAll('.work-item[data-work-img]').forEach(item => {
    item.addEventListener('mouseenter', () => {
      const src = item.dataset.workImg;
      if (!src) return;
      wpImg.src = src;
      wp.classList.add('visible');
      if (!raf) raf = requestAnimationFrame(tick);
    });
    item.addEventListener('mouseleave', () => {
      wp.classList.remove('visible');
      cancelAnimationFrame(raf);
      raf = null;
    });
  });
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
    const x = Math.min(cx + OX, _vw - 150 - 16);
    const y = Math.max(Math.min(cy + OY, _vh - 100 - 16), 16);
    tip.style.transform = `translate(${x}px,${y}px)`;
    raf = requestAnimationFrame(tick);
  }

  document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });

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
  const slotCard  = document.getElementById('slot-blog-concreto');
  const slotCover = document.getElementById('slot-artigo-concreto');
  if (!slotCard && !slotCover) return;

  fetch('https://res.cloudinary.com/dovqcebdt/video/list/blog-video-mit.json')
    .then(r => r.ok ? r.json() : Promise.reject('Resource List inativa'))
    .then(data => {
      if (!data.resources || !data.resources.length) return;
      const r   = data.resources[0];
      const url       = `https://res.cloudinary.com/dovqcebdt/video/upload/f_auto,q_auto/${r.public_id}.mp4`;
      const posterUrl = `https://res.cloudinary.com/dovqcebdt/video/upload/so_0,f_auto,q_auto,w_800/${r.public_id}.jpg`;

      /* Cria um elemento <video> lazy — src só carrega ao entrar na viewport */
      function makeVid() {
        const vid = document.createElement('video');
        vid.className     = 'lazy-video';
        vid.poster        = posterUrl;      /* placeholder instantâneo */
        vid.dataset.src   = url;            /* src real carregado pelo IntersectionObserver */
        vid.preload       = 'none';
        vid.muted         = true;
        vid.loop          = true;
        vid.playsInline   = true;
        vid.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        if (window._lazyVideoObserver) window._lazyVideoObserver.observe(vid);
        return vid;
      }

      if (slotCard)  slotCard.replaceWith(makeVid());
      if (slotCover) slotCover.replaceWith(makeVid());
    })
    .catch(err => console.warn('[Blog video]', err));
})();

/* ── Rotação diária do destaque — Zayda Journal na home ─────
   Troca 1× por dia. Para adicionar artigo: inclua um objeto
   no array HOME_POSTS e republique.
──────────────────────────────────────────────────────────── */
(function () {
  const HOME_POSTS = [
    { route:'artigo-materiais',        cat:'Arquitetura',          title:'Pedra. Madeira. Luz. O que cinco mil anos de arquitetura tentam nos dizer.',  excerpt:'Cada material carrega milênios de acertos e erros. Uma leitura sobre o que nos ensinaram o tijolo, a pedra e a madeira.',                           img:'https://res.cloudinary.com/dovqcebdt/image/upload/w_1200,f_auto,q_auto/v1779713431/a921ee246879721.69d36fc149dfc_ptqgn5.webp' },
    { route:'artigo-bem-estar',        cat:'Bem Estar',            title:'Bem-Estar Não É Um Cômodo.',                                                   excerpt:'Espaços que geram conforto real não surgem de um projeto de interiores. Surgem de decisões tomadas antes de colocar a primeira pedra.',          img:'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779219813/ec7a05240187127.693942248159b_fat1nk.webp' },
    { route:'artigo-impermeabilizacao',cat:'Tecnologia',           title:'O Que Acontece com Sua Obra Quando Chove.',                                    excerpt:'60% das patologias em edificações têm origem na água. Não é azar — é decisão de projeto.',                                                       img:'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779288159/3e1011226538547.68375be87851c_tknnxq.webp' },
    { route:'artigo-luz',              cat:'Bem Estar',            title:'Sua Casa Sabe Que Horas São?',                                                  excerpt:'A orientação solar de um dormitório afeta seu sono mais do que qualquer colchão.',                                                               img:'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779288889/6f1ff9236946593.68f6bff40df3d_o11lwi.webp' },
    { route:'artigo-cozinha',          cat:'Arquitetura',          title:'A Cozinha Virou Outra Coisa.',                                                  excerpt:'De laboratório de eficiência a centro arquitetônico — e o que essa virada exige da obra.',                                                      img:'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779293264/dbaf04248279303.69ee25a666e7d_e46wsc.webp' },
    { route:'artigo-metros',           cat:'Mercado',              title:'Por Que os Imóveis Mais Caros do Mundo São Menores.',                           excerpt:'Em Monaco, €1 milhão compra menos de 20m². O que o mercado global já entendeu sobre valor e densidade urbana.',                                  img:'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779300854/15__Tuca_Rein%C3%A9s_trvbmq.jpg' },
    { route:'artigo-giverny',          cat:'Jardins e Paisagismo', title:'O Jardim Que Ele Construiu Antes de Pintar.',                                   excerpt:'Monet levou 43 anos construindo Giverny. A obra mais importante que ele criou nunca apareceu em uma moldura.',                                  img:'https://res.cloudinary.com/dovqcebdt/image/upload/f_auto,q_auto,w_1200/v1779388716/the_japanese_footbridge_1992.9.1_gaozko.jpg' },
  ];

  const post = HOME_POSTS[Math.floor(Date.now() / 86400000) % HOME_POSTS.length];
  const href = '#' + post.route;

  const linkTop = document.getElementById('bpFeatLinkTop');
  if (!linkTop) return;
  linkTop.href = href; linkTop.dataset.route = post.route;

  const linkBot = document.getElementById('bpFeatLinkBot');
  if (linkBot) { linkBot.href = href; linkBot.dataset.route = post.route; }

  const img = document.getElementById('bpFeatImg');
  if (img) { img.src = post.img; img.alt = post.title; }

  const cat     = document.getElementById('bpFeatCat');
  const title   = document.getElementById('bpFeatTitle');
  const excerpt = document.getElementById('bpFeatExcerpt');
  if (cat)     cat.textContent     = post.cat;
  if (title)   title.textContent   = post.title;
  if (excerpt) excerpt.textContent = post.excerpt;
})();

/* ── Rotação diária do artigo em destaque no blog ────────────
   Troca 1× por dia. Para adicionar artigo: inclua um objeto
   no array FEATURED_POSTS.
──────────────────────────────────────────────────────────── */
(function () {
  const POSTS = [
    { route:'artigo-materiais',        cat:'Arquitetura',          date:'12 mai 2026', read:'13 min', title:'Pedra. Madeira. Luz. O que cinco mil anos de arquitetura tentam nos dizer.',  img:'https://res.cloudinary.com/dovqcebdt/image/upload/w_1200,f_auto,q_auto/v1779713431/a921ee246879721.69d36fc149dfc_ptqgn5.webp' },
    { route:'artigo-bem-estar',        cat:'Bem Estar',            date:'19 mai 2026', read:'12 min', title:'Bem-Estar Não É Um Cômodo.',                                                   img:'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779219813/ec7a05240187127.693942248159b_fat1nk.webp' },
    { route:'artigo-impermeabilizacao',cat:'Tecnologia',           date:'02 jun 2026', read:'13 min', title:'O Que Acontece com Sua Obra Quando Chove.',                                    img:'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779288159/3e1011226538547.68375be87851c_tknnxq.webp' },
    { route:'artigo-luz',              cat:'Bem Estar',            date:'09 jun 2026', read:'14 min', title:'Sua Casa Sabe Que Horas São?',                                                 img:'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779288889/6f1ff9236946593.68f6bff40df3d_o11lwi.webp' },
    { route:'artigo-cozinha',          cat:'Arquitetura',          date:'16 jun 2026', read:'12 min', title:'A Cozinha Virou Outra Coisa.',                                                  img:'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779293264/dbaf04248279303.69ee25a666e7d_e46wsc.webp' },
    { route:'artigo-metros',           cat:'Mercado',              date:'23 jun 2026', read:'13 min', title:'Por Que os Imóveis Mais Caros do Mundo São Menores.',                           img:'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto/f_auto/v1779300854/15__Tuca_Rein%C3%A9s_trvbmq.jpg' },
    { route:'artigo-giverny',          cat:'Jardins e Paisagismo', date:'07 jul 2026', read:'11 min', title:'O Jardim Que Ele Construiu Antes de Pintar.',                                   img:'https://res.cloudinary.com/dovqcebdt/image/upload/f_auto,q_auto,w_1200/v1779388716/the_japanese_footbridge_1992.9.1_gaozko.jpg' },
  ];

  const link = document.querySelector('.jnf-post');
  if (!link) return;

  const post = POSTS[Math.floor(Date.now() / 86400000) % POSTS.length];
  link.href = '#' + post.route;
  link.dataset.route = post.route;

  const img = link.querySelector('.jnf-media img');
  if (img) { img.src = post.img; img.alt = post.title; }
  const q = s => link.querySelector(s);
  if (q('.jn-tag'))   q('.jn-tag').textContent   = post.cat;
  if (q('.jn-date'))  q('.jn-date').textContent  = post.date;
  if (q('.jn-read'))  q('.jn-read').textContent  = post.read + ' de leitura';
  if (q('.jnf-title'))q('.jnf-title').textContent = post.title;
})();

/* ============================================================
   INTERACTIVE FRAME — Giverny
   · Timer 5s → expansão gradual da capa para ~tela cheia
   · offsetHeight força reflow entre "de" e "para" → transição
   · Pins e tooltip injetados por JS
============================================================ */
(function () {
  const cover    = document.getElementById('givernyCover');
  const wrap     = document.getElementById('givernyWrap');
  const img      = document.getElementById('givernyImg');
  const backdrop = document.getElementById('givernyBackdrop');
  if (!cover || !wrap || !img || !backdrop) return;

  const T_OPEN  = 'top 1.1s cubic-bezier(0.16,1,0.3,1), left 1.1s cubic-bezier(0.16,1,0.3,1), width 1.1s cubic-bezier(0.16,1,0.3,1), height 1.1s cubic-bezier(0.16,1,0.3,1)';
  const T_CLOSE = 'top 0.65s cubic-bezier(0.4,0,0.2,1), left 0.65s cubic-bezier(0.4,0,0.2,1), width 0.65s cubic-bezier(0.4,0,0.2,1), height 0.65s cubic-bezier(0.4,0,0.2,1)';

  const PINS = [
    { top:'42%', left:'50%', label:'A ponte como moldura',  text:'O arco não leva a lugar nenhum — ele transforma o que está além em um quadro dentro do quadro. Monet usou a geometria da madeira para enquadrar o caos orgânico da vegetação.' },
    { top:'73%', left:'32%', label:'Os nenúfares e a água', text:'As pinceladas verticais recusam qualquer horizonte claro: é impossível separar o céu do lago. A água não reflete — dissolve. Duas superfícies tornam-se uma só.' },
    { top:'20%', left:'68%', label:'O peso do verde',       text:'A folhagem não representa folhas — representa a experiência de estar sob elas. O verde não é uma cor aqui; é uma temperatura, um volume, um peso sobre quem passa.' },
  ];

  /* Injeção de tooltip e pins */
  const tooltip = document.createElement('div');
  tooltip.className = 'frame-tooltip';
  tooltip.innerHTML = '<p class="ft-label"></p><p class="ft-body"></p>';
  cover.appendChild(tooltip);

  PINS.forEach(pin => {
    const btn = document.createElement('button');
    btn.className = 'hotspot-pin';
    btn.style.top  = pin.top;
    btn.style.left = pin.left;
    btn.setAttribute('aria-label', pin.label);
    cover.appendChild(btn);
    btn.addEventListener('pointerenter', e => {
      e.stopPropagation();
      img.style.transformOrigin = `${parseFloat(pin.left)}% ${parseFloat(pin.top)}%`;
      img.style.transform = 'scale(2.5)';
      tooltip.querySelector('.ft-label').textContent = pin.label;
      tooltip.querySelector('.ft-body').textContent  = pin.text;
      tooltip.classList.add('visible');
    });
    btn.addEventListener('pointerleave', () => {
      img.style.transform = img.style.transformOrigin = '';
      tooltip.classList.remove('visible');
    });
  });

  let expanded = false;
  cover.style.cursor = 'zoom-in';

  function expand() {
    if (expanded) return;
    expanded = true; /* trava imediato — impede duplo disparo antes do rAF */

    requestAnimationFrame(() => {
      const r = cover.getBoundingClientRect(); /* leitura diferida — sem reflow forçado */
      wrap.style.height = r.height + 'px'; /* reserva espaço no fluxo do documento */

      /* Snap para posição atual — SEM transição ainda */
      Object.assign(cover.style, {
        position: 'fixed',
        top:      r.top    + 'px',
        left:     r.left   + 'px',
        width:    r.width  + 'px',
        height:   r.height + 'px',
        zIndex:   '500',
        overflow: 'hidden',
        borderRadius: '0',
        transition: 'none'
      });

      requestAnimationFrame(() => {
        cover.style.transition = T_OPEN;
        cover.style.top    = '7.5vh';
        cover.style.left   = '5vw';
        cover.style.width  = '90vw';
        cover.style.height = '85vh';
        backdrop.classList.add('active');
        cover.classList.add('gvny-expanded');
      });
    });
  }

  function collapse() {
    if (!expanded) return;
    expanded = false; /* trava imediato — impede re-expand antes do rAF */

    /* Escritas que não afetam posição do wrap — seguro antes da leitura */
    img.style.transform = img.style.transformOrigin = '';
    tooltip.classList.remove('visible');
    cover.classList.remove('gvny-expanded');
    backdrop.classList.remove('active');

    requestAnimationFrame(() => {
      const r = wrap.getBoundingClientRect(); /* leitura diferida — depois de todas as escritas */
      cover.style.transition = T_CLOSE;
      cover.style.top    = r.top    + 'px';
      cover.style.left   = r.left   + 'px';
      cover.style.width  = r.width  + 'px';
      cover.style.height = r.height + 'px';

      setTimeout(() => {
        cover.removeAttribute('style');
        wrap.style.height = '';
        cover.style.cursor = 'zoom-in';
      }, 700);
    });
  }

  /* Click para abrir */
  cover.addEventListener('click', e => {
    if (e.target.closest('.hotspot-pin')) return;
    if (!expanded) expand();
  });

  /* Fecha ao tirar o mouse da imagem expandida */
  cover.addEventListener('pointerleave', () => {
    if (expanded) collapse();
  });

  backdrop.addEventListener('click', collapse);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') collapse(); });
})();

/* ── Contador animado "250" — artigo Giverny ─────────────────
   Anima de 0 → 250 quando o número entra na viewport.
──────────────────────────────────────────────────────────── */
(function () {
  const el = document.getElementById('monetCount');
  if (!el) return;
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    let n = 0;
    const tick = () => { n = Math.min(n + 4, 250); el.textContent = n; if (n < 250) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, { threshold: 0.8 }).observe(el);
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
