import * as THREE from 'three';
import { RAMP_SLOPE_LENGTH, TRAIN_ROOF_HEIGHT } from './rules';
import type { BoardCosmetic, CharacterCosmetic, CollectibleKind, ObstacleType } from './types';

/**
 * Generates a procedural Ambient Occlusion (AO) map (512x512, Linear NoColorSpace)
 * for structural props, skyscrapers, station curbs, gantry pillars, and train hulls.
 * Darkens base contact zones, top overhang crevices, and vertical panel seams.
 */
export function createAmbientOcclusionTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base vertical AO gradient: dark at bottom contact edge (y=512) and top overhang (y=0), bright in center
  const vGrad = ctx.createLinearGradient(0, 0, 0, 512);
  vGrad.addColorStop(0.0, '#6e6e6e');
  vGrad.addColorStop(0.12, '#dcdcdc');
  vGrad.addColorStop(0.55, '#ffffff');
  vGrad.addColorStop(0.84, '#d0d0d0');
  vGrad.addColorStop(1.0, '#383838');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Horizontal edge crevice darkening so corners of pillars/buildings have rich cavity occlusion
  const hGrad = ctx.createLinearGradient(0, 0, 512, 0);
  hGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.45)');
  hGrad.addColorStop(0.08, 'rgba(0, 0, 0, 0.0)');
  hGrad.addColorStop(0.92, 'rgba(0, 0, 0, 0.0)');
  hGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Architectural panel seam micro-occlusion grooves
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  for (let x = 64; x < 512; x += 64) {
    ctx.fillRect(x - 2, 0, 4, 512);
  }
  for (let y = 64; y < 512; y += 64) {
    ctx.fillRect(0, y - 2, 512, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Generates a soft radial-rectangular contact Ambient Occlusion shadow texture (256x256)
 * used to ground environmental props, pillars, barriers, gates, and trains to the trackbed.
 */
export function createPropOcclusionTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);
  const radGrad = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
  radGrad.addColorStop(0.0, 'rgba(2, 6, 23, 0.88)');
  radGrad.addColorStop(0.55, 'rgba(2, 6, 23, 0.54)');
  radGrad.addColorStop(0.85, 'rgba(2, 6, 23, 0.18)');
  radGrad.addColorStop(1.0, 'rgba(2, 6, 23, 0.0)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a high-resolution (1024x1024) vibrant procedural railway ballast,
 * reinforced cyber-sleeper, dual chrome rail, and directional neon conduit texture.
 */
export function createTrackBedTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Rich deep cyber-indigo roadbed base
  ctx.fillStyle = '#0d132a';
  ctx.fillRect(0, 0, 1024, 1024);

  // Lateral ambient occlusion shadow bands where trackbed meets the raised station curbs
  const leftEdgeAo = ctx.createLinearGradient(0, 0, 95, 0);
  leftEdgeAo.addColorStop(0, 'rgba(2, 4, 14, 0.85)');
  leftEdgeAo.addColorStop(1, 'rgba(2, 4, 14, 0.0)');
  ctx.fillStyle = leftEdgeAo;
  ctx.fillRect(0, 0, 95, 1024);

  const rightEdgeAo = ctx.createLinearGradient(929, 0, 1024, 0);
  rightEdgeAo.addColorStop(0, 'rgba(2, 4, 14, 0.0)');
  rightEdgeAo.addColorStop(1, 'rgba(2, 4, 14, 0.85)');
  ctx.fillStyle = rightEdgeAo;
  ctx.fillRect(929, 0, 95, 1024);

  // Textured metallic ballast & micro-grid
  for (let i = 0; i < 3200; i++) {
    const x = (i * 149) % 1024;
    const y = (i * 283) % 1024;
    ctx.fillStyle = i % 4 === 0 ? '#23325b' : i % 2 === 0 ? '#172242' : '#090d1f';
    ctx.fillRect(x, y, 5, 5);
  }

  // Subtle dark slate outer curb border (no bright neon hazard bars on the ballast)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(10, 0, 14, 1024);
  ctx.fillRect(1000, 0, 14, 1024);

  // Reinforced cyber sleepers across the 3 lanes with recessed AO shadow
  const numSleepers = 10;
  const stepY = 1024 / numSleepers;
  for (let s = 0; s < numSleepers; s++) {
    const y = s * stepY + 18;
    // Sleeper cavity AO drop shadow
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.fillRect(32, y - 6, 960, 66);

    ctx.fillStyle = '#19233d';
    ctx.fillRect(36, y, 952, 54);
    ctx.fillStyle = '#263559';
    ctx.fillRect(44, y + 8, 936, 14);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(44, y + 32, 936, 12);
  }

  // 3 Lanes: clean steel rails + subtle low-key center guide line (minimal track lighting)
  const laneCenters = [212, 512, 812];
  laneCenters.forEach((cx) => {
    // Subtle muted lane center guide line
    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.fillRect(cx - 2, 0, 4, 1024);

    // Rail-base ambient occlusion shadow trenches
    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
    ctx.fillRect(cx - 100, 0, 34, 1024);
    ctx.fillRect(cx + 66, 0, 34, 1024);

    // Steel rail beds flanking each lane
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 94, 0, 22, 1024);
    ctx.fillRect(cx + 72, 0, 22, 1024);

    // Specular brushed steel rail crown
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - 88, 0, 8, 1024);
    ctx.fillRect(cx + 80, 0, 8, 1024);

    // Non-glowing gunmetal rail clips on sleepers
    ctx.fillStyle = '#475569';
    for (let s = 0; s < numSleepers; s++) {
      const y = s * stepY + 34;
      ctx.fillRect(cx - 102, y, 6, 14);
      ctx.fillRect(cx + 96, y, 6, 14);
    }
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a high-detail (512x1024) cyber-metropolis skyscraper facade texture
 * with vibrant neon windows, mezzanine light bands, and recessed window AO frames.
 */
export function createBuildingFacadeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep royal-indigo architectural glass base
  ctx.fillStyle = '#101533';
  ctx.fillRect(0, 0, 512, 1024);

  // Structural vertical mullions with side AO shadow
  for (let x = 0; x < 512; x += 64) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
    ctx.fillRect(x - 3, 0, 14, 1024);
    ctx.fillStyle = '#1b2454';
    ctx.fillRect(x, 0, 8, 1024);
  }

  // Horizontal floor bands & glowing sky-lobby strips
  for (let y = 0; y < 1024; y += 48) {
    ctx.fillStyle = y % 240 === 0 ? '#00f5d4' : '#18204a';
    ctx.fillRect(0, y, 512, y % 240 === 0 ? 5 : 4);
  }

  // Glowing vibrant neon city windows
  const palette = [
    '#00f5d4',
    '#ff2a85',
    '#ffbe0b',
    '#c77dff',
    '#00bbf9',
    '#fff056',
    '#ff5400',
  ];
  let seed = 4201;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let row = 1; row < 21; row++) {
    if (row % 5 === 0) continue; // Mezzanine tech band
    for (let col = 0; col < 8; col++) {
      const r = rand();
      // Window recess AO frame
      ctx.fillStyle = '#070a1c';
      ctx.fillRect(col * 64 + 11, row * 48 + 7, 42, 32);
      if (r < 0.68) {
        const color = palette[Math.floor(rand() * palette.length)];
        ctx.fillStyle = color;
        ctx.fillRect(col * 64 + 14, row * 48 + 10, 36, 26);
        // Bright window core highlight
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(col * 64 + 18, row * 48 + 14, 14, 6);
      }
    }
  }

  // Ground-level foundation ambient occlusion gradient at bottom of building facade
  const baseAo = ctx.createLinearGradient(0, 840, 0, 1024);
  baseAo.addColorStop(0, 'rgba(2, 6, 23, 0.0)');
  baseAo.addColorStop(1, 'rgba(2, 6, 23, 0.78)');
  ctx.fillStyle = baseAo;
  ctx.fillRect(0, 840, 512, 184);

  // Vertical neon accent strips on building corners
  ctx.fillStyle = '#00f5d4';
  ctx.fillRect(2, 0, 8, 1024);
  ctx.fillStyle = '#ff2a85';
  ctx.fillRect(502, 0, 8, 1024);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a vibrant holographic neon billboard texture for trackside sky-signs.
 */
