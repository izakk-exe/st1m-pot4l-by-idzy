// Generates the README banner (1600x520) and the GitHub social preview (1280x640) from the app screenshots.
//   node tools/readme-art/make.js            -> writes banner.html / social.html next to this file
//   then render each with headless Edge, e.g.:
//   msedge --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1600,520 --screenshot=assets/banner.png file:///.../tools/readme-art/banner.html
const fs = require('fs'), path = require('path');
const shot = (n) => '../../assets/readme/' + n;

const css = (W, H, s) => `
  html, body { margin: 0; width: ${W}px; height: ${H}px; background: #050507; overflow: hidden; }
  body { position: relative; color: #fff; font-family: "Bahnschrift SemiCondensed", "Bahnschrift Condensed", Bahnschrift, "Segoe UI", sans-serif; }
  .bg { position: absolute; inset: -40px; background: url(${shot('home.jpg')}) center/cover; filter: blur(14px) brightness(.42) saturate(1.2); }
  .shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(5,5,7,.88) 0%, rgba(5,5,7,.55) 48%, rgba(5,5,7,.2) 100%), radial-gradient(ellipse 60% 80% at 82% 50%, rgba(242,194,74,.18), transparent 70%); }
  .grain { position: absolute; inset: 0; opacity: .12; mix-blend-mode: overlay; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
  .frame { position: absolute; inset: ${Math.round(18 * s)}px; border: 1px solid rgba(255,255,255,.12); border-radius: ${Math.round(22 * s)}px; }
  .by { position: absolute; left: ${Math.round(70 * s)}px; top: ${Math.round(52 * s)}px; font-size: ${Math.round(13 * s)}px; letter-spacing: .5em; text-transform: uppercase; color: rgba(255,255,255,.55); }
  .by::before { content: ''; display: inline-block; width: ${Math.round(40 * s)}px; height: 1px; margin-right: 18px; vertical-align: middle; background: #f2c24a; }
  .title { position: absolute; left: ${Math.round(62 * s)}px; top: 50%; transform: translateY(-50%); font-weight: 700; line-height: .86; font-size: ${Math.round(212 * s)}px; letter-spacing: -.005em; }
  .title span { display: block; width: max-content; padding: .05em .04em .03em; -webkit-background-clip: text; background-clip: text; color: transparent; }
  .t1 { background-image: linear-gradient(180deg, #fff 28%, #a4a4ae); }
  .t2 { margin-left: .36em; background-image: linear-gradient(180deg, #ffe9a8 8%, #f2c24a 68%, #b8860b); }
  .tag { position: absolute; left: ${Math.round(70 * s)}px; bottom: ${Math.round(56 * s)}px; font-size: ${Math.round(17 * s)}px; letter-spacing: .3em; text-transform: uppercase; color: #cfcfd6; }
  .chips { position: absolute; left: ${Math.round(70 * s)}px; bottom: ${Math.round(100 * s)}px; display: flex; gap: ${Math.round(10 * s)}px; }
  .chips i { font-style: normal; font-size: ${Math.round(12.5 * s)}px; letter-spacing: .18em; text-transform: uppercase; padding: ${Math.round(7 * s)}px ${Math.round(14 * s)}px; border: 1px solid rgba(255,255,255,.22); border-radius: 99px; background: rgba(255,255,255,.06); color: #e8e8ee; }
  .win { position: absolute; border-radius: ${Math.round(18 * s)}px; overflow: hidden; border: 1px solid rgba(255,255,255,.2); box-shadow: 0 30px 80px rgba(0,0,0,.65), 0 0 60px rgba(242,194,74,.12); background: #000; }
  .win img { display: block; width: 100%; }
  .w1 { right: ${Math.round(-90 * s)}px; top: ${Math.round(46 * s)}px; width: ${Math.round(820 * s)}px; transform: rotate(3deg); opacity: .96; }
  .w2 { right: ${Math.round(150 * s)}px; top: ${Math.round(96 * s)}px; width: ${Math.round(620 * s)}px; transform: rotate(-3deg); }
`;
const page = (W, H, s, extra = '') => `<!doctype html><meta charset="utf-8"><title>ST1M PORT4L</title><style>${css(W, H, s)}${extra}</style>
<div class="bg"></div><div class="shade"></div>
<div class="win w1"><img src="${shot('pros.jpg')}" alt=""></div>
<div class="win w2"><img src="${shot('stretch.jpg')}" alt=""></div>
<div class="title"><span class="t1">ST1M</span><span class="t2">PORT4L</span></div>
<span class="by">by idZy</span>
<div class="chips"><i>Pro profiles</i><i>Stretched res</i><i>Movement Lab</i><i>100% free</i></div>
<span class="tag">Apex Legends · Config editor</span>
<div class="frame"></div><div class="grain"></div>`;

fs.writeFileSync(path.join(__dirname, 'banner.html'), page(1600, 520, 1, '.title{font-size:150px;top:45%} .chips{bottom:92px} .tag{bottom:48px} .w1{top:36px} .w2{top:86px;width:560px}'));
fs.writeFileSync(path.join(__dirname, 'social.html'), page(1280, 640, 0.8, '.title{top:44%} .w1{top:70px} .w2{top:200px}'));
console.log('banner.html + social.html written');
