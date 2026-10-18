// Production build: node scripts/build.cjs  ->  dist/ (static site, upload the folder as is).
// Libraries (three.js, cannon) and the game scripts are concatenated in index.html order, minified with esbuild and
// written with content hashes in the file names, so a browser never keeps a stale copy after an update.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/^﻿/, '');
const hash = text => crypto.createHash('sha256').update(text).digest('hex').slice(0, 10);

let html = read('index.html');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const libs = scripts.filter(file => file.startsWith('lib/'));
const game = scripts.filter(file => !file.startsWith('lib/'));

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });

// Libraries are already self-contained scripts: concatenate and minify without renaming anything global.
const libCode = esbuild.transformSync(libs.map(read).join('\n;\n'), { minify: true, target: 'es2020', legalComments: 'none' }).code;
// The game files share one global scope, so one IIFE keeps that behaviour while letting the minifier rename everything.
// Entry points the page needs (window.bottleLab) are assigned explicitly in the source.
const gameCode = esbuild.transformSync('(()=>{\n' + game.map(read).join('\n;\n') + '\n})();', { minify: true, target: 'es2020', legalComments: 'none' }).code;
const css = esbuild.transformSync(read('css/style.css'), { loader: 'css', minify: true }).code;

const names = { lib: `lib.${hash(libCode)}.js`, game: `game.${hash(gameCode)}.js`, css: `style.${hash(css)}.css` };
fs.writeFileSync(path.join(out, names.lib), libCode);
fs.writeFileSync(path.join(out, names.game), gameCode);
fs.writeFileSync(path.join(out, names.css), css);
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });

html = html
  .replace('<link rel="stylesheet" href="css/style.css">', `<link rel="stylesheet" href="${names.css}">`)
  .replace(/<script src="lib\/[^"]+"><\/script>/g, '')
  .replace(/<script src="src\/[^"]+"><\/script>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace('</body>', `<script src="${names.lib}"></script><script src="${names.game}"></script>\n</body>`)
  .replace(/>\s+</g, '><');
// Audio credits (CC0, attribution is appreciated) stay in the page.
html = html.replace('</html>', '<!-- Audio: Bottle Shattering by spookymodem, CC0, https://freesound.org/people/spookymodem/sounds/202093/ ; Impact Sounds by Kenney, CC0, https://kenney.nl/assets/impact-sounds -->\n</html>');
fs.writeFileSync(path.join(out, 'index.html'), html);

const size = file => (fs.statSync(path.join(out, file)).size / 1024).toFixed(0) + ' KB';
console.log('dist/ ready:');
for (const file of ['index.html', names.css, names.lib, names.game]) console.log(' ', file.padEnd(28), size(file));
console.log('  assets/'.padEnd(30), fs.readdirSync(path.join(out, 'assets', 'drypage')).length + ' images');
