/* ST1M PORT4L landing — the 3D logo: a stim injector plunging into a void portal.
 * The model (models/logo.glb) is built in Blender (tools/logo3d/logo.blend) and carries the injection animation:
 * wind-up, thrust, plunger press, liquid draining, refill. Everything else is done here: gold/glass materials,
 * the swirling void, glow halos, vortex particles, sparks and shock rings fired at the moment of injection.
 * The canvas is fixed behind the page; scroll decides where the logo stands and how visible it is.
 * Events kept from the previous figure: wraith:ready / wraith:fail / wraith:phase (the page listens to them). */
const canvas = document.getElementById('wraith');
const fail = e => { console.warn('[logo3d] 3D disabled:', e); dispatchEvent(new Event('wraith:fail')); };

try {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const gltf = await new GLTFLoader().loadAsync(new URL('../models/logo.glb', import.meta.url).href);
  start(THREE, gltf, RoomEnvironment);
} catch (e) { fail(e); }

function start(THREE, gltf, RoomEnvironment) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, .1, 80);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  const key = new THREE.DirectionalLight(0xfff1d6, 2.2); key.position.set(-4, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa070ff, 3); rim.position.set(5, 2, -4); scene.add(rim);
  const voidLight = new THREE.PointLight(0x9a3dff, 18, 7, 1.6); scene.add(voidLight);

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
  const U = { uTime: { value: 0 }, uSurge: { value: 0 }, uHit: { value: 0 }, uHover: { value: 0 } };

  /* ---------- materials (replace the Blender ones by name) */
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xf5c542, metalness: 1, roughness: .2, clearcoat: .6, clearcoatRoughness: .15, envMapIntensity: 1.6 });
  const goldDark = new THREE.MeshPhysicalMaterial({ color: 0xb8860b, metalness: 1, roughness: .32, envMapIntensity: 1.3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .04, transparent: true, opacity: .22, clearcoat: 1, envMapIntensity: 2.2, depthWrite: false, side: THREE.DoubleSide });
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xf2f2f6, metalness: 1, roughness: .1, envMapIntensity: 2 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const crystal = new THREE.MeshPhysicalMaterial({ color: 0x8a3dff, emissive: 0x9a4dff, emissiveIntensity: 2.4, roughness: .05, clearcoat: 1 });
  const liquid = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffa800, emissiveIntensity: 1.4, roughness: .2 });
  liquid.onBeforeCompile = s => {   // a slow inner shimmer so the liquid feels alive
    s.uniforms.uTime = U.uTime;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; varying vec3 vLp;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= .75 + .5*sin(vLp.x*14. - uTime*5.)*sin(vLp.y*9. + uTime*2.);');
  };
  const voidMat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`uniform float uTime, uSurge, uHit, uHover; varying vec2 vUv; ${NOISE}
      void main(){
        vec2 p = (vUv - .5)*2.; p.y *= 1.51; float r = length(p), a = atan(p.y, p.x);
        float sa = a + r*4.2 - uTime*(.8 + uSurge*1.6 + uHover*.8);
        float sw = snoise(vec3(cos(sa)*r*2.6, sin(sa)*r*2.6, uTime*.25));
        float sw2 = snoise(vec3(cos(sa*1.7)*r*5., sin(sa*1.7)*r*5., uTime*.4 + 3.));
        float streak = 1. - smoothstep(0., .1, abs(sw));
        float fine = 1. - smoothstep(0., .05, abs(sw2));
        vec3 deep = mix(vec3(.62,.24,1.), vec3(.07,.01,.2), smoothstep(0., 1.05, r));
        vec3 col = deep + vec3(.95,.85,1.)*streak*(.25 + .55*(1. - r)) + vec3(.7,.5,1.)*fine*.25;
        col += vec3(1.,.95,1.)*exp(-r*r*7.)*(.9 + uSurge*.8);                 // white-hot core
        vec3 goldTint = vec3(1.,.78,.3);
        col = mix(col, col*goldTint*1.4, uSurge*.55*exp(-r*1.5));           // the stim's gold pouring in
        float wave = exp(-abs(r - uHit*1.3)*14.)*(1. - uHit)*step(.001, uHit);
        col += goldTint*wave*2.2;                                           // shock ring travelling outward
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`
  });
  const byName = { Gold: gold, GoldDark: goldDark, Glass: glass, Needle: steel, RingWhite: white, Crystal: crystal, Liquid: liquid, PortalVoid: voidMat };

  const model = gltf.scene, nodes = {};
  model.traverse(o => {
    nodes[o.name] = o;
    if (o.isMesh) { const m = byName[o.material.name]; if (m) o.material = m; o.frustumCulled = false; }
  });
  nodes.Barrel && (nodes.Barrel.renderOrder = 2);

  const rig = new THREE.Group(), tilt = new THREE.Group();
  scene.add(rig); rig.add(tilt); tilt.add(model);
  model.position.set(.45, .2, 0); model.scale.setScalar(.92);

  const mixer = new THREE.AnimationMixer(model);
  const clip = gltf.animations[0], action = clip && mixer.clipAction(clip);
  if (action) action.play();
  const DUR = clip ? clip.duration : 4, T_THRUST = 26 / 30, T_PRESS0 = 28 / 30, T_PRESS1 = 76 / 30;

  /* ---------- glow layers (additive sprites/planes, no post-processing so the page stays light) */
  const portal = nodes.Portal, void_ = nodes.PortalVoid;
  const glowTex = (stops) => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([o, s]) => g.addColorStop(o, s)); x.fillStyle = g; x.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const add = (map, color, opacity) => new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const soft = glowTex([[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
  // halo behind the portal (elliptical), a rim glow ring and the needle-tip flare
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 8.2), add(soft, 0x8b3dff, .55)); halo.position.set(0, 0, -.35)   // the portal's local XY plane faces the camera after the glTF Y-up conversion
 ; portal.add(halo);
  const ringGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.6), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`uniform float uTime, uSurge, uHover; varying vec2 vUv;
      void main(){ vec2 p = (vUv - .5)*vec2(3.4, 4.6); float e = length(p/vec2(1.17, 1.71)) - 1.;
        float a = atan(p.y, p.x), flick = .75 + .25*sin(a*6. + uTime*3.) * sin(a*3. - uTime*1.7);
        float g = exp(-abs(e)*9.)*flick*(.55 + uSurge*.7 + uHover*.4);
        gl_FragColor = vec4(vec3(1.,.75,.3)*g, g); }`
  }));
  ringGlow.position.set(0, -.02, 0); portal.add(ringGlow);
  const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xffe08a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); flare.scale.setScalar(.9);
  nodes.Needle.add(flare);   // follows the needle tip
  const liquidGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xffb32a, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  liquidGlow.scale.set(2.6, 1.3, 1); nodes.Liquid.add(liquidGlow); liquidGlow.position.set(-.55, 0, 0);

  /* ---------- particles: vortex around the portal, sparks at the injection */
  const portalWorld = new THREE.Vector3();
  const vN = 900, vSeed = new Float32Array(vN * 4);
  for (let i = 0; i < vN; i++) vSeed.set([Math.random() * 6.283, Math.random(), .4 + Math.random() * .9, Math.random()], i * 4);
  const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vN * 3), 3)); vg.setAttribute('aSeed', new THREE.BufferAttribute(vSeed, 4));
  const vortex = new THREE.Points(vg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { ...U, uPx: { value: 1 }, uAlpha: { value: 1 } },
    vertexShader: /* glsl */`attribute vec4 aSeed; uniform float uTime, uPx, uSurge; varying float vA, vG;
      void main(){ float sp = 1. + uSurge*1.5; float h = fract(aSeed.w + uTime*.09*aSeed.z*sp);   // h: 0 = far out, 1 = swallowed
        float r = mix(2.9, .05, h*h); float ang = aSeed.x + h*7.5 + uTime*.2;
        vec3 p = vec3(cos(ang)*r*.78, sin(ang)*r*1.12, (1. - h)*.5*sin(aSeed.x*3.) - h*.3);
        vec4 mv = modelViewMatrix*vec4(p, 1.); gl_Position = projectionMatrix*mv;
        gl_PointSize = uPx*(.6 + aSeed.z)*(10./-mv.z)*(1. - h*.6); vA = sin(h*3.14159); vG = step(.72, aSeed.y); }`,
    fragmentShader: /* glsl */`uniform float uAlpha; varying float vA, vG;
      void main(){ float a = 1. - smoothstep(0., .5, length(gl_PointCoord - .5));
        gl_FragColor = vec4(mix(vec3(.78,.6,1.), vec3(1.,.82,.4), vG), a*a*vA*uAlpha); }`
  }));
  vortex.frustumCulled = false; rig.add(vortex);

  const sN = 160, sPos = new Float32Array(sN * 3), sVel = [], sLife = new Float32Array(sN);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sg.setAttribute('aLife', new THREE.BufferAttribute(sLife, 1));
  for (let i = 0; i < sN; i++) sVel.push(new THREE.Vector3());
  const sparks = new THREE.Points(sg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPx: { value: 1 } },
    vertexShader: `attribute float aLife; uniform float uPx; varying float vL; void main(){ vL = aLife; vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; gl_PointSize = uPx*aLife*14./-mv.z; }`,
    fragmentShader: `varying float vL; void main(){ float a = 1. - smoothstep(0., .5, length(gl_PointCoord - .5)); gl_FragColor = vec4(mix(vec3(1.,.55,.15), vec3(1.,.95,.75), vL), a*vL); }`
  }));
  sparks.frustumCulled = false; scene.add(sparks);
  const tip = new THREE.Vector3(), tipDir = new THREE.Vector3();
  function burst(n) {
    nodes.Needle.getWorldPosition(tip); nodes.Needle.getWorldDirection(tipDir);
    for (let k = 0, i = 0; i < sN && k < n; i++) if (sLife[i] <= 0) {
      k++; sLife[i] = 1; sPos.set([tip.x, tip.y, tip.z], i * 3);
      sVel[i].set(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(1.5 + Math.random() * 3.5);
    }
  }
  // shock rings expanding from the portal at the thrust
  const shockM = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uK; varying vec2 vUv; void main(){ float r = length((vUv - .5)*2.); float g = exp(-abs(r - uK)*30.)*(1. - uK)*step(.001, uK); gl_FragColor = vec4(vec3(.85,.6,1.)*g*1.6, g); }`
  });
  const shock = new THREE.Mesh(new THREE.PlaneGeometry(7, 9.4), shockM); shock.position.set(0, -.1, 0); portal.add(shock);

  /* ---------- sizing */
  let W = 0, H = 0, aspect = 1;
  function resize() {
    W = innerWidth; H = innerHeight; aspect = W / H;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, W < 800 ? 1.5 : 1.75)); renderer.setSize(W, H, false);
    camera.aspect = aspect; camera.position.set(0, -.2, aspect < .8 ? 17 : aspect < 1.25 ? 13 : 11.2); camera.lookAt(0, -.2, 0); camera.updateProjectionMatrix();
    const px = renderer.getPixelRatio() * H / 900; vortex.material.uniforms.uPx.value = px; sparks.material.uniforms.uPx.value = px;
  }
  addEventListener('resize', resize); resize();

  /* ---------- state */
  const hero = document.getElementById('hero'), dl = document.getElementById('download');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  let px = 0, py = 0, sx = 0, sy = 0, entered = 0, hover = 0, running = true, first = true, last = 0, prevT = 0, hitAt = -9, spin = 0;
  addEventListener('pointermove', e => { px = e.clientX / W * 2 - 1; py = e.clientY / H * 2 - 1; }, { passive: true });
  addEventListener('site:enter', () => { entered = performance.now() / 1000; });
  document.querySelectorAll('[data-dl]').forEach(a => { a.addEventListener('pointerenter', () => hover = 1); a.addEventListener('pointerleave', () => hover = 0); });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { last = 0; requestAnimationFrame(frame); } });
  const cur = { x: 0, y: 0, ry: 0, vis: 0, s: 1 };
  if (reduced && action) { action.paused = true; action.time = 50 / 30; }

  function frame(ms) {
    if (!running) return;
    const now = ms / 1000, dt = last ? Math.min(.05, now - last) : .016; last = now;
    U.uTime.value = reduced ? 6 : now;
    sx += (px - sx) * .06; sy += (py - sy) * .06;
    U.uHover.value += (hover - U.uHover.value) * .08;

    // injection timeline (from the Blender clip)
    if (!reduced) mixer.update(dt * (1 + U.uHover.value * .6));
    const t = action ? action.time % DUR : 0;
    if (!reduced && prevT < T_THRUST && t >= T_THRUST) { burst(70); hitAt = now; dispatchEvent(new Event('wraith:phase')); }
    if (!reduced && t > T_PRESS0 && t < T_PRESS1 && Math.random() < .5) burst(2);
    prevT = t;
    const press = t > T_PRESS0 && t < T_PRESS1 + .4 ? Math.sin(Math.PI * clamp((t - T_PRESS0) / (T_PRESS1 + .4 - T_PRESS0))) : 0;
    U.uSurge.value += (press - U.uSurge.value) * .12;
    const k = clamp((now - hitAt) / 1.1); U.uHit.value = k < 1 ? k : 0; shockM.uniforms.uK.value = k < 1 ? Math.pow(k, .6) : 0;

    // where is the page?
    const hp = clamp(scrollY / Math.max(1, hero.offsetHeight));
    const vis = clamp((H - dl.getBoundingClientRect().top) / (H * .85));
    const inDl = vis > .02, wide = aspect > 1.05;
    const intro = entered ? sstep(0, 1.6, now - entered - .2) : 0;
    const show = (inDl ? sstep(.2, .9, vis) : 1 - sstep(.25, .8, hp)) * intro;

    const tx = inDl ? (wide ? 2.6 : 0) : 0, ty = inDl ? (1 - vis) * -1.4 + (wide ? 0 : .5) : hp * 2.4, tr = inDl ? (wide ? -.35 : 0) : hp * .9;
    const snap = Math.abs(tx - cur.x) > 1.5 && cur.vis < .05;
    cur.x = snap ? tx : cur.x + (tx - cur.x) * .08; cur.y += (ty - cur.y) * .1; cur.ry += (tr - cur.ry) * .08; cur.vis += (show - cur.vis) * .12;
    const ts = (inDl && !wide ? .78 : 1) * (.55 + .45 * Math.pow(cur.vis, .6)); cur.s += (ts - cur.s) * .1;

    const visible = cur.vis > .005;
    canvas.style.visibility = visible ? 'visible' : 'hidden';
    canvas.style.opacity = (inDl && !wide ? .45 : 1) * Math.min(1, cur.vis * 1.4);
    if (visible || first) {
      spin += dt * (.12 + U.uHover.value * .4);
      rig.position.set(cur.x, cur.y + Math.sin(now * 1.1) * .06, 0);
      rig.scale.setScalar(cur.s);
      tilt.rotation.set(-sy * .14 + Math.sin(now * .5) * .03, cur.ry + sx * .32 + Math.sin(now * .35) * .08, Math.sin(now * .6) * .02);
      portal.getWorldPosition(portalWorld); vortex.position.copy(portalWorld); vortex.quaternion.copy(tilt.quaternion); vortex.rotateZ(-.31);
      vortex.scale.setScalar(cur.s); vortex.material.uniforms.uAlpha.value = .9;
      voidLight.position.copy(portalWorld).add(new THREE.Vector3(0, 0, .8)); voidLight.intensity = 14 + U.uSurge.value * 20 + (k < 1 ? (1 - k) * 30 : 0);
      liquid.emissiveIntensity = 1.2 + U.uSurge.value * 1.6;
      flare.material.opacity = .35 + U.uSurge.value * .65 + (k < 1 ? (1 - k) * .8 : 0); flare.scale.setScalar(.6 + U.uSurge.value * .6 + Math.sin(now * 9) * .05);
      halo.material.opacity = .45 + U.uSurge.value * .3 + U.uHover.value * .2;
      for (let i = 0; i < 4; i++) { const g = nodes['Gem' + i]; if (g) g.rotation.y = spin * (i % 2 ? 1 : -1) * 2; }
      // sparks: fly then get pulled into the portal
      for (let i = 0; i < sN; i++) if (sLife[i] > 0) {
        const j = i * 3, v = sVel[i];
        v.x += (portalWorld.x - sPos[j]) * dt * 4; v.y += (portalWorld.y - sPos[j + 1]) * dt * 4; v.z += (portalWorld.z - sPos[j + 2]) * dt * 4; v.multiplyScalar(1 - dt * 1.8);
        sPos[j] += v.x * dt; sPos[j + 1] += v.y * dt; sPos[j + 2] += v.z * dt; sLife[i] = Math.max(0, sLife[i] - dt * .9);
      }
      sg.attributes.position.needsUpdate = true; sg.attributes.aLife.needsUpdate = true;
      renderer.render(scene, camera);
      if (first) { first = false; dispatchEvent(new Event('wraith:ready')); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