export function createBillboardTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, '#190a36');
  grad.addColorStop(0.5, '#0c234a');
  grad.addColorStop(1, '#2e0938');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Neon outer frame
  ctx.strokeStyle = '#00f5d4';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 492, 236);

  ctx.strokeStyle = '#ff2a85';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, 464, 208);

  // Graphic synth sun & speed chevrons
  ctx.fillStyle = '#ffbe0b';
  ctx.beginPath();
  ctx.arc(110, 128, 54, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff2a85';
  ctx.fillRect(50, 134, 120, 8);
  ctx.fillRect(50, 150, 120, 8);

  // Glowing cyber graphic bars & chevrons
  ctx.fillStyle = '#00f5d4';
  ctx.fillRect(195, 58, 220, 26);
  ctx.fillStyle = '#ff2a85';
  ctx.fillRect(195, 100, 165, 20);
  ctx.fillStyle = '#fff056';
  ctx.fillRect(195, 136, 260, 16);
  ctx.fillStyle = '#c77dff';
  ctx.fillRect(195, 168, 190, 22);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a high-contrast caution & neon booster chevron texture for barriers and ramp decks.
 */
export function createHazardStripeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);

  ctx.fillStyle = '#ff6b00';
  for (let x = -128; x < 640; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 44, 0);
    ctx.lineTo(x + 88, 128);
    ctx.lineTo(x + 44, 128);
    ctx.closePath();
    ctx.fill();
  }

  // Bright top & bottom neon trim lines
  ctx.fillStyle = '#00f5d4';
  ctx.fillRect(0, 0, 512, 10);
  ctx.fillRect(0, 118, 512, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export interface CourierRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  boardGroup: THREE.Group;
  shieldDome: THREE.Mesh;
  gliderWings: THREE.Group;
  bootThrusters: THREE.Group;
  thrusterFlames: THREE.Group;
  hoodieMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  visorMat: THREE.MeshStandardMaterial;
  packMat: THREE.MeshStandardMaterial;
  sneakerMat: THREE.MeshStandardMaterial;
  boardDeckMat: THREE.MeshStandardMaterial;
  boardGlowMat: THREE.MeshStandardMaterial;
}

/**
 * Builds an expressive, highly detailed 38-part stylized 3D Courier character
 * pivoted at bottom-center (y = 0) facing local -Z (direction of travel), featuring:
 * - Sculpted 3-blade cyber-hair crest, wrap LED visor with holographic HUD reticle,
 *   vented mandible chin guard, and over-ear neon headphones with boom mic
 * - Layered street-tech jacket with ribbed side armor, glowing chest arc core,
 *   cross-body courier strap with data cartridges, illuminated exoskeleton spine nodes,
 *   and tactical utility belt with side cargo holsters
 * - Dual-thruster jetpack with top air scoops, stabilizer winglets, central plasma core,
 *   and dual-layer concentric plasma exhaust flames
 * - Articulated arms with layered shoulder pauldrons, elbow armor, left forearm holo-wristband,
 *   and neon-knuckle gloves
 * - Articulated legs with thigh straps, sculpted shin guards, ankle cuffs, and high-top
 *   air-sole cyber sneakers with heel spoilers
 */
