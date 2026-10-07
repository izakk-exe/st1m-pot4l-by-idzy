// Tiny static server + upload endpoint used to render the intro video (WebCodecs needs a secure context: http://localhost).
//   node tools/intro-video/server.js   ->  http://localhost:8790/tools/intro-video/index.html
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), OUT = path.join(ROOT, 'dist', 'video');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.wav': 'audio/wav' };
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST' && url.startsWith('/save/')) {
    fs.mkdirSync(OUT, { recursive: true });
    const f = path.join(OUT, path.basename(url.slice(6)));
    const ws = fs.createWriteStream(f); req.pipe(ws); ws.on('finish', () => { res.end('saved ' + f); console.log('saved', f, fs.statSync(f).size); }); return;
  }
  const p = path.join(ROOT, url);
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; return res.end('404'); }
  res.setHeader('Content-Type', MIME[path.extname(p)] || 'application/octet-stream'); res.setHeader('Accept-Ranges', 'bytes');
  const size = fs.statSync(p).size, m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) { // HTTP Range support (browsers need it to seek inside large videos)
    let start = m[1] === '' ? size - parseInt(m[2], 10) : parseInt(m[1], 10), end = m[1] !== '' && m[2] !== '' ? parseInt(m[2], 10) : size - 1;
    start = Math.max(0, start); end = Math.min(size - 1, end);
    res.statusCode = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`); res.setHeader('Content-Length', end - start + 1); return fs.createReadStream(p, { start, end }).pipe(res);
  }
  res.setHeader('Content-Length', size); fs.createReadStream(p).pipe(res);
}).listen(8790, () => console.log('intro-video server on http://localhost:8790'));
