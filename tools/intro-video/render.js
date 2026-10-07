// Re-render the intro film:  node tools/intro-video/render.js
// Needs Node 22+ (global WebSocket) and Microsoft Edge (set EDGE_PATH if it is installed elsewhere).
// Output: dist/video/st1m-port4l-intro-1080p.mp4 and st1m-port4l-intro-720p-discord.mp4
const { spawn } = require('child_process');
const { launch } = require('./edge.js');
(async () => {
  const server = spawn(process.execPath, [require('path').join(__dirname, 'server.js')], { stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 1200));
  try {
    const b = await launch('http://localhost:8790/tools/intro-video/index.html'); await b.sleep(2500);
    const r = await b.ev('renderFilm({ name: "st1m-port4l-intro" })', 1800000);
    if (r && r.__error) throw new Error(r.__error);
    console.log('done in', r.seconds.toFixed(0), 's', JSON.stringify(r.out)); b.close();
  } finally { server.kill(); }
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