export function createCourierRig(
  charCosmetic: CharacterCosmetic,
  boardCosmetic: BoardCosmetic
): CourierRig {
  const root = new THREE.Group();

  // Contact shadow disc with polygonOffset so it never Z-fights on train roofs or ramps
  const shadowGeo = new THREE.CircleGeometry(0.72, 28);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x020617,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = 0.03;
  root.add(shadowDisc);

  const hoodieMat = new THREE.MeshStandardMaterial({
    color: charCosmetic.hoodieColor,
    emissive: charCosmetic.hoodieColor,
    emissiveIntensity: 0.04,
    roughness: 0.48,
    metalness: 0.15,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: charCosmetic.accentColor,
    emissive: charCosmetic.accentColor,
    emissiveIntensity: 0.08,
    roughness: 0.36,
    metalness: 0.35,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: charCosmetic.visorColor,
    emissive: charCosmetic.visorColor,
    emissiveIntensity: 0.38,
    roughness: 0.14,
    metalness: 0.82,
  });
  const packMat = new THREE.MeshStandardMaterial({
    color: charCosmetic.backpackColor,
    emissive: 0x0f172a,
    emissiveIntensity: 0.04,
    roughness: 0.46,
    metalness: 0.45,
  });
  const sneakerMat = new THREE.MeshStandardMaterial({
    color: charCosmetic.sneakerColor,
    emissive: charCosmetic.sneakerColor,
    emissiveIntensity: 0.08,
    roughness: 0.38,
    metalness: 0.2,
  });
  const darkPantsMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x0f172a,
    emissiveIntensity: 0.04,
    roughness: 0.58,
    metalness: 0.18,
  });
  const whiteSoleMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0x1e293b,
    emissiveIntensity: 0.05,
    roughness: 0.35,
  });

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // 1. Sculpted Street-Tech Jacket Torso + Ribbed Side Armor Panels
  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.64, 0.36), hoodieMat);
  torsoMesh.position.set(0, 1.07, 0);
  torsoMesh.castShadow = true;
  bodyGroup.add(torsoMesh);

  const sideRibGeo = new THREE.BoxGeometry(0.64, 0.28, 0.26);
  const sideArmor = new THREE.Mesh(sideRibGeo, packMat);
  sideArmor.position.set(0, 0.96, 0);
  bodyGroup.add(sideArmor);

  // 2. Clean Tech Vest Trim & Cross-Body Courier Strap (non-glowing)
  const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.38), accentMat);
  chestStripe.position.set(0, 1.23, 0);
  bodyGroup.add(chestStripe);

  const chestBadge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.39), accentMat);
  chestBadge.position.set(0, 1.12, 0);
  chestBadge.rotation.z = Math.PI / 4;
  bodyGroup.add(chestBadge);

  const strapMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.68, 0.39), packMat);
  strapMesh.position.set(0, 1.08, 0);
  strapMesh.rotation.z = 0.48;
  bodyGroup.add(strapMesh);

  // 3. Tactical Utility Belt & Side Cargo Holsters
  const beltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.63, 0.11, 0.39), packMat);
  beltMesh.position.set(0, 0.78, 0);
  bodyGroup.add(beltMesh);

  const buckleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.41), accentMat);
  buckleMesh.position.set(0, 0.78, 0);
  bodyGroup.add(buckleMesh);

  const pouchGeo = new THREE.BoxGeometry(0.11, 0.18, 0.22);
  const lPouch = new THREE.Mesh(pouchGeo, packMat);
  lPouch.position.set(-0.34, 0.75, 0);
  const rPouch = new THREE.Mesh(pouchGeo, packMat);
  rPouch.position.set(0.34, 0.75, 0);
  bodyGroup.add(lPouch, rPouch);

  // 4. High-Collar Cyber Hood Rim
  const collarMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.19, 16), accentMat);
  collarMesh.position.set(0, 1.41, 0.02);
  bodyGroup.add(collarMesh);

  // 5. Matte Tactical Courier Jet-Pack (on back at +Z, non-glowing housing)
  const backpackGroup = new THREE.Group();
  backpackGroup.position.set(0, 1.09, 0.24);
  const packMain = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.24), packMat);
  packMain.castShadow = true;
  backpackGroup.add(packMain);

  const packSidePodsGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.5, 14);
  const lPod = new THREE.Mesh(packSidePodsGeo, hoodieMat);
  lPod.position.set(-0.23, 0, 0.02);
  const rPod = new THREE.Mesh(packSidePodsGeo, hoodieMat);
  rPod.position.set(0.23, 0, 0.02);
  backpackGroup.add(lPod, rPod);

  // Top intake scoops on the jetpack (matte packMat)
  const scoopGeo = new THREE.BoxGeometry(0.12, 0.1, 0.16);
  const lScoop = new THREE.Mesh(scoopGeo, packMat);
  lScoop.position.set(-0.18, 0.31, 0.02);
  const rScoop = new THREE.Mesh(scoopGeo, packMat);
  rScoop.position.set(0.18, 0.31, 0.02);
  backpackGroup.add(lScoop, rScoop);

  // Side stabilizing winglets on the jetpack
  const wingletGeo = new THREE.BoxGeometry(0.16, 0.22, 0.04);
  const lWinglet = new THREE.Mesh(wingletGeo, accentMat);
  lWinglet.position.set(-0.32, 0.06, 0.05);
  lWinglet.rotation.z = 0.22;
  const rWinglet = new THREE.Mesh(wingletGeo, accentMat);
  rWinglet.position.set(0.32, 0.06, 0.05);
  rWinglet.rotation.z = -0.22;
  backpackGroup.add(lWinglet, rWinglet);

  const packTrim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.25), accentMat);
  packTrim.position.set(0, 0.16, 0);
  backpackGroup.add(packTrim);

  // Non-glowing brushed metal center cylinder on jetpack
  const packCore = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.38, 12), darkPantsMat);
  packCore.position.set(0, -0.02, 0.11);
  backpackGroup.add(packCore);

  // Left & Right Jet Thruster Nozzles (dark metal)
  const ventGeo = new THREE.CylinderGeometry(0.065, 0.1, 0.18, 12);
  const lVent = new THREE.Mesh(ventGeo, darkPantsMat);
  lVent.position.set(-0.17, -0.3, 0.06);
  lVent.rotation.z = -0.18;
  const rVent = new THREE.Mesh(ventGeo, darkPantsMat);
  rVent.position.set(0.17, -0.3, 0.06);
  rVent.rotation.z = 0.18;
  backpackGroup.add(lVent, rVent);

  // Compact Thruster Exhaust Cones (hidden during normal ground running; shown only on jump/glide)
  const thrusterFlames = new THREE.Group();
  const outerFlameGeo = new THREE.ConeGeometry(0.06, 0.22, 8);
  outerFlameGeo.rotateX(Math.PI);

  const lFlame = new THREE.Mesh(outerFlameGeo, visorMat);
  lFlame.position.set(-0.19, -0.43, 0.06);
  const rFlame = new THREE.Mesh(outerFlameGeo, visorMat);
  rFlame.position.set(0.19, -0.43, 0.06);

  thrusterFlames.add(lFlame, rFlame);
  thrusterFlames.visible = false;
  backpackGroup.add(thrusterFlames);

  bodyGroup.add(backpackGroup);

  // 6. Detailed Head + Sculpted Crest + Low-Glare Visor + Mandible Guard + Matte Headphones
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.62, 0);
  const helmMesh = new THREE.Mesh(new THREE.SphereGeometry(0.245, 22, 18), hoodieMat);
  helmMesh.castShadow = true;
  headGroup.add(helmMesh);

  // 3-Blade Stylized Cyber Hair / Aero Crest Fin (non-glowing accent/pack materials)
  const centerCrest = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.17, 0.3), accentMat);
  centerCrest.position.set(0, 0.23, 0.02);
  centerCrest.rotation.x = 0.35;
  const sideCrestGeo = new THREE.BoxGeometry(0.05, 0.12, 0.24);
  const lCrest = new THREE.Mesh(sideCrestGeo, packMat);
  lCrest.position.set(-0.085, 0.2, 0.04);
  lCrest.rotation.set(0.3, 0, 0.24);
  const rCrest = new THREE.Mesh(sideCrestGeo, packMat);
  rCrest.position.set(0.085, 0.2, 0.04);
  rCrest.rotation.set(0.3, 0, -0.24);
  headGroup.add(centerCrest, lCrest, rCrest);

  // Sculpted Chin / Mandible Guard
  const chinGuard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.24), packMat);
  chinGuard.position.set(0, -0.1, -0.09);
  headGroup.add(chinGuard);

  // Sleek low-glare cyber visor (on front face at -Z)
  const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.16, 0.26), packMat);
  visorFrame.position.set(0, 0.03, -0.1);
  headGroup.add(visorFrame);

  const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.27), visorMat);
  visorMesh.position.set(0, 0.03, -0.11);
  headGroup.add(visorMesh);

  // Over-ear matte headphones with boom microphone (no glowing ear rings)
  const earCupGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.08, 14);
  earCupGeo.rotateZ(Math.PI / 2);
  const lEar = new THREE.Mesh(earCupGeo, packMat);
  lEar.position.set(-0.25, 0.02, 0);
  const rEar = new THREE.Mesh(earCupGeo, packMat);
  rEar.position.set(0.25, 0.02, 0);

  const headband = new THREE.Mesh(
    new THREE.TorusGeometry(0.255, 0.034, 10, 20, Math.PI),
    accentMat
  );
  headband.position.set(0, 0.03, 0);

  const boomMic = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.22), packMat);
  boomMic.position.set(-0.22, -0.07, -0.11);
  boomMic.rotation.y = -0.32;

  headGroup.add(lEar, rEar, headband, boomMic);
  bodyGroup.add(headGroup);

  // 7 & 8. Articulated Left & Right Arms with Matte Pauldrons, Elbow Pads & Gauntlets
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.39, 1.33, 0);
  const lShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 12), accentMat);
  leftArm.add(lShoulder);
  const lArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.34, 6, 10), hoodieMat);
  lArmMesh.position.y = -0.21;
  leftArm.add(lArmMesh);
  const lElbow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), packMat);
  lElbow.position.set(0, -0.22, 0.04);
  leftArm.add(lElbow);
  const lGauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.102, 0.09, 0.18, 12), packMat);
  lGauntlet.position.y = -0.34;
  leftArm.add(lGauntlet);
  const lGlove = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), accentMat);
  lGlove.position.y = -0.45;
  leftArm.add(lGlove);
  bodyGroup.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.39, 1.33, 0);
  const rShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 12), accentMat);
  rightArm.add(rShoulder);
  const rArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.34, 6, 10), hoodieMat);
  rArmMesh.position.y = -0.21;
  rightArm.add(rArmMesh);
  const rElbow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), packMat);
  rElbow.position.set(0, -0.22, 0.04);
  rightArm.add(rElbow);
  const rGauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.102, 0.09, 0.18, 12), packMat);
  rGauntlet.position.y = -0.34;
  rightArm.add(rGauntlet);
  const rGlove = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), accentMat);
  rGlove.position.y = -0.45;
  rightArm.add(rGlove);
  bodyGroup.add(rightArm);

  // 9 & 10. Articulated Left & Right Legs + Thigh Straps + Knee Guards + Matte Sneakers
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.165, 0.72, 0);
  const lLegMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.36, 6, 10), darkPantsMat);
  lLegMesh.position.y = -0.25;
  leftLeg.add(lLegMesh);
  const lThighStrap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.22), packMat);
  lThighStrap.position.set(0, -0.12, 0);
  leftLeg.add(lThighStrap);
  const lKnee = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.16, 0.18), accentMat);
  lKnee.position.set(0, -0.25, -0.06);
  leftLeg.add(lKnee);
  const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.165, 0.38), sneakerMat);
  lShoe.position.set(0, -0.55, -0.05);
  leftLeg.add(lShoe);
  const lSole = new THREE.Mesh(new THREE.BoxGeometry(0.245, 0.06, 0.4), whiteSoleMat);
  lSole.position.set(0, -0.64, -0.05);
  leftLeg.add(lSole);
  bodyGroup.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.165, 0.72, 0);
  const rLegMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.36, 6, 10), darkPantsMat);
  rLegMesh.position.y = -0.25;
  rightLeg.add(rLegMesh);
  const rThighStrap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.22), packMat);
  rThighStrap.position.set(0, -0.12, 0);
  rightLeg.add(rThighStrap);
  const rKnee = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.16, 0.18), accentMat);
  rKnee.position.set(0, -0.25, -0.06);
  rightLeg.add(rKnee);
  const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.165, 0.38), sneakerMat);
  rShoe.position.set(0, -0.55, -0.05);
  rightLeg.add(rShoe);
  const rSole = new THREE.Mesh(new THREE.BoxGeometry(0.245, 0.06, 0.4), whiteSoleMat);
  rSole.position.set(0, -0.64, -0.05);
  rightLeg.add(rSole);
  bodyGroup.add(rightLeg);

  // 11. Sculpted Multi-Part Hoverboard with Low-Glare Trim
  const boardGroup = new THREE.Group();
  boardGroup.position.set(0, 0.06, 0);
  const boardDeckMat = new THREE.MeshStandardMaterial({
    color: boardCosmetic.deckColor,
    emissive: boardCosmetic.deckColor,
    emissiveIntensity: 0.08,
    roughness: 0.32,
    metalness: 0.48,
  });
  const boardGlowMat = new THREE.MeshStandardMaterial({
    color: boardCosmetic.glowColor,
    emissive: boardCosmetic.glowColor,
    emissiveIntensity: 0.32,
    roughness: 0.22,
    metalness: 0.65,
  });
  const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.07, 1.68), boardDeckMat);
  boardGroup.add(deckMesh);

  const gripPadGeo = new THREE.BoxGeometry(0.56, 0.025, 0.38);
  const frontPad = new THREE.Mesh(gripPadGeo, packMat);
  frontPad.position.set(0, 0.04, -0.38);
  const backPad = new THREE.Mesh(gripPadGeo, packMat);
  backPad.position.set(0, 0.04, 0.38);
  boardGroup.add(frontPad, backPad);

  const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 1.74), boardGlowMat);
  railLeft.position.x = -0.43;
  boardGroup.add(railLeft);
  const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 1.74), boardGlowMat);
  railRight.position.x = 0.43;
  boardGroup.add(railRight);
  const noseBumper = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.09, 0.2), boardGlowMat);
  noseBumper.position.z = -0.86;
  boardGroup.add(noseBumper);
  const tailThruster = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.09, 0.18), boardGlowMat);
  tailThruster.position.z = 0.86;
  boardGroup.add(tailThruster);

  root.add(boardGroup);

  // 12. Skyrail Glider Energy Wings
  const gliderWings = new THREE.Group();
  gliderWings.position.set(0, 1.25, 0.28);
  const wingGeo = new THREE.BoxGeometry(1.65, 0.06, 0.48);
  const leftWing = new THREE.Mesh(wingGeo, boardGlowMat);
  leftWing.position.set(-0.86, 0.08, 0);
  leftWing.rotation.z = 0.18;
  gliderWings.add(leftWing);
  const rightWing = new THREE.Mesh(wingGeo, boardGlowMat);
  rightWing.position.set(0.86, 0.08, 0);
  rightWing.rotation.z = -0.18;
  gliderWings.add(rightWing);
  gliderWings.visible = false;
  bodyGroup.add(gliderWings);

  // 13. Pulse Boots Thruster Rings
  const bootThrusters = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(0.19, 0.045, 10, 18);
  ringGeo.rotateX(Math.PI / 2);
  const lRing = new THREE.Mesh(ringGeo, visorMat);
  lRing.position.set(-0.165, 0.14, 0);
  const rRing = new THREE.Mesh(ringGeo, visorMat);
  rRing.position.set(0.165, 0.14, 0);
  bootThrusters.add(lRing, rRing);
  bootThrusters.visible = false;
  bodyGroup.add(bootThrusters);

  // 14. Aegis Shield Energy Dome
  const shieldGeo = new THREE.SphereGeometry(1.22, 20, 16);
  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x00f5d4,
    wireframe: true,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const shieldDome = new THREE.Mesh(shieldGeo, shieldMat);
  shieldDome.position.set(0, 0.96, 0);
  shieldDome.visible = false;
  root.add(shieldDome);

  return {
    root,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    boardGroup,
    shieldDome,
    gliderWings,
    bootThrusters,
    thrusterFlames,
    hoodieMat,
    accentMat,
    visorMat,
    packMat,
    sneakerMat,
    boardDeckMat,
    boardGlowMat,
  };
}

