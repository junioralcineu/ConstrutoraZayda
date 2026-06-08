# Zayda Construtora — Guia do Desenvolvedor

> Documento interno. Se você está abrindo este projeto pela primeira vez, leia do início ao fim antes de alterar qualquer coisa.

---

## Visão Geral

Site institucional da Zayda Construtora. Sem framework, sem bundler de componentes, sem dependências em runtime — HTML, CSS e JavaScript puros, hospedados no **GitHub Pages** e servidos via CDN.

O projeto tem dois modos de operação que coexistem no mesmo código:

| Modo | Arquivo | Quando acontece |
|------|---------|-----------------|
| **SPA** | `index.html` | Usuário navega pela home. Seções carregam sem recarregar a página. |
| **Página standalone** | `costa-verde.html`, `ipanema-do-norte.html`, etc. | Acesso direto ou link externo para um empreendimento. |

O mesmo `zayda-app.js` detecta em qual modo está com `IS_SPA = !!document.querySelector('.page')` e ajusta o comportamento accordingly.

---

## Tecnologias

| Camada | Tecnologia | Por quê |
|--------|-----------|---------|
| Markup | HTML5 semântico | Sem dependências; controle total sobre o LCP |
| Estilos | CSS puro (`zayda-styles.css`) + critical CSS inline | Critical CSS inline elimina FOUC; external carrega async |
| Scripts | JavaScript ES Modules (`zayda-app.js`) | Sem build em runtime; `defer` garante que não bloqueie parse |
| Imagens | **Cloudinary** | Transformações on-the-fly, CDN global, formato automático |
| Build | `build.mjs` (Node.js) | Minifica CSS + JS, strip de comentários e remove `image-slot.js` |
| Cache | Service Worker (`sw.js`) | Stale-while-revalidate para CSS/JS; network-first para HTML |
| Fontes | Google Fonts (Cormorant Garamond) | Carregada async com `preload` + `onload` para não bloquear |

---

## Estrutura de Arquivos

```
/
├── index.html              # Home + SPA (roteamento client-side)
├── costa-verde.html        # Página standalone de projeto
├── ipanema-do-norte.html   # ↑ mesma estrutura
├── rua-lambari-carla.html  # ↑ mesma estrutura
├── [outros empreendimentos].html
│
├── zayda-app.js            # Toda a lógica do site (SPA, galeria, nav, animações)
├── zayda-styles.css        # Todos os estilos (exceto critical CSS inline)
├── image-slot.js           # Utilitário de dev para preencher image-slots — NÃO vai para produção
│
├── sw.js                   # Service Worker
├── sitemap.xml
├── build.mjs               # Script de build (minificação + dist/)
├── package.json
└── DEVELOPERS.md           # Este arquivo
```

---

## Imagens — A Parte Mais Importante

Todo o site usa o **Cloudinary** para servir imagens. Entender como ele funciona é essencial para não introduzir regressões de performance.

### URL anatomy

```
https://res.cloudinary.com/dovqcebdt/image/upload/f_auto,q_auto,w_1200/v17.../public_id.jpg
                                                   └── transformações ──┘
```

**Transformações sempre separadas por vírgula, nunca por barra.**

```
✅ f_auto,q_auto,w_1200
❌ f_auto/q_auto/w_1200   ← URL inválida, imagem não carrega
```

### Parâmetros usados no projeto

| Parâmetro | O que faz |
|-----------|-----------|
| `f_auto` | Entrega o formato ideal para cada browser via header `Accept` (WebP ou JPEG — veja nota abaixo) |
| `q_auto` | Qualidade automática baseada no conteúdo da imagem |
| `w_1200` | Redimensiona para 1200px de largura (use conforme o contexto — ver tamanhos abaixo) |
| `c_scale` | Escala proporcional (sem crop) |
| `c_fill` | Preenche a área exata com crop inteligente |
| `f_avif` | Força entrega em AVIF (usado nas imagens hero — ver abaixo) |
| `f_webp` / `f_jpg` | Forçam formato específico (evite; prefira `f_auto`) |

### Por que `f_auto` às vezes entrega JPEG, não WebP

`f_auto` faz content negotiation via header `Accept` e analisa o conteúdo de cada imagem individualmente. Para algumas imagens, o Cloudinary determina que JPEG produz um arquivo genuinamente menor do que WebP — e entrega JPEG mesmo que o browser suporte WebP. **Isso é comportamento correto, não um bug.**

A extensão na URL (`.jpg`, `.webp`) não determina o formato entregue — o que conta é o parâmetro `f_`.

### Por que `f_auto` nunca entrega AVIF

O plano atual do Cloudinary não inclui AVIF na negociação automática do `f_auto`. AVIF é suportado quando explicitamente forçado (`f_avif`) e produz arquivos ~30–40% menores que JPEG na mesma qualidade. **Por isso, os heroes LCP usam `<picture>` com `<source type="image/avif">` explícito.**

