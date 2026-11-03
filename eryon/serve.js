// servidor estático mínimo (módulos ES não carregam via file://)
const http = require('http'), fs = require('fs'), path = require('path');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.json': 'application/json' };
module.exports = (port = 8765) => new Promise(res => {
  const s = http.createServer((q, r) => {
    const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0]));
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
  }).listen(port, () => res(s));
});
if (require.main === module) module.exports(8765).then(() => console.log('http://localhost:8765/'));