export function applyCosmeticsToCourier(
  rig: CourierRig,
  charCosmetic: CharacterCosmetic,
  boardCosmetic: BoardCosmetic
): void {
  rig.hoodieMat.color.setHex(charCosmetic.hoodieColor);
  rig.hoodieMat.emissive.setHex(charCosmetic.hoodieColor);
  rig.accentMat.color.setHex(charCosmetic.accentColor);
  rig.accentMat.emissive.setHex(charCosmetic.accentColor);
  rig.visorMat.color.setHex(charCosmetic.visorColor);
  rig.visorMat.emissive.setHex(charCosmetic.visorColor);
  rig.packMat.color.setHex(charCosmetic.backpackColor);
  rig.sneakerMat.color.setHex(charCosmetic.sneakerColor);
  rig.sneakerMat.emissive.setHex(charCosmetic.sneakerColor);

  rig.boardDeckMat.color.setHex(boardCosmetic.deckColor);
  rig.boardDeckMat.emissive.setHex(boardCosmetic.deckColor);
  rig.boardGlowMat.color.setHex(boardCosmetic.glowColor);
  rig.boardGlowMat.emissive.setHex(boardCosmetic.glowColor);
}

/**
 * Builds the 10-part vibrant Aero-Enforcer Security Drone mesh.
 */