### Tamanhos por contexto

| Contexto | Largura recomendada |
|----------|-------------------|
| Hero full-width (desktop) | `w_1200` |
| Hero full-width (mobile) | `w_800` |
| Galeria dinâmica (Cloudinary Resource List) | `w_1200` |
| Imagem de processo / coluna 50% em retina | `w_2000` (DPR 2×) |
| Thumbnail / nav preview | `w_400` |

---

## Estratégia AVIF nas Imagens Hero (LCP)

As imagens principais de cada página usam AVIF quando disponível, com fallback seguro.

### Páginas de projeto (`costa-verde.html`, etc.) — `<picture>`

```html
<picture>
  <source type="image/avif"
          srcset="https://res.cloudinary.com/.../f_avif,q_auto/v.../imagem.avif">
  <img src="https://res.cloudinary.com/.../q_auto,f_auto/v.../imagem.jpg"
       alt="Nome do projeto"
       width="1800" height="1200"
       style="width:100%;height:100%;object-fit:cover;display:block;"
       loading="eager" fetchpriority="high">
</picture>
```

O browser escolhe `<source>` na ordem declarada. Se suportar AVIF → usa AVIF. Caso contrário → `<img>` fallback com `f_auto` (WebP ou JPEG, o que for menor para aquela imagem).

### Home (`index.html`) — `image-set()` no CSS

O hero da home é um `background-image`. Para backgrounds, a API correta é `image-set()`:

```css
/* Browsers modernos — usa AVIF */
.hero-viewport {
  background-image:
    linear-gradient(rgba(0,0,0,.30), rgba(0,0,0,.50)),
    image-set(
      url('...f_avif,q_auto,w_1200...') type('image/avif'),
      url('...f_auto,q_auto,w_1200...')
    );
}

/* Browsers sem suporte a image-set() — usa url() simples */
@supports not (background-image: image-set(url('a.avif') type('image/avif'))) {
  .hero-viewport {
    background-image:
      linear-gradient(rgba(0,0,0,.30), rgba(0,0,0,.50)),
      url('...f_auto,q_auto,w_1200...');
  }
}
```

**Não coloque `url()` e `image-set()` em duas declarações sequenciais do mesmo seletor sem `@supports`.** O preload scanner do Chromium faz fetch especulativo de todos os `url()` que encontra no CSS, causando double-fetch desnecessário.

### Preload das imagens hero

Cada página standalone tem um `<link rel="preload">` no `<head>` apontando para a versão AVIF:

```html
<link rel="preload" as="image"
      href="https://res.cloudinary.com/.../f_avif,q_auto/v.../imagem.avif"
      fetchpriority="high">
```

Isso alinha o preload com o que a maioria dos browsers (Chrome, Firefox, Safari 16.4+) vai de fato usar. Browsers sem suporte a AVIF ignoram o preload, mas ainda carregam corretamente o fallback `<img src>`.

### `fetchpriority` — use com critério

| Situação | Valor correto |
|----------|--------------|
| Imagem LCP (primeiro elemento visível, above the fold) | `fetchpriority="high"` |
| Qualquer imagem abaixo do fold | `loading="lazy"` (nunca `fetchpriority="high"`) |
| Imagem dentro de `display:none` | `loading="lazy"` — `display:none` **não** impede fetch eager |

---

## Galeria Dinâmica (Cloudinary Resource List)

Cada empreendimento com galeria completa usa a **Cloudinary Resource List API**. O JS faz um `fetch` para:

```
https://res.cloudinary.com/dovqcebdt/image/list/{cloudinaryTag}.json
```

Onde `cloudinaryTag` é a propriedade correspondente no objeto `EMP_DATA` em `zayda-app.js`.

A função `buildUrl` em `loadCloudinaryGallery()` define o tamanho de cada imagem da galeria:

```js
const buildUrl = r =>
  `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_1200/${r.public_id}`;
```

**Não remova o `w_1200`.** Sem ele, o Cloudinary entrega as fotos em resolução original (média de 3400px, ~1.3 MB cada). Com 70+ fotos por galeria, isso representa ~96 MB de payload em uma única página.

Para que a API funcione: acesse o painel do Cloudinary → Settings → Security → ative **"Resource List"**.

---

## Adicionando um Novo Empreendimento

### 1. Crie a página standalone

Copie `rua-lambari-carla.html` (a mais recente) e ajuste:
- `<title>`, `<meta name="description">`, Open Graph
- URL canônica (`<link rel="canonical">`)
- `<link rel="preload">` do hero (atualize o `public_id` e versão do Cloudinary)
- Conteúdo da `<section class="emp-hero">`, `<section class="emp-specs">`, etc.
- Hero `<picture>`: atualize os dois URLs (AVIF + fallback)
- `data-cloudinary-tag` no `<body>` (deve corresponder à tag no Cloudinary)

