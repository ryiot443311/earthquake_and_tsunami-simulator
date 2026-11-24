'use strict';
/* index.html の処理のコード（関数・定数）を名前で取り出して、Node の vm で動かす（依存なし）。
   処理のコードは1つの即時関数の中にあり、最上位の宣言は2文字の字下げで始まる。
   function は次の「\n  }\n」まで、const は次の「;\n」までを1つの宣言として取り出す。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const HTML = path.join(__dirname, '..', 'index.html');
let SRC = null;
function source() {
  if (SRC) return SRC;
  const html = fs.readFileSync(HTML, 'utf8');
  const m = html.match(/<script>\s*\(function \(\) \{\s*'use strict';([\s\S]*?)\}\)\(\);\s*<\/script>/);
  if (!m) throw new Error('index.html に処理のコード（即時関数の <script>）が見つかりません');
  SRC = m[1];
  return SRC;
}
function pick(name) {
  const s = source();
  const fn = s.indexOf('\n  function ' + name + '(');
  if (fn >= 0) {
    const end = s.indexOf('\n  }\n', fn);
    if (end < 0) throw new Error('関数の終わりが見つかりません: ' + name);
    return s.slice(fn + 1, end + 4);
  }
  const re = new RegExp('\\n  const ' + name + ' = ');
  const m = re.exec(s);
  if (!m) throw new Error('宣言が見つかりません: ' + name);
  /* 複数の名前をまとめた const（FAR_X0 = 65,\n FAR_X1 = …;）も1つとして取り出す */
  const end = s.indexOf(';\n', m.index + 1);
  return s.slice(m.index + 1, end + 1);
}
/* names の宣言を順に評価し、それぞれの値を返す。globals は足りない名前（cfg など）を与える */
function load(names, globals) {
  const ctx = vm.createContext(Object.assign({ Math, console }, globals || {}));
  const seen = new Set(),
    parts = [];
  for (const n of names) {
    const code = pick(n);
    if (seen.has(code)) continue;
    seen.add(code);
    parts.push(code);
  }
  const exportsCode = '\n({' + names.map(n => n + ': typeof ' + n + " === 'undefined' ? undefined : " + n).join(', ') + '})';
  return vm.runInContext('"use strict";\n' + parts.join('\n') + exportsCode, ctx, { filename: 'index.html(抜き出し)' });
}
module.exports = { load, pick };