export function createSecurityDroneMesh(): THREE.Group {
  const drone = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    emissive: 0x1e293b,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.45,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xff1e56,
    emissive: 0xff1e56,
    emissiveIntensity: 2.0,
    roughness: 0.1,
  });
  const cyanBeaconMat = new THREE.MeshStandardMaterial({
    color: 0x00f5d4,
    emissive: 0x00f5d4,
    emissiveIntensity: 1.85,
    roughness: 0.1,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xff6b00,
    emissive: 0xff5400,
    emissiveIntensity: 0.72,
    roughness: 0.25,
    metalness: 0.35,
  });

  // 1. Sleek White-Silver Chassis Core
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 16), hullMat);
  drone.add(core);

  // 2. Crimson Scanner Eye Lens
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.24, 16), eyeMat);
  eye.rotation.x = Math.PI / 2;
  eye.position.set(0, -0.02, -0.32);
  drone.add(eye);

  // 3. Orange Armored Top Carapace
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.45, 0.18, 12), trimMat);
  cap.position.y = 0.26;
  drone.add(cap);

  // 4 & 5. Glowing Cyan & Crimson Police Strobe Beacons
  const lStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), cyanBeaconMat);
  lStrobe.position.set(-0.22, 0.38, 0);
  const rStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), eyeMat);
  rStrobe.position.set(0.22, 0.38, 0);
  drone.add(lStrobe, rStrobe);

  // 6 & 7. Left & Right Illuminated Rotor Pods
  const rotorGeo = new THREE.TorusGeometry(0.24, 0.048, 10, 18);
  rotorGeo.rotateX(Math.PI / 2);
  const leftPod = new THREE.Mesh(rotorGeo, cyanBeaconMat);
  leftPod.position.set(-0.56, 0.08, 0);
  drone.add(leftPod);

  const rightPod = new THREE.Mesh(rotorGeo, cyanBeaconMat);
  rightPod.position.set(0.56, 0.08, 0);
  drone.add(rightPod);

  // 8 & 9. Twin Stabilizer Wings
  const finGeo = new THREE.BoxGeometry(0.05, 0.32, 0.16);
  const lFin = new THREE.Mesh(finGeo, trimMat);
  lFin.position.set(-0.24, 0.44, 0.12);
  lFin.rotation.z = 0.25;
  drone.add(lFin);

  const rFin = new THREE.Mesh(finGeo, trimMat);
  rFin.position.set(0.24, 0.44, 0.12);
  rFin.rotation.z = -0.25;
  drone.add(rFin);

  return drone;
}