### 2. Adicione ao `EMP_DATA` em `zayda-app.js`

```js
'slug-do-empreendimento': {
  name: 'Nome Completo',
  label: '(12 · 2026 · Bairro)',
  status: 'Lançamento', // ou 'Em obra', 'Pronto pra morar', 'Entregue'
  tag: 'Descrição curta para o card.',
  local: 'Endereço completo',
  units: 'X apartamentos',
  tipo: '2 quartos · 60 m²',
  vagas: '1 vaga por unidade',
  entrega: 'Mês AAAA',
  price: 'A consultar',
  cloudinaryTag: 'nome-da-tag-no-cloudinary', // deve existir no Cloudinary
  heroImg: 'https://res.cloudinary.com/dovqcebdt/image/upload/q_auto,f_auto/v.../public_id.jpg',
}
```

### 3. Registre em `build.mjs`

Adicione o nome do arquivo HTML ao array `HTML_FILES`.

### 4. Suba as fotos ao Cloudinary

Agrupe as fotos sob a tag correspondente (`cloudinaryTag`). A galeria dinâmica as puxará automaticamente.

---

## Build & Deploy

```bash
npm install          # instala lightningcss e terser (devDependencies)
npm run build        # gera dist/ com CSS/JS minificados e HTML sem comentários
```

O deploy acontece via **GitHub Actions** na branch `master`. O Actions executa `npm run build` e publica `dist/` no GitHub Pages. **Nunca edite `dist/` manualmente** — ela é gerada automaticamente.

`image-slot.js` é um utilitário de desenvolvimento (preenche placeholders de imagem no ambiente local) e é **removido automaticamente pelo build**. Não o referencie em produção.

---

## Service Worker

Estratégia por tipo de recurso:

| Tipo | Estratégia | Por quê |
|------|-----------|---------|
| HTML | Network-first | Garante que o usuário sempre receba a versão mais recente |
| CSS, JS, fontes | Stale-while-revalidate | Responde do cache imediatamente; atualiza em background |
| Imagens Cloudinary | Não interceptado (origem externa) | O Cloudinary tem CDN própria com headers de cache longos |

Se você fizer uma alteração crítica em CSS ou JS e precisar que os usuários recebam imediatamente, incremente a versão do cache em `sw.js`:

```js
const CACHE = 'zayda-v2'; // era v1
```

---

## SPA — Roteamento Client-Side

A home usa roteamento client-side baseado em `data-route` e `hash`. Cada seção é um `.page` com um `id`. O JS em `zayda-app.js` intercepta cliques em `[data-link]`, mostra/esconde `.page`s e atualiza o hash da URL.

A transição entre a home e as páginas standalone usa um **veil** (elemento `#veil`) que anima cobrindo a tela antes do `window.location.href` ser alterado, dando a impressão de transição fluida mesmo trocando de documento HTML.

---

## O Que Não Fazer

Estas são as armadilhas mais comuns — cada uma já causou um problema real neste projeto.

**Separador errado no Cloudinary**
```
❌ f_auto/q_auto/w_1200   → URL inválida
✅ f_auto,q_auto,w_1200   → correto
```

**`fetchpriority="high"` em imagem fora do viewport inicial**
Sinaliza ao browser para baixar aquela imagem antes das demais — incluindo antes do hero real. Resultado: LCP piora.

**`display:none` não impede fetch**
Um `<img loading="eager" fetchpriority="high">` dentro de um container `display:none` **ainda faz o download**. Use `loading="lazy"` em qualquer imagem que não seja imediatamente visível.

**Duas declarações `background-image` sequenciais (override pattern) sem `@supports`**
O preload scanner do Chromium faz fetch de todos os `url()` que encontra no CSS, mesmo os de declarações que serão descartadas pela cascata. Use `@supports not (...)` para isolar o fallback e evitar double-fetch.

**Galeria sem `w_` na `buildUrl`**
Sem largura definida, o Cloudinary entrega a imagem em resolução original. Com 70+ fotos, isso pode chegar a 100 MB de payload numa única sessão mobile.

**Usar `<image>` em vez de `<img>`**
`<image>` não é um elemento HTML válido. O browser ignora e a foto não aparece.

---

## Contas & Acessos

| Serviço | Onde fica |
|---------|-----------|
| Cloudinary | `res.cloudinary.com/dovqcebdt` — credenciais com o time |
| GitHub Pages | Repositório `ConstrutoraZayda` — branch `master` → `dist/` |
| Google Analytics / Search Console | Vinculado ao domínio `zaydaconstrutora.com` |

---

*Última atualização: 08 Junho 2026*
