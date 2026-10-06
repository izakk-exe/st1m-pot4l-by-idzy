/* ST1M PORT4L — file access layer.
 * Three interchangeable backends exposing the same API:
 *   electron : real files via IPC (desktop app)
 *   fsa      : File System Access API (Chromium web build — user picks the Apex folder)
 *   demo     : in-memory sample files (no folder available, lets you try the UI)
 * API: detect(), pick(), read(key), write(key, text, {lock}), restore(key, 'original'|'last'),
 *      setLock(key, bool), openFolder(), apexRunning(), info
 * keys: video | profile | settings */
(function () {
  const ST = (window.ST = window.ST || {});

  const SAMPLE = {
    video: '"VideoConfig"\r\n{\r\n\t"setting.cl_gib_allow"\t\t"1"\r\n\t"setting.csm_enabled"\t\t"1"\r\n\t"setting.csm_coverage"\t\t"2"\r\n\t"setting.csm_cascade_res"\t\t"1024"\r\n\t"setting.mat_picmip"\t\t"0"\r\n\t"setting.mat_forceaniso"\t\t"8"\r\n\t"setting.ssao_quality"\t\t"4"\r\n\t"setting.shadow_enable"\t\t"1"\r\n\t"setting.shadow_maxdynamic"\t\t"2"\r\n\t"setting.volumetric_lighting"\t\t"1"\r\n\t"setting.volumetric_fog"\t\t"1"\r\n\t"setting.r_lod_switch_scale"\t\t"1"\r\n\t"setting.stream_memory"\t\t"1000000"\r\n\t"setting.mat_vsync_mode"\t\t"0"\r\n\t"setting.defaultres"\t\t"1920"\r\n\t"setting.defaultresheight"\t\t"1080"\r\n\t"setting.fullscreen"\t\t"1"\r\n\t"setting.nowindowborder"\t\t"0"\r\n\t"setting.gamma"\t\t"1.0"\r\n}\r\n',
    profile: 'cl_fovScale "1.000000"\r\nreticle_color "255 255 255"\r\nsound_without_focus "0"\r\n',
    settings: 'gfx_nvnUseLowLatency "1"\r\ngfx_nvnUseLowLatencyBoost "0"\r\nbind_US_standard "w" "+forward" 0\r\nbind_US_standard "SPACE" "+jump" 0\r\nbind_US_standard "MWHEEL_UP" "+ability 1" 0\r\n',
  };

  // ---------------- Electron
  function electronBackend(api) {
    return {
      kind: 'electron', info: {},
      detect: async () => { const r = await api.detect(); return r; },
      pick: () => api.pickFolder(),
      read: (k) => api.read(k),
      write: (k, t, o) => api.write(k, t, o || {}),
      restore: (k, w) => api.restore(k, w),
      setLock: (k, l) => api.setLock(k, l),
      openFolder: () => api.openFolder(),
      apexRunning: () => api.apexRunning(),
      status: () => api.status(),
    };
  }

  // ---------------- File System Access (web)
  function fsaBackend() {
    let root = null;
    const NAMES = { video: ['local', 'videoconfig.txt'], profile: ['profile', 'profile.cfg'], settings: ['local', 'settings.cfg'] };
    async function dirOf(k, create) {
      let d = root;
      const [sub] = NAMES[k];
      try { return await d.getDirectoryHandle(sub, { create }); } catch (e) { if (k === 'profile') { try { return await d.getDirectoryHandle('local', { create }); } catch (_) {} } return null; }
    }
    async function fileH(k, create) {
      const d = await dirOf(k, create); if (!d) return null;
      try { return await d.getFileHandle(NAMES[k][1], { create }); } catch (e) { return null; }
    }
    return {
      kind: 'fsa', info: {},
      detect: async () => ({ root: root ? root.name : null, exists: !!root, files: {} }),
      pick: async () => { root = await window.showDirectoryPicker({ mode: 'readwrite' }); return { root: root.name, exists: true }; },
      read: async (k) => { if (!root) return null; const h = await fileH(k, false); return h ? (await h.getFile()).text() : null; },
      write: async (k, t) => {
        const d = await dirOf(k, true); const h = await d.getFileHandle(NAMES[k][1], { create: true });
        try { const old = await (await h.getFile()).text();
          if (old) {
            const orig = await d.getFileHandle(NAMES[k][1] + '.st1m.bak', { create: true });
            if (!(await (await orig.getFile()).size)) { const w0 = await orig.createWritable(); await w0.write(old); await w0.close(); }
            const last = await d.getFileHandle(NAMES[k][1] + '.st1m.last.bak', { create: true });
            const w1 = await last.createWritable(); await w1.write(old); await w1.close();
          }
        } catch (_) {}
        const w = await h.createWritable(); await w.write(t); await w.close();
        return { ok: true };
      },
      restore: async (k, which) => {
        const d = await dirOf(k, false); if (!d) return { ok: false };
        try {
          const b = await d.getFileHandle(NAMES[k][1] + (which === 'original' ? '.st1m.bak' : '.st1m.last.bak'));
          const txt = await (await b.getFile()).text();
          const h = await d.getFileHandle(NAMES[k][1], { create: true });
          const w = await h.createWritable(); await w.write(txt); await w.close();
          return { ok: true };
        } catch (e) { return { ok: false, error: 'no backup' }; }
      },
      setLock: async () => ({ ok: false, error: 'unsupported in browser' }),
      openFolder: async () => false,
      apexRunning: async () => false,
      status: async () => ({}),
    };
  }

  // ---------------- Demo
  function demoBackend() {
    const KEY = 'st1m_demo_files_v2';
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
    return {
      kind: 'demo', info: {},
      detect: async () => ({ root: '(demo)', exists: true, files: { video: { exists: true }, profile: { exists: true }, settings: { exists: true } } }),
      pick: async () => ({ root: '(demo)', exists: true }),
      read: async (k) => { const o = load(); return o[k] !== undefined ? o[k] : SAMPLE[k]; },
      write: async (k, t) => {
        const o = load(); const cur = o[k] !== undefined ? o[k] : SAMPLE[k];
        o['bak_orig_' + k] = o['bak_orig_' + k] || cur; o['bak_last_' + k] = cur; o[k] = t; save(o); return { ok: true };
      },
      restore: async (k, which) => {
        const o = load(); const b = o[(which === 'original' ? 'bak_orig_' : 'bak_last_') + k];
        if (b === undefined) return { ok: false }; o[k] = b; save(o); return { ok: true };
      },
      setLock: async () => ({ ok: true }),
      openFolder: async () => false,
      apexRunning: async () => false,
      status: async () => ({}),
    };
  }

  ST.makeBackend = () => {
    if (window.stApi) return electronBackend(window.stApi);
    return demoBackend();
  };
  ST.makeFsaBackend = fsaBackend;
  ST.fsaSupported = () => typeof window.showDirectoryPicker === 'function' && !window.stApi;
})();