/**
 * Creates a closed, outward-facing (CCW) geometric wedge BufferGeometry for the front
 * boarding ramp of `train_ramp` from z = startZ (y = topY) to z = endZ (y = 0).
 */
function createRampWedgeGeometry(
  width: number,
  topY: number,
  startZ: number,
  endZ: number
): THREE.BufferGeometry {
  const hw = width * 0.5;
  const positions = new Float32Array([
    // Sloped top deck (normal points +Y, +Z toward camera)
    -hw, 0,    endZ,
     hw, 0,    endZ,
     hw, topY, startZ,

    -hw, 0,    endZ,
     hw, topY, startZ,
    -hw, topY, startZ,

    // Left triangular side (normal points -X)
    -hw, 0,    startZ,
    -hw, 0,    endZ,
    -hw, topY, startZ,

    // Right triangular side (normal points +X)
     hw, 0,    endZ,
     hw, 0,    startZ,
     hw, topY, startZ,
  ]);

  const uvs = new Float32Array([
    0, 0,  1, 0,  1, 1,
    0, 0,  1, 1,  0, 1,
    0, 0,  1, 0,  0, 1,
    0, 0,  1, 0,  1, 1,
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Helper to create a grounded Ambient Occlusion contact plane beneath obstacles and props.
 */
export function createGroundAoPlane(
  width: number,
  length: number,
  propAoTex: THREE.CanvasTexture,
  opacity = 0.68
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, length);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: propAoTex,
    transparent: true,
    opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.022;
  mesh.name = 'dynamicAoShadow';
  return mesh;
}

/**
 * Builds a multi-part obstacle mesh (Train, Moving Train, Ramp Train, Low Barrier, or High Laser Gate)
 * with baked cavity AO maps and grounded dynamic Ambient Occlusion contact planes.
 */
export function createObstacleMesh(
  type: ObstacleType,
  hazardTex: THREE.CanvasTexture,
  aoTex?: THREE.CanvasTexture,
  propAoTex?: THREE.CanvasTexture
): THREE.Group {
  const group = new THREE.Group();

  if (type === 'barrier_low') {
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      aoMap: aoTex ?? null,
      aoMapIntensity: 0.85,
      emissive: 0x0f172a,
      emissiveIntensity: 0.4,
      roughness: 0.45,
      metalness: 0.35,
    });
    const barMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: hazardTex,
      aoMap: aoTex ?? null,
      aoMapIntensity: 0.65,
      emissive: 0xff6b00,
      emissiveIntensity: 0.48,
      roughness: 0.25,
      metalness: 0.25,
    });
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xffbe0b,
      emissive: 0xff5400,
      emissiveIntensity: 1.95,
    });

    if (propAoTex) {
      group.add(createGroundAoPlane(2.55, 1.35, propAoTex, 0.72));
    }

    const footGeo = new THREE.BoxGeometry(0.28, 1.0, 0.58);
    const lFoot = new THREE.Mesh(footGeo, baseMat);
    lFoot.position.set(-0.92, 0.5, 0);
    const rFoot = new THREE.Mesh(footGeo, baseMat);
    rFoot.position.set(0.92, 0.5, 0);
    group.add(lFoot, rFoot);

    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.46, 0.3), barMat);
    crossBar.position.set(0, 0.78, 0);
    crossBar.castShadow = true;
    group.add(crossBar);

    const beaconGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.18, 12);
    const lBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    lBeacon.position.set(-0.92, 1.08, 0);
    const rBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    rBeacon.position.set(0.92, 1.08, 0);
    group.add(lBeacon, rBeacon);

    return group;
  }

  if (type === 'gate_high') {
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x00bbf9,
      aoMap: aoTex ?? null,
      aoMapIntensity: 0.85,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.45,
    });
    const laserMat = new THREE.MeshStandardMaterial({
      color: 0xff1e56,
      emissive: 0xff1e56,
      emissiveIntensity: 2.1,
      roughness: 0.12,
    });
    const headerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: hazardTex,
      aoMap: aoTex ?? null,
      aoMapIntensity: 0.7,
      emissive: 0x00bbf9,
      emissiveIntensity: 0.42,
      roughness: 0.3,
    });

    if (propAoTex) {
      group.add(createGroundAoPlane(2.75, 1.4, propAoTex, 0.72));
    }

    const pillarGeo = new THREE.BoxGeometry(0.26, 2.95, 0.44);
    const lPillar = new THREE.Mesh(pillarGeo, pillarMat);
    lPillar.position.set(-1.05, 1.475, 0);
    const rPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rPillar.position.set(1.05, 1.475, 0);
    group.add(lPillar, rPillar);

    const upperBeam = new THREE.Mesh(new THREE.BoxGeometry(2.34, 1.35, 0.38), headerMat);
    upperBeam.position.set(0, 2.18, 0);
    upperBeam.castShadow = true;
    group.add(upperBeam);

    const laserBar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.08, 14), laserMat);
    laserBar.rotation.z = Math.PI / 2;
    laserBar.position.set(0, 1.25, 0);
    group.add(laserBar);

    return group;
  }

  // Stylized Metro Train (stationary, moving, or ramp) with toned-down, realistic lighting
  const isMoving = type === 'train_moving';
  const isRamp = type === 'train_ramp';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: isMoving ? 0x6d28d9 : isRamp ? 0x047857 : 0x0369a1,
    aoMap: aoTex ?? null,
    aoMapIntensity: 0.88,
    emissive: isMoving ? 0x2e1065 : isRamp ? 0x064e3b : 0x0c4a6e,
    emissiveIntensity: 0.14,
    roughness: 0.34,
    metalness: 0.42,
  });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: isMoving ? 0xf43f5e : isRamp ? 0x14b8a6 : 0x38bdf8,
    emissive: isMoving ? 0xe11d48 : isRamp ? 0x0d9488 : 0x0284c7,
    emissiveIntensity: 0.36,
    roughness: 0.28,
  });
  const accentTrimMat = new THREE.MeshStandardMaterial({
    color: isMoving ? 0xf59e0b : isRamp ? 0xeab308 : 0xec4899,
    emissive: isMoving ? 0xd97706 : isRamp ? 0xca8a04 : 0xdb2777,
    emissiveIntensity: 0.32,
    roughness: 0.28,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    emissive: isMoving ? 0x38bdf8 : isRamp ? 0x2dd4bf : 0x38bdf8,
    emissiveIntensity: 0.24,
    roughness: 0.12,
    metalness: 0.8,
  });
  const roofDeckMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    aoMap: aoTex ?? null,
    aoMapIntensity: 0.88,
    emissive: 0x090d16,
    emissiveIntensity: 0.15,
    roughness: 0.52,
    metalness: 0.38,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: isMoving ? 0xf59e0b : 0xfde047,
    emissiveIntensity: 0.82,
  });

  const trainHeight = TRAIN_ROOF_HEIGHT; // 2.65m
  const trainWidth = 2.18;

  if (isRamp) {
    const rampStartZ = 9.0 - RAMP_SLOPE_LENGTH; // +2.0
    const bodyLen = 18.0 - RAMP_SLOPE_LENGTH; // 11.0
    const bodyCenterZ = -9.0 + bodyLen * 0.5; // -3.5

    if (propAoTex) {
      group.add(createGroundAoPlane(2.8, 19.2, propAoTex, 0.82));
    }

    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(trainWidth, trainHeight - 0.3, bodyLen),
      bodyMat
    );
    hull.position.set(0, 0.3 + (trainHeight - 0.3) * 0.5, bodyCenterZ);
    hull.castShadow = true;
    hull.receiveShadow = true;
    group.add(hull);

    // Undercarriage bogie
    const bogie = new THREE.Mesh(
      new THREE.BoxGeometry(trainWidth * 0.88, 0.3, bodyLen * 0.96),
      roofDeckMat
    );
    bogie.position.set(0, 0.15, bodyCenterZ);
    group.add(bogie);

    // Single muted side livery stripe
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(trainWidth + 0.03, 0.14, bodyLen * 0.96),
      stripeMat
    );
    stripe.position.set(0, 1.18, bodyCenterZ);
    group.add(stripe);

    // Tinted passenger side windows (2 per side, low-glare)
    const winGeo = new THREE.BoxGeometry(trainWidth + 0.04, 0.5, 2.2);
    for (const wz of [-6.2, -1.4]) {
      const win = new THREE.Mesh(winGeo, glassMat);
      win.position.set(0, 1.86, wz);
      group.add(win);
    }

    // Non-glowing dark steel outer roof guide rails
    const railGeo = new THREE.BoxGeometry(0.13, 0.11, bodyLen);
    const lRoofRail = new THREE.Mesh(railGeo, roofDeckMat);
    lRoofRail.position.set(-0.98, trainHeight + 0.055, bodyCenterZ);
    const rRoofRail = new THREE.Mesh(railGeo, roofDeckMat);
    rRoofRail.position.set(0.98, trainHeight + 0.055, bodyCenterZ);
    group.add(lRoofRail, rRoofRail);

    // Solid outward-wound geometric wedge ramp from z = +2.0 (y = 2.65) to z = +9.0 (y = 0)
    const rampSlopeMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      map: hazardTex,
      aoMap: aoTex ?? null,
      aoMapIntensity: 0.75,
      emissive: 0x064e3b,
      emissiveIntensity: 0.18,
      roughness: 0.42,
      metalness: 0.3,
      side: THREE.DoubleSide,
    });
    const wedgeGeo = createRampWedgeGeometry(trainWidth, trainHeight, rampStartZ, 9.0);
    const wedgeMesh = new THREE.Mesh(wedgeGeo, rampSlopeMat);
    wedgeMesh.castShadow = true;
    wedgeMesh.receiveShadow = true;
    group.add(wedgeMesh);

    // Armored solid 3D ramp surface deck
    const slopeLen = Math.hypot(RAMP_SLOPE_LENGTH, trainHeight);
    const slopeAngle = Math.atan2(trainHeight, RAMP_SLOPE_LENGTH);
    const slopeCenterZ = (rampStartZ + 9.0) * 0.5; // +5.5

    const deckPlate = new THREE.Mesh(
      new THREE.BoxGeometry(trainWidth - 0.08, 0.12, slopeLen),
      roofDeckMat
    );
    deckPlate.rotation.x = slopeAngle;
    deckPlate.position.set(0, trainHeight * 0.5 - 0.04, slopeCenterZ);
    deckPlate.receiveShadow = true;
    group.add(deckPlate);

    // 2 subtle low-glare chevron strips on the ramp surface
    const boosterGeo = new THREE.BoxGeometry(trainWidth - 0.5, 0.035, 0.24);
    for (const frac of [0.35, 0.7]) {
      const bz = 9.0 - frac * RAMP_SLOPE_LENGTH;
      const by = frac * trainHeight + 0.02;
      const booster = new THREE.Mesh(boosterGeo, stripeMat);
      booster.rotation.x = slopeAngle;
      booster.position.set(0, by, bz);
      group.add(booster);
    }

    // Dark steel side guide rails along the ramp slope (non-glowing)
    const sideRailGeo = new THREE.BoxGeometry(0.14, 0.15, slopeLen);
    const lSlopeRail = new THREE.Mesh(sideRailGeo, roofDeckMat);
    lSlopeRail.rotation.x = slopeAngle;
    lSlopeRail.position.set(-1.0, trainHeight * 0.5 + 0.05, slopeCenterZ);
    const rSlopeRail = new THREE.Mesh(sideRailGeo, roofDeckMat);
    rSlopeRail.rotation.x = slopeAngle;
    rSlopeRail.position.set(1.0, trainHeight * 0.5 + 0.05, slopeCenterZ);
    group.add(lSlopeRail, rSlopeRail);

    return group;
  }

  // Standard Stationary or Moving Train (length = 13.5m, z from -6.75 to +6.75)
  const trainLen = 13.5;

  if (propAoTex) {
    group.add(createGroundAoPlane(2.8, 14.8, propAoTex, 0.82));
  }

  // 1. Main Carriage Hull (top surface sits cleanly at y = 2.65)
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(trainWidth, trainHeight - 0.3, trainLen),
    bodyMat
  );
  hull.position.set(0, 0.3 + (trainHeight - 0.3) * 0.5, 0);
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // 2. Undercarriage Bogie Skirt (no neon underglow bar)
  const bogie = new THREE.Mesh(
    new THREE.BoxGeometry(trainWidth * 0.88, 0.3, trainLen * 0.96),
    roofDeckMat
  );
  bogie.position.set(0, 0.15, 0);
  group.add(bogie);

  // 3. Dark Steel Outer Roof Edge Guide Strips (non-glowing)
  const roofEdgeGeo = new THREE.BoxGeometry(0.13, 0.11, trainLen * 0.96);
  const lRoofEdge = new THREE.Mesh(roofEdgeGeo, roofDeckMat);
  lRoofEdge.position.set(-0.98, trainHeight + 0.055, 0);
  const rRoofEdge = new THREE.Mesh(roofEdgeGeo, roofDeckMat);
  rRoofEdge.position.set(0.98, trainHeight + 0.055, 0);
  group.add(lRoofEdge, rRoofEdge);

  // 4. Single Subtle Side Livery Stripe & Sliding Door Frames
  const stripeGeo = new THREE.BoxGeometry(trainWidth + 0.03, 0.14, trainLen * 0.96);
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.set(0, 1.15, 0);
  group.add(stripe);

  const doorGeo = new THREE.BoxGeometry(trainWidth + 0.03, 1.92, 1.15);
  for (const dz of [-2.8, 2.8]) {
    const door = new THREE.Mesh(doorGeo, roofDeckMat);
    door.position.set(0, 1.38, dz);
    group.add(door);
  }

  // 5. Softly Tinted Passenger Windows (2 per side instead of 3 bright blocks)
  const winGeo = new THREE.BoxGeometry(trainWidth + 0.05, 0.5, 1.9);
  for (const wz of [-4.4, 4.4]) {
    const win = new THREE.Mesh(winGeo, glassMat);
    win.position.set(0, 1.86, wz);
    group.add(win);
  }

  // 6. Front Cab Windshield & Bumper Cowling
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.62, 0.14), glassMat);
  frontGlass.position.set(0, 1.88, trainLen * 0.5 + 0.02);
  group.add(frontGlass);

  const destBoard = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.16, 0.15), accentTrimMat);
  destBoard.position.set(0, 2.36, trainLen * 0.5 + 0.02);
  group.add(destBoard);

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(trainWidth + 0.06, 0.36, 0.26), roofDeckMat);
  frontBumper.position.set(0, 0.42, trainLen * 0.5 + 0.06);
  group.add(frontBumper);

  // 7 & 8. Compact Low-Glare Headlights
  const lightGeo = new THREE.BoxGeometry(0.36, 0.16, 0.14);
  const lHeadlight = new THREE.Mesh(lightGeo, headlightMat);
  lHeadlight.position.set(-0.68, 0.78, trainLen * 0.5 + 0.04);
  const rHeadlight = new THREE.Mesh(lightGeo, headlightMat);
  rHeadlight.position.set(0.68, 0.78, trainLen * 0.5 + 0.04);
  group.add(lHeadlight, rHeadlight);

  return group;
}

