/* ST1M PORT4L landing — the 3D figure.
 * An original, fully procedural bust inspired by Wraith (top-knot, scarf, glowing eyes, kunai): no game asset is used.
 * White marble and gold armour with kintsugi cracks, a particle column, and a portal that opens in the download section.
 * The canvas is fixed behind the page; scroll position decides where the figure stands and how much of it is phased out. */
const canvas = document.getElementById('wraith');
const fail = () => dispatchEvent(new Event('wraith:fail'));

try {
  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js');
  start(THREE);
} catch (e) { console.warn('[wraith] 3D disabled:', e); fail(); }

function start(THREE) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 60);

  /* ---------- shaders */
  const NOISE = /* glsl */`
    vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;} vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
    float snoise(vec3 v){ const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g;
      vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy); vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
      i=mod289(i); vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
      float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_); vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
      return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); }`;

  const shared = { uTime: { value: 0 }, uDissolve: { value: 1 }, uPulse: { value: 0 }, uRigY: { value: 0 } };
  const VERT = /* glsl */`
    uniform float uTime, uWave, uRigY;
    varying vec3 vPos, vN, vMv; varying float vY;
    void main(){
      vec3 p = position;
      if (uWave > 0.) { float w = 1. - uv.y; w *= w;
        p.z += sin(uTime*2.3 + uv.y*7.)*w*uWave; p.x += cos(uTime*1.7 + uv.y*5.)*w*uWave*.6; }
      vPos = p; vY = (modelMatrix*vec4(p,1.)).y - uRigY;
      vec4 mv = modelViewMatrix*vec4(p,1.); vMv = mv.xyz; vN = normalMatrix*normal;
      gl_Position = projectionMatrix*mv;
    }`;
  // One shader for everything: painted marble (two-tone wrap lighting), gold (procedural matcap bands), cloth and suit.
  const FRAG = /* glsl */`
    uniform float uTime, uDissolve, uPulse, uFlat, uVeins, uGloss, uSeed, uMetal, uTears; uniform vec2 uCut; uniform vec3 uBase, uShade, uRim;
    varying vec3 vPos, vN, vMv; varying float vY;
    ${NOISE}
    void main(){
      // phase-out: noise threshold + a soft cut at the bottom of the bust
      float dn = snoise(vPos*1.35 + uSeed)*.5 + .5;
      float keep = smoothstep(uCut.x, uCut.y, vY);
      float th = max(uDissolve*1.25 - .12, (1. - keep)*1.2 - .1);
      if (dn < th) discard;
      float edge = (1. - smoothstep(th, th + .09, dn)) * step(.001, th + .1);   // (never smoothstep with edge0 > edge1: undefined in GLSL)

      vec3 N = normalize(vN);
      if (uFlat > .5) N = normalize(cross(dFdx(vMv), dFdy(vMv)));
      else if (!gl_FrontFacing) N = -N;
      vec3 V = normalize(-vMv);
      float fres = pow(1. - max(dot(N,V), 0.), 2.6);
      vec3 L1 = normalize(vec3(-.7,.62,.45)), L2 = normalize(vec3(.9,.15,-.2));
      float wrap = dot(N,L1)*.5 + .5, d1 = pow(wrap, 2.6), sky = N.y*.5 + .5;
      float s1 = pow(max(dot(N,normalize(L1+V)),0.), mix(14., 80., uGloss));
      float s2 = pow(max(dot(N,normalize(L2+V)),0.), mix(8., 30., uGloss));
      vec3 R = reflect(-V,N), col;
      if (uMetal > .5) {
        float m = clamp(R.y*.5 + .5 + .16*sin(R.x*5. + R.z*3.), 0., 1.);
        col = mix(uShade, uBase, smoothstep(.12, .55, m));
        col = mix(col, vec3(1.,.95,.72), smoothstep(.68, .92, m));
        col *= .55 + .5*d1;
        col += vec3(1.,.93,.75)*s1*1.3 + uRim*fres*.3;
      } else {
        float tone = .94 + .06*snoise(vPos*2.7 + uSeed);
        col = mix(uShade, uBase*tone, clamp(d1*1.5 + sky*.14 - .05, 0., 1.));
        col += vec3(1.)*s1*uGloss*.5 + uRim*s2*.3*uGloss + uRim*fres*(.25 + .3*uGloss);
      }

      // kintsugi: gold-filled cracks, plus the tear streaks under one eye
      float line = 0., glow = 0.;
      if (uVeins > 0.) {
        vec3 q = vPos*.95 + vec3(uSeed, -uTime*.03, 0.);
        float v = abs(snoise(q) + .22*snoise(q*3.1 + 5.) + .08*snoise(q*8. + 2.));
        float area = smoothstep(-.3, .4, snoise(vPos*.55 + uSeed*2. + vec3(0., uTime*.025, 0.)));
        line = (1. - smoothstep(0., .013, v))*area*uVeins; glow = (1. - smoothstep(0., .09, v))*area*uVeins;
      }
      if (uTears > .5 && vPos.z > 0.) {
        float span = smoothstep(-.82, -.6, vPos.y)*(1. - smoothstep(-.075, -.03, vPos.y));
        float a = abs(vPos.x - (.2 + .018*sin(vPos.y*12.) - vPos.y*.03));
        float b = abs(vPos.x - (.3 + .014*sin(vPos.y*9. + 2.) - vPos.y*.07));
        float t = max((1. - smoothstep(.007, .02, a))*span, (1. - smoothstep(.003, .012, b))*span*smoothstep(-.5, -.38, vPos.y));
        line = max(line, t); glow = max(glow, t*.7);
      }
      float pulse = .65 + .35*sin(vPos.y*2.6 - uTime*2.1) + uPulse*1.5;
      vec3 gold = mix(vec3(.62,.38,.07), vec3(1.,.8,.3), d1) + vec3(1.,.95,.8)*s1;
      col = mix(col, gold*(.8 + .45*pulse), clamp(line, 0., 1.));
      col += vec3(1.,.72,.25)*glow*pulse*.2;
      col += vec3(1.,.9,.62)*edge*2.1;
      gl_FragColor = vec4(col, 1.);
    }`;
  const mat = (o = {}) => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: o.side ?? THREE.FrontSide,
    uniforms: { ...shared, uWave: { value: o.wave ?? 0 }, uFlat: { value: o.flat ? 1 : 0 }, uVeins: { value: o.veins ?? .9 }, uGloss: { value: o.gloss ?? .6 },
      uMetal: { value: o.metal ? 1 : 0 }, uTears: { value: o.tears ? 1 : 0 }, uSeed: { value: o.seed ?? 0 }, uCut: { value: new THREE.Vector2(...(o.cut ?? [-100, -99])) },
      uBase: { value: new THREE.Color(o.base ?? 0xf0ece6) }, uShade: { value: new THREE.Color(o.shade ?? 0x6f629f) }, uRim: { value: new THREE.Color(o.rim ?? 0xb9a4ff) } }
  });
  const DS = THREE.DoubleSide, cut = [-4.5, -2.9];
  const goldO = { metal: true, base: 0xe3aa26, shade: 0x5a3508, veins: 0, rim: 0xffe9a8, side: DS };
  const marble = mat({ seed: 1.7, tears: true }), marbleC = mat({ seed: 2.9, cut, side: DS }), marbleF = mat({ seed: 5.1, cut, flat: true, side: DS, gloss: .8 });
  const gold = mat(goldO), goldC = mat({ ...goldO, cut }), goldF = mat({ ...goldO, flat: true }), goldFC = mat({ ...goldO, flat: true, cut });
  const hairM = mat({ veins: 0, gloss: .85, base: 0xf6f2ea, shade: 0x9a8dba, seed: 4.2 }), hairU = mat({ veins: 0, gloss: .3, base: 0xcfc8c6, shade: 0x6f6494, seed: 4.2 });
  const clothM = mat({ veins: 0, gloss: .04, base: 0xf1e8d6, shade: 0x8b7d9e, rim: 0xd8ccff, seed: 9.1, side: DS, cut });
  const tailM = mat({ flat: true, veins: 0, gloss: .04, base: 0xf1e8d6, shade: 0x8b7d9e, rim: 0xd8ccff, seed: 9.1, side: DS, wave: .34 });
  const suitM = mat({ veins: 0, gloss: .4, base: 0x2e2638, shade: 0x0d0a15, rim: 0x8f6cff, seed: 3.3, cut });

  /* ---------- geometry helpers */
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z), TAU = Math.PI * 2;
  const rnd = i => { const k = Math.sin(i * 12.9898) * 43758.5453; return k - Math.floor(k); };
  const sst = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const gauss = (dx, dy, sx, sy) => Math.exp(-(dx * dx) / (2 * sx * sx) - (dy * dy) / (2 * sy * sy));
  const place = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };
  const mesh = (g, m) => new THREE.Mesh(g, m);
  // a tube along a spline whose radius follows profile(t): hair locks, trims, ornaments
  function tube(pts, r, o = {}) {
    const curve = new THREE.CatmullRomCurve3(pts, !!o.closed), segs = o.segs ?? 28, rad = o.radial ?? 7, prof = o.profile ?? (() => 1);
    const g = new THREE.TubeGeometry(curve, segs, 1, rad, !!o.closed), p = g.attributes.position, c = V3(), v = V3();
    for (let i = 0; i <= segs; i++) {
      curve.getPointAt(i / segs, c); const k = r * prof(i / segs);
      for (let j = 0; j <= rad; j++) { const n = i * (rad + 1) + j; v.fromBufferAttribute(p, n).sub(c).multiplyScalar(k).add(c); p.setXYZ(n, v.x, v.y, v.z); }
    }
    g.computeVertexNormals(); return g;
  }
  // a parametric surface: fn(u, v) -> point, u and v in [0, 1]
  function grid(nu, nv, fn) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const p = fn(i / nu, j / nv); pos.push(p.x, p.y, p.z); uv.push(i / nu, j / nv); }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  const ends = t => Math.min(1, t * 6, (1 - t) * 6);                       // tube profile: pinched at both ends
  const skull = (d, k = 1) => V3(d.x * .8 * k, d.y * k, d.z * .93 * k);    // point on the head ellipsoid along direction d

  function headGeo() {
    const g = new THREE.SphereGeometry(1, 208, 168), p = g.attributes.position, v = V3();
    const both = (x, y, cx, cy, sx, sy) => gauss(x - cx, y - cy, sx, sy) + gauss(x + cx, y - cy, sx, sy);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const { x, y, z } = v;
      let X = x * .8, Y = y, Z = z * .93;
      if (y < 0) { const t = -y; X *= 1 - .39 * Math.pow(t, 1.8); Z *= 1 - .2 * t * t; Y *= 1 + .1 * t; }   // jaw taper, longer chin
      else if (z < 0) Z *= 1 + .07 * y;                                                                      // fuller back of the skull
      if (z > 0) {
        Z -= .07 * z * z * (1 - Math.abs(y) * .5);                                                           // flatter face plane
        let d = 0;
        d += .125 * gauss(x, y + .04, .05, .17) + .13 * gauss(x, y + .25, .07, .055);                        // nose bridge + tip
        d += .06 * both(x, y, .085, -.275, .04, .035) - .03 * gauss(x, y + .335, .09, .022);                 // nostril wings, under the nose
        d -= .1 * both(x, y, .3, .03, .125, .07) + .04 * both(x, y, .16, .0, .05, .06);                      // eye sockets, inner corners
        d += .06 * both(x, y, .3, .2, .19, .042) - .02 * both(x, y, .62, .12, .08, .16);                     // brow ridge, temples
        d += .06 * both(x, y, .48, -.15, .13, .1) - .04 * both(x, y, .44, -.46, .12, .14);                   // cheekbones, hollow cheeks
        d += .058 * both(x, y, .055, -.455, .085, .03) + .068 * gauss(x, y + .555, .11, .036);               // upper lip (two lobes), lower lip
        d -= .04 * gauss(x, y + .505, .17, .016) + .028 * both(x, y, .2, -.505, .035, .03);                  // mouth line and corners
        d -= .03 * gauss(x, y + .645, .1, .03); d += .085 * gauss(x, y + .8, .14, .09);                      // under the lip, chin
        d += .03 * both(x, y, .5, -.72, .1, .08);                                                            // jaw angle
        Z += d * Math.min(1, z / .25);
      }
      p.setXYZ(i, X, Y, Z);
    }
    g.computeVertexNormals(); return g;
  }

  const rig = new THREE.Group(), bust = new THREE.Group(), head = new THREE.Group();
  scene.add(rig); rig.add(bust); bust.add(head);

  /* ---------- head */
  head.add(mesh(headGeo(), marble));
  for (const s of [-1, 1]) { const e = new THREE.SphereGeometry(1, 16, 12); e.scale(.05, .17, .1); head.add(place(mesh(e, marble), s * .75, -.02, -.04, 0, 0, s * -.1)); }   // ears

  // eyes: glowing eyeball, iris, two lids and a gold lash line
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true }), irisM = new THREE.MeshBasicMaterial({ color: 0xf0a81e, transparent: true });
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,214,120,.55)'); g.addColorStop(1, 'rgba(255,170,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const glowM = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const lidM = mat({ seed: 1.7, veins: 0, side: DS });
  for (const s of [-1, 1]) {
    const eg = place(new THREE.Group(), s * .245, .035, .668, 0, s * .2, s * -.06); eg.scale.set(1.38, .98, 1); head.add(eg);
    eg.add(mesh(new THREE.SphereGeometry(.1, 24, 16), eyeM), place(mesh(new THREE.CircleGeometry(.04, 24), irisM), 0, -.004, .1005));
    const up = place(mesh(new THREE.SphereGeometry(.113, 24, 8, 0, TAU, 0, .82), lidM), 0, 0, 0, .5);
    const lash = new THREE.TorusGeometry(.113 * Math.sin(.82), .0075, 6, 28); lash.rotateX(Math.PI / 2); lash.translate(0, .113 * Math.cos(.82), 0); up.add(mesh(lash, gold));
    eg.add(up, place(mesh(new THREE.SphereGeometry(.111, 24, 8, 0, TAU, 0, .78), lidM), 0, 0, 0, Math.PI - .42));
    const gl = new THREE.Sprite(glowM); gl.scale.set(.5, .26, 1); gl.position.set(s * .25, .03, .82); head.add(gl);
  }

  // hair: an under-cap, then locks combed back from the hairline into the top-knot
  const cap = new THREE.SphereGeometry(1, 44, 20, 0, TAU, 0, 1.68); cap.scale(.83, 1.03, .96);
  head.add(place(mesh(cap, hairU), 0, .03, -.05, -.46));
  const bunDir = V3(0, .87, -.5).normalize();
  for (let i = 0; i < 44; i++) {
    const phi = i / 44 * TAU - Math.PI + (rnd(i) - .5) * .09, yh = .56 - .92 * sst(.5, 2.7, Math.abs(phi)), c = Math.sqrt(1 - yh * yh);
    const s = V3(Math.sin(phi) * c, yh, Math.cos(phi) * c), pts = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push(skull(s.clone().lerp(bunDir, t).normalize(), 1.045 + .075 * Math.sin(Math.PI * t) + rnd(i + 40) * .025 + (k === 6 ? .12 : 0))); }
    head.add(mesh(tube(pts, .082 + rnd(i + 9) * .035, { profile: t => .62 + .38 * Math.min(1, t * 3), segs: 24, radial: 6 }), hairM));
  }
  const swoop = (pts, r) => head.add(mesh(tube(pts.map(p => V3(...p)), r, { profile: t => Math.min(1, t * 5) * (1 - .82 * t * t * t), segs: 30, radial: 7 }), hairM));
  swoop([[.14, .64, .76], [-.2, .78, .73], [-.56, .6, .63], [-.8, .22, .43], [-.87, -.2, .24], [-.8, -.56, .18]], .125);   // the big side-swept fringe
  swoop([[.2, .7, .68], [-.16, .86, .62], [-.56, .7, .5], [-.84, .34, .3], [-.92, -.06, .12], [-.88, -.36, .06]], .11);
  swoop([[.02, .6, .8], [-.26, .68, .78], [-.54, .48, .7], [-.72, .16, .54], [-.76, -.12, .4]], .085);
  swoop([[.3, .62, .74], [.58, .52, .62], [.8, .18, .42], [.84, -.22, .26], [.78, -.5, .22]], .06);                         // a loose strand on the other side
  const bun = new THREE.SphereGeometry(.42, 48, 32), bp = bun.attributes.position, bv = V3();
  for (let i = 0; i < bp.count; i++) { bv.fromBufferAttribute(bp, i); const k = 1 + .075 * Math.sin(Math.atan2(bv.z, bv.x) * 7 + Math.acos(bv.y / .42) * 4.5); bp.setXYZ(i, bv.x * k, bv.y * k * .92, bv.z * k); }
  bun.computeVertexNormals(); head.add(place(mesh(bun, hairM), 0, 1.3, -.56, -.3));
  // gold: hair band, the strip running to the forehead, and the tiara
  head.add(place(mesh(new THREE.TorusGeometry(.3, .065, 10, 32), gold), 0, 1.02, -.44, 1.05));
  const strip = []; for (let k = 0; k <= 6; k++) strip.push(skull(V3(0, .5, .86).normalize().lerp(bunDir, k / 6).normalize(), 1.13 + .05 * Math.sin(Math.PI * k / 6)));
  head.add(mesh(tube(strip, .05, { segs: 24, radial: 6 }), gold));
  head.add(mesh(grid(36, 8, (a, b) => {
    const u = a * 2 - 1, au = Math.abs(u), top = .6 - .06 * u * u - .13 * sst(.7, 1, au), bot = .37 + .06 * au - .2 * Math.max(0, 1 - au * 4.5);
    const x = u * .58, y = bot + (top - bot) * b;
    return skull(V3(x, y, Math.sqrt(Math.max(.01, 1 - x * x - y * y))), .99 + .05 * Math.max(0, 1 - au * 5) + .012 * Math.sin(b * Math.PI));
  }), goldF));

  /* ---------- neck, suit, armour (the lower part phases out) */
  const neck = new THREE.CylinderGeometry(.33, .43, 1.3, 32, 6, true); neck.translate(0, -1.25, -.12);
  bust.add(mesh(neck, mat({ seed: 1.7, cut })));
  const choker = new THREE.TorusGeometry(.41, .045, 8, 32); choker.rotateX(Math.PI / 2); bust.add(place(mesh(choker, gold), 0, -1.38, -.12));
  const sh = new THREE.SphereGeometry(1, 64, 40); sh.scale(1.9, .6, .76); sh.translate(0, -2.3, -.15); bust.add(mesh(sh, suitM));
  const chest = new THREE.SphereGeometry(1, 64, 40); chest.scale(1.42, 1.5, .82); chest.translate(0, -3.2, -.08); bust.add(mesh(chest, suitM));
  // breastplate with a gold neckline, a lower band and a spiral ornament
  const chestPt = (phi, th, k = 1) => V3(-Math.cos(phi) * Math.sin(th) * 1.45 * k, Math.cos(th) * 1.52 * k - 3.2, Math.sin(phi) * Math.sin(th) * .86 * k - .08);
  const neckline = u => .74 + .3 * (1 - u * u), HP = Math.PI / 2;
  bust.add(mesh(grid(48, 24, (a, b) => { const u = a * 2 - 1; return chestPt(HP + u * 1.2, neckline(u) + (2.35 - neckline(u)) * b, 1.03); }), marbleC));
  const line = (n, fn) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));
  bust.add(mesh(tube(line(16, t => { const u = t * 2 - 1; return chestPt(HP + u * 1.2, neckline(u), 1.05); }), .052, { segs: 48, profile: ends }), goldC));
  bust.add(mesh(tube(line(16, t => { const u = t * 2 - 1; return chestPt(HP + u * 1.2, 1.86 + .13 * Math.cos(u * 3.2), 1.05); }), .04, { segs: 48, profile: ends }), goldC));
  bust.add(mesh(tube(line(20, t => { const a = t * 4.6, r = .07 + .07 * a; return chestPt(HP + .44 + r * Math.cos(a) * .8, 1.42 - r * Math.sin(a) * .6, 1.055); }), .04, { segs: 60, profile: ends }), goldC));
  bust.add(mesh(tube(line(10, t => chestPt(HP - .22 - t * .5, 1.5 - .2 * Math.sin(t * 3), 1.055)), .032, { segs: 30, profile: ends }), goldC));
  // layered shoulder plates, gold-rimmed
  const plate = (s, i, m) => {
    const g = new THREE.Group(), rim = new THREE.TorusGeometry(Math.sin(1.25), .055, 8, 36); rim.rotateX(Math.PI / 2); rim.translate(0, Math.cos(1.25), 0);
    g.add(mesh(new THREE.SphereGeometry(1, 32, 12, 0, TAU, 0, 1.25), m), mesh(rim, goldC)); g.scale.set(.68, .6, .64);
    bust.add(place(g, s * (1.88 + .13 * i), -2.2 - .43 * i, -.12, 0, 0, -s * (.55 + .3 * i)));
  };
  for (const s of [-1, 1]) for (let i = 1; i >= 0; i--) plate(s, i, s < 0 && i === 0 ? goldC : marbleC);
  // the round pauldron: faceted dish, gold boss and rims
  const V2 = (x, y) => new THREE.Vector2(x, y), disc = new THREE.Group();
  const rimG = (R, r, y) => { const g = new THREE.TorusGeometry(R, r, 8, 40); g.rotateX(Math.PI / 2); g.translate(0, y, 0); return g; };
  disc.add(mesh(new THREE.LatheGeometry([V2(.2, .1), V2(.44, .14), V2(.66, .06), V2(.74, -.03)], 16), marbleF));
  disc.add(mesh(new THREE.LatheGeometry([V2(0, .26), V2(.07, .25), V2(.14, .2), V2(.2, .1)], 28), goldC));
  disc.add(mesh(rimG(.74, .058, -.03), goldC), mesh(rimG(.23, .03, .1), goldC));
  bust.add(place(disc, -1.98, -2.5, .52, Math.PI / 2 - .25, 0, .45));
  // scarf: two folded cowls + two tails in the wind
  const cowl = (R, r, y0, droop, seed) => grid(72, 40, (a, b) => {
    const A = a * TAU, B = b * TAU, fold = 1 + .2 * Math.sin(3 * B + 2 * A + seed) + .1 * Math.sin(5 * B - 3 * A + seed * 2) + .08 * Math.sin(5 * A + seed);
    const rr = r * fold * (1 + .25 * Math.cos(A)), ox = Math.cos(B) * rr, oy = Math.sin(B) * rr * .85;
    return V3(Math.sin(A) * (R * 1.15 + ox), y0 - droop * Math.cos(A) + oy, Math.cos(A) * (R + ox) - .1);
  });
  bust.add(mesh(cowl(.64, .29, -1.66, .16, 1), clothM), place(mesh(cowl(.9, .3, -2.02, .3, 4), clothM), 0, 0, 0, 0, 0, -.09));
  const tails = [];
  for (const [x, z, rz, len, w] of [[-.72, -.5, -1.05, 2.5, .5], [-.6, -.62, -.78, 1.9, .38]]) {
    const g = new THREE.PlaneGeometry(w, len, 5, 26); g.translate(0, -len / 2, 0);
    const t = place(mesh(g, tailM), x, -1.7, z, .1, .5, rz); bust.add(t); tails.push(t);
  }
  // kunai, floating beside her
  const kunai = new THREE.Group(), steel = mat({ flat: true, veins: .9, gloss: .9, seed: 6.6 });
  const blade = new THREE.ConeGeometry(.17, 1, 4, 1); blade.scale(1, 1, .3); kunai.add(place(mesh(blade, steel), 0, .62, 0));
  kunai.add(place(mesh(new THREE.BoxGeometry(.3, .05, .09), goldF), 0, .1, 0));
  kunai.add(place(mesh(new THREE.CylinderGeometry(.04, .04, .5, 8), goldF), 0, -.17, 0));
  kunai.add(place(mesh(new THREE.TorusGeometry(.1, .024, 8, 20), gold), 0, -.52, 0));
  rig.add(kunai);

  // particle column
  const N = 1100, seeds = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) seeds.set([Math.random() * 6.283, 1.25 + Math.random() * 2.4, .25 + Math.random() * .9, Math.random()], i * 4);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); pg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const pm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: shared.uTime, uPx: { value: 1 }, uAlpha: { value: 0 } },
    vertexShader: /* glsl */`attribute vec4 aSeed; uniform float uTime, uPx; varying float vA, vG;
      void main(){ float t = uTime*aSeed.z; float h = fract(aSeed.w + t*.07); float ang = aSeed.x + t*.35 + h*2.4;
        float r = aSeed.y*(.8 + .3*sin(h*6.283 + aSeed.x));
        vec4 mv = modelViewMatrix*vec4(cos(ang)*r, mix(-4.2, 3., h), sin(ang)*r, 1.);
        gl_Position = projectionMatrix*mv; gl_PointSize = uPx*(.5 + aSeed.z)*(9./-mv.z); vA = sin(h*3.14159); vG = step(.55, fract(aSeed.x*7.3)); }`,
    fragmentShader: /* glsl */`uniform float uAlpha; varying float vA, vG;
      void main(){ float a = 1. - smoothstep(0., .5, length(gl_PointCoord - .5)); gl_FragColor = vec4(mix(vec3(.8,.68,1.), vec3(1.,.8,.4), vG), a*a*vA*uAlpha); }`
  });
  const points = new THREE.Points(pg, pm); points.frustumCulled = false; rig.add(points);

  // portal (premultiplied: dark void inside, glowing rim outside)
  const portalM = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, premultipliedAlpha: true, uniforms: { uTime: shared.uTime, uOpen: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`uniform float uTime, uOpen; varying vec2 vUv; ${NOISE}
      void main(){ vec2 p = (vUv - .5)*2.; p.x /= .68; float r = length(p), a = atan(p.y, p.x);
        float R = .8*uOpen; float d = r - R - snoise(vec3(cos(a)*1.6, sin(a)*1.6, uTime*.45))*.035;
        float ring = exp(-abs(d)*42.), halo = exp(-abs(d)*6.5), inside = 1. - smoothstep(-.06, .02, d);
        float sa = a + r*3.6 - uTime*.7;
        float sw = snoise(vec3(cos(sa)*r*2.4, sin(sa)*r*2.4, uTime*.22));
        float streak = (1. - smoothstep(0., .12, abs(sw)))*inside;
        vec3 col = vec3(.035,.012,.09)*inside + vec3(.6,.36,1.)*streak*(.25 + r*.7) + vec3(.55,.3,1.)*halo*.6
                 + vec3(1.,.82,.42)*ring*1.35 + vec3(.95,.88,1.)*exp(-r*r*10.)*inside*.55;
        float al = clamp(inside*.86 + halo*.32 + ring, 0., 1.);
        gl_FragColor = vec4(col, al)*smoothstep(0., .25, uOpen); }`
  });
  const portal = place(new THREE.Mesh(new THREE.PlaneGeometry(11, 11), portalM), 0, -.5, -2.6, 0, 0, -.31); rig.add(portal);

  /* ---------- sizing */
  let W = 0, H = 0, aspect = 1;
  function resize() {
    W = innerWidth; H = innerHeight; aspect = W / H;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, W < 800 ? 1.5 : 1.75)); renderer.setSize(W, H, false);
    camera.aspect = aspect; camera.position.set(0, -.55, aspect < .8 ? 16 : aspect < 1.25 ? 12 : 10.6); camera.lookAt(0, -.55, 0); camera.updateProjectionMatrix();
    pm.uniforms.uPx.value = renderer.getPixelRatio() * H / 900;
  }
  addEventListener('resize', resize); resize();

  /* ---------- state */
  const hero = document.getElementById('hero'), dl = document.getElementById('download');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  let px = 0, py = 0, sx = 0, sy = 0, entered = 0, phaseAt = 5, phaseEnd = 0, surge = 0, running = true, first = true;
  addEventListener('pointermove', e => { px = e.clientX / W * 2 - 1; py = e.clientY / H * 2 - 1; }, { passive: true });
  addEventListener('site:enter', () => { entered = performance.now() / 1000; });
  document.querySelectorAll('[data-dl]').forEach(a => { a.addEventListener('pointerenter', () => surge = 1); a.addEventListener('pointerleave', () => surge = 0); });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(frame); });
  const cur = { x: 0, y: 0, ry: 0, dis: 1, open: 0, pulse: 0 };

  function frame(ms) {
    if (!running) return;
    const t = ms / 1000; shared.uTime.value = reduced ? 8 : t;
    sx += (px - sx) * .06; sy += (py - sy) * .06;

    // where is the page?
    const hp = clamp(scrollY / Math.max(1, hero.offsetHeight));
    const vis = clamp((H - dl.getBoundingClientRect().top) / (H * .85));
    const inDl = vis > .02, wide = aspect > 1.05;
    const intro = entered ? 1 - sstep(0, 1.9, t - entered - .25) : 1;
    let dis = inDl ? 1 - sstep(.25, .95, vis) : sstep(.22, .8, hp);
    dis = Math.max(dis, intro);

    // every few seconds she phases for a blink
    if (!reduced && t > phaseAt && dis < .2) { phaseEnd = t + .38; phaseAt = t + 5.5 + Math.random() * 4; dispatchEvent(new Event('wraith:phase')); }
    const ph = t < phaseEnd ? 1 : 0;
    if (ph) dis = Math.max(dis, .16 + .3 * Math.abs(Math.sin(t * 47)));

    const tx = inDl ? (wide ? 2.9 : 0) : 0, ty = inDl ? (1 - vis) * -1.6 + (wide ? 0 : .4) : hp * 2.6, tr = inDl ? (wide ? -.42 : 0) : hp * 1.3;
    const snap = Math.abs(tx - cur.x) > 1.5 && cur.dis > .95;           // jump while invisible
    cur.x = snap ? tx : cur.x + (tx - cur.x) * .08; cur.y += (ty - cur.y) * .1; cur.ry += (tr - cur.ry) * .08;
    cur.dis += (dis - cur.dis) * (ph ? .6 : .14); cur.open += ((inDl ? sstep(.3, 1, vis) : 0) - cur.open) * .06; cur.pulse += (surge - cur.pulse) * .08;

    const visible = cur.dis < .995 || cur.open > .004;
    canvas.style.visibility = visible ? 'visible' : 'hidden';
    canvas.style.opacity = inDl && !wide ? .38 : 1;                    // on phones she stands behind the download text
    if (visible || first) {
      const breathe = Math.sin(t * 1.25);
      rig.position.set(cur.x + (ph ? (Math.random() - .5) * .14 : 0), cur.y + breathe * .035, 0);
      bust.rotation.set(sy * .05, cur.ry + sx * .2 + Math.sin(t * .4) * .07, 0);
      bust.scale.setScalar(inDl && !wide ? .86 : 1);
      head.rotation.set(sy * .2 + breathe * .012, sx * .38, Math.sin(t * .6) * .025 - sx * .04);
      tails.forEach((m, i) => { m.rotation.y = .5 + Math.sin(t * .9 + i) * .16; });
      kunai.position.set(2.15 + Math.sin(t * .7) * .1, -1.05 + Math.sin(t * 1.1 + 1) * .2, .7);
      kunai.rotation.set(.25 + Math.sin(t * .8) * .12, t * 1.4, -.5);
      kunai.visible = aspect > .8;
      shared.uRigY.value = rig.position.y; shared.uDissolve.value = cur.dis; shared.uPulse.value = cur.pulse;
      eyeM.opacity = irisM.opacity = glowM.opacity = Math.pow(1 - cur.dis, 2) * (.8 + .2 * Math.sin(t * 3.1));
      pm.uniforms.uAlpha.value = (1 - cur.dis) * .85 + cur.open * .5;
      portalM.uniforms.uOpen.value = cur.open * (1 + cur.pulse * .06); portal.visible = cur.open > .004;
      portal.scale.setScalar(wide ? 1 : .8);
      renderer.render(scene, camera);
      if (first) { first = false; dispatchEvent(new Event('wraith:ready')); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
