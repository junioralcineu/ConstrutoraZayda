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
}

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
    name: 'Praia da Lagoa', label:'(00 · 2026 · Beira-Rio)', status:'Lançamento',
    tag:'Trinta e duas unidades de dois e três quartos, de frente para a lagoa.',
    local:'Av. Beira Rio, 320 · Barra de São João', units:'32 apartamentos',
    tipo:'2 e 3 quartos · 64–98 m²', vagas:'1 vaga por unidade', entrega:'Jan 2027', price:'R$ 480 mil'
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
    tipo:'2 quartos · 54–66 m²', vagas:'1 vaga por unidade', entrega:'Entregue em Mai 2024', price:'R$ 380 mil'
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