/**
 * Builds a multi-part Collectible mesh (Coin, Rare Token, or one of the 4 Power-Ups).
 */
export function createCollectibleMesh(kind: CollectibleKind): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'coin') {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffbe0b,
      emissive: 0xff9e00,
      emissiveIntensity: 0.95,
      roughness: 0.12,
      metalness: 0.8,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xfff056,
      emissive: 0xfff056,
      emissiveIntensity: 1.45,
      roughness: 0.08,
    });

    const outerRim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.13, 16), goldMat);
    outerRim.rotation.x = Math.PI / 2;
    group.add(outerRim);

    const innerStar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.17), coreMat);
    innerStar.rotation.z = Math.PI / 4;
    group.add(innerStar);
    return group;
  }

  if (kind === 'token') {
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xff2a85,
      emissive: 0xe879f9,
      emissiveIntensity: 1.55,
      roughness: 0.08,
      metalness: 0.85,
    });
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00bbf9,
      emissiveIntensity: 1.3,
    });

    const octa = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), gemMat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.06, 10, 18), ringMat);
    group.add(octa, ring);
    return group;
  }

  // Power-Ups: vortex | boots | glider | aegis
  const colorMap: Record<string, number> = {
    vortex: 0xff1e56,
    boots: 0xffbe0b,
    glider: 0x00f5d4,
    aegis: 0x10b981,
  };
  const primaryHex = colorMap[kind] ?? 0x00f5d4;

  const mainMat = new THREE.MeshStandardMaterial({
    color: primaryHex,
    emissive: primaryHex,
    emissiveIntensity: 1.45,
    roughness: 0.12,
    metalness: 0.8,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x00f5d4,
    emissiveIntensity: 1.1,
    roughness: 0.15,
  });

  const outerHalo = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.055, 10, 22), accentMat);
  const centerCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), mainMat);
  const basePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.12, 14), accentMat);
  basePedestal.position.y = -0.45;

  group.add(outerHalo, centerCore, basePedestal);
  return group;
}
