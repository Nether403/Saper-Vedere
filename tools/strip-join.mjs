import fs from 'node:fs';
const f = 'index.html';
let s = fs.readFileSync(f, 'utf8');
const n = (s.match(/ style="--join:[^"]*"/g) || []).length;
s = s.replace(/ style="--join:[^"]*"/g, '');
fs.writeFileSync(f, s);
console.log(`removed ${n} inline join styles`);
