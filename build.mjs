/**
 * Build script — minifica CSS e JS para a pasta dist/
 * Executado pelo GitHub Actions antes do deploy no Pages.
 */
import { transform } from 'lightningcss';
import { minify }    from 'terser';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';

mkdirSync('dist', { recursive: true });

/* ── HTML — copia sem alterar (já tem CSS crítico inline) ── */
copyFileSync('index.html', 'dist/index.html');
console.log('✓ index.html copiado');

/* ── Service Worker — copia sem alterar (arquivo pequeno) ── */
copyFileSync('sw.js', 'dist/sw.js');
console.log('✓ sw.js copiado');

/* ── CSS — minifica com lightningcss ── */
const cssIn  = readFileSync('zayda-styles.css');
const { code: cssOut } = transform({
  filename: 'zayda-styles.css',
  code: cssIn,
  minify: true,
  targets: { chrome: 95, firefox: 95, safari: 15 },
});
writeFileSync('dist/zayda-styles.css', cssOut);
console.log(`✓ zayda-styles.css  ${kb(cssIn.length)} → ${kb(cssOut.length)}`);

/* ── JS — minifica com terser ── */
for (const file of ['zayda-app.js', 'image-slot.js']) {
  const src = readFileSync(file, 'utf8');
  const { code: out } = await minify(src, {
    compress: { drop_console: false, passes: 2 },
    mangle: true,
    format: { comments: false },
  });
  writeFileSync(`dist/${file}`, out);
  console.log(`✓ ${file.padEnd(18)} ${kb(src.length)} → ${kb(out.length)}`);
}

function kb(bytes) { return (bytes / 1024).toFixed(1).padStart(6) + ' KB'; }
console.log('\nBuild concluído → dist/');
