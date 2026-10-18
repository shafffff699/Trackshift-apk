# TRACKSHIFT: NEON RUN

**Tagline:** *Run the rails. Beat the city.*

An original 3D endless-runner game set in a futuristic metro city featuring three railway lanes, moving and rampable trains, low jump barriers, high laser gates, four distinct power-ups, rotating missions, unlockable couriers and hoverboards, and procedural Web Audio synth sound effects.

---

## Quick Start (Web / Three.js Build)

```bash
npm install
npm run dev
```

To run the unit tests for game physics, collision detection, procedural pattern fairness, coin magnet math, missions, and cosmetic shop transactions:

```bash
node --test src/game/rules.test.ts
```

To build for production:

```bash
npm run build
```

---

## Controls

### Desktop Controls
- **Left Arrow / A**: Move Left Lane
- **Right Arrow / D**: Move Right Lane
- **Up Arrow / W / Space**: Jump
- **Down Arrow / S**: Slide / Fast-Fall
- **E / Left Shift / Double-Click**: Activate Aegis Hoverboard Shield
- **Escape / P**: Pause / Resume
- **M**: Toggle Audio Mute
- **R**: Quick Restart Run (while playing)

### Mobile & Touch Controls
- **Swipe Left / Right**: Switch Lanes
- **Swipe Up**: Jump
- **Swipe Down**: Slide / Fast-Fall
- **Double-Tap or Aegis Button**: Activate Aegis Hoverboard Shield
- **Optional On-Screen Directional Pad**: Can be enabled in **Settings -> On-Screen Touch Pad**

---

## Project Architecture

- `src/game/types.ts` — Core TypeScript interfaces for game states, obstacles, collectibles, power-ups, missions, and save data.
- `src/game/rules.ts` — Pure deterministic physics, collision evaluation, guaranteed-passable 3-lane row generator, coin vortex magnet math, and progression logic.
- `src/game/rules.test.ts` — Unit test suite (`node:test`) verifying core gameplay mechanics.
- `src/game/Models3D.ts` — Procedural multi-part `THREE.Group` models for the Courier rig, Hoverboards, Pursuing Security Drone, Metro Trains, Barriers, Laser Gates, and Collectibles, plus HTML5 Canvas textures.
- `src/game/GameEngine.ts` — Three.js rendering engine, object pooling, endless railway chunk recycling, biome transitions, particle ring buffer, and 60fps loop.
- `src/game/AudioManager.ts` — Web Audio API procedural sound effects and synth bassline loop.
- `src/game/SaveManager.ts` — Validated `localStorage` persistence with safe fallback.
- `src/components/GameIcons.tsx` & `src/components/GameModals.tsx` — Custom inline `<svg>` title lockup, HUD icons, Crew/Hoverboard Shop, Missions, Settings, Pause, and Game Over modals.
- `godot/` — Complete Godot 4.3 native Android project (`com.trackshift.neonrun`) and APK export preset (`godot/ANDROID_BUILD_INSTRUCTIONS.md`).
