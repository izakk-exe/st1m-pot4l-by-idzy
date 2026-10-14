## ST1M PORT4L 1.3 — PC optimisation

### New
- **PC optimisation tab** (Competition → PC optimisation) — three one-click FPS profiles, each bundling in-game graphics settings, Windows tweaks and launch options. A confirmation lists exactly what will change before anything is written.
  - **Light boost** (≈ +10–25% FPS) — cuts what is expensive and barely visible: fog, volumetric lighting, SSAO, distant shadows. Medium textures and anti-aliasing kept. Windows Game Mode on, Xbox Game Bar background recording off.
  - **Competitive boost** (≈ +25–45% FPS) — shadows and effects off, readable medium textures, plus the Ultimate/High performance power plan, Apex forced onto the dedicated GPU (big one on laptops with two GPUs) and fullscreen optimisations off. Launch options `-novid +fps_max 0 -no_render_on_input_thread -high`.
  - **Extreme boost** (≈ +40–70% FPS) — everything at minimum for PCs that struggle, Windows transparency off.
  - Gains are indicative, compared with high settings; they depend on your PC.
- **Windows tweaks, one by one** — each tweak can also be enabled on its own, with its current state shown. No administrator rights needed. Every value is saved before it changes: **Restore Windows** puts everything back, including your previous power plan.
- **Potato graphics (NVIDIA)** — with [NVIDIA Profile Inspector](https://github.com/Orbmu2k/nvidiaProfileInspector/releases) (free, download it from its official page and point the app to the exe), the app writes Apex's driver profile: blurred textures through LOD bias (Soft +3 / Potato +8 / Max potato +15), high-performance texture filtering, anisotropic filtering off, 1 pre-rendered frame, prefer maximum performance. One button resets the profile to driver defaults. Windows asks for administrator rights when it is applied.
- **Restore my original Apex files** — one button on the same page.

### Changed
- Website: the 3D figure on the landing page is replaced by the ST1M PORT4L logo in 3D (stim + portal, modelled in Blender) with an injection animation and effects.

### Notes
- **Potato graphics is at your own risk**: EA moderators have advised against NVIDIA Profile Inspector and tournaments often forbid this kind of driver tweak. NVIDIA cards only.
- Windows only. Unsigned installer: SmartScreen may ask for confirmation.
- Not affiliated with EA / Respawn.
