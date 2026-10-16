const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
for (const file of scripts) new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), {filename:file});
console.log(`PASS: ${scripts.length} script files exist and parse.`);
