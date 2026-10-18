import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { audioManager } from './AudioManager';
import {
  CourierRig,
  applyCosmeticsToCourier,
  createAmbientOcclusionTexture,
  createBillboardTexture,
  createBuildingFacadeTexture,
  createCollectibleMesh,
  createCourierRig,
  createGroundAoPlane,
  createHazardStripeTexture,
  createObstacleMesh,
  createPropOcclusionTexture,
  createSecurityDroneMesh,
  createTrackBedTexture,
} from './Models3D';
import {
  AEGIS_DURATION,
  CHARACTERS,
  HOVERBOARDS,
  LANES,
  POWERUP_DURATION,
  RAMP_SLOPE_LENGTH,
  TRAIN_ROOF_HEIGHT,
  calculateScoreIncrement,
  clampLane,
  computeCoinPullPosition,
  computeRunSpeed,
  evaluateObstacleInteraction,
  generateFairRowPattern,
  getBiomeForDistance,
  laneToWorldX,
  stepPowerUpTimers,
  stepVerticalPhysics,
  updateMissionsWithEvent,
  VerticalPhysicsState,
} from './rules';
import {
  ActivePowerUps,
  BiomeType,
  CollectibleInstanceData,
  CollectibleKind,
  GameState,
  LaneIndex,
  ObstacleInstanceData,
  ObstacleType,
  PowerUpType,
  RunStatsSnapshot,
  SaveData,
} from './types';

/**
 * Custom Screen-Space Micro-Ambient Occlusion & Filmic Neon Vibrance ShaderPass.
 * Evaluates a multi-tap neighborhood contrast kernel to deepen structural crevices
 * and contact seams while boosting neon chrominance before tonemapping.
 */
const DynamicAOVibranceShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1280, 720) },
    uAoStrength: { value: 0.34 },
    uVibrance: { value: 0.24 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uAoStrength;
    uniform float uVibrance;
    varying vec2 vUv;

    float getLuma(vec3 c) {
      return dot(c, vec3(0.299, 0.587, 0.114));
    }

    void main() {
      vec4 baseSample = texture2D(tDiffuse, vUv);
      vec3 col = baseSample.rgb;
      vec2 texel = 1.6 / max(uResolution, vec2(1.0));

      // 4-tap neighborhood luminance sampling for local cavity / crevice micro-occlusion
      float lCenter = getLuma(col);
      float lLeft   = getLuma(texture2D(tDiffuse, vUv + vec2(-texel.x, 0.0)).rgb);
      float lRight  = getLuma(texture2D(tDiffuse, vUv + vec2( texel.x, 0.0)).rgb);
      float lUp     = getLuma(texture2D(tDiffuse, vUv + vec2(0.0,  texel.y)).rgb);
      float lDown   = getLuma(texture2D(tDiffuse, vUv + vec2(0.0, -texel.y)).rgb);

      float lAvg = 0.25 * (lLeft + lRight + lUp + lDown);
      // Darken concave luminance valleys (crevices, rail trenches, prop contact seams)
      // while leaving emissive peaks (> 0.65 luma) completely untouched
      float cavity = max(0.0, lAvg - lCenter);
      float nonEmissiveMask = smoothstep(0.72, 0.18, lCenter);
      float aoFactor = clamp(1.0 - cavity * uAoStrength * 3.8 * nonEmissiveMask, 0.68, 1.0);
      col *= aoFactor;

      // Filmic Vibrance boost for neon cyan, magenta, solar gold, and violet
      float maxC = max(col.r, max(col.g, col.b));
      float minC = min(col.r, min(col.g, col.b));
      float sat = maxC - minC;
      float luma = getLuma(col);
      col = mix(vec3(luma), col, 1.0 + uVibrance * (1.0 - sat * 0.65));

      gl_FragColor = vec4(max(col, vec3(0.0)), baseSample.a);
    }
  `,
};

interface PooledObstacle {
  data: ObstacleInstanceData;
  mesh: THREE.Group;
  aoShadow: THREE.Mesh | null;
}

interface PooledCollectible {
  data: CollectibleInstanceData;
  mesh: THREE.Group;
}

interface ParticleSlot {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  scale: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface SpeedLineSlot {
  x: number;
  y: number;
  z: number;
  len: number;
  speedMult: number;
}

export interface HudDomRefs {
  scoreEl: HTMLElement | null;
  distanceEl: HTMLElement | null;
  coinsEl: HTMLElement | null;
  tokensEl: HTMLElement | null;
  multiplierEl: HTMLElement | null;
  speedEl: HTMLElement | null;
  biomeEl: HTMLElement | null;
  fpsEl: HTMLElement | null;
  vortexBarEl: HTMLElement | null;
  vortexWrapEl: HTMLElement | null;
  bootsBarEl: HTMLElement | null;
  bootsWrapEl: HTMLElement | null;
  gliderBarEl: HTMLElement | null;
  gliderWrapEl: HTMLElement | null;
  aegisBarEl: HTMLElement | null;
  aegisWrapEl: HTMLElement | null;
}

export interface EngineCallbacks {
  onRunEnd: (snapshot: RunStatsSnapshot, updatedSave: SaveData) => void;
  onMissionBanner: (title: string) => void;
  onSaveUpdated: (save: SaveData) => void;
}

const _dummyObj = new THREE.Object3D();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 1.4, -8);
const _skyTargetColor = new THREE.Color();

const BIOME_PALETTES: Record<
  BiomeType,
  { sky: number; fog: number; pillar: number; neon: number; sun: number; label: string }
> = {
  station: {
    sky: 0x0e1842,
    fog: 0x152562,
    pillar: 0x263868,
    neon: 0x00f5d4,
    sun: 0xff2a85,
    label: 'SECTOR 01 · NEON STATION',
  },
  elevated: {
    sky: 0x280d4c,
    fog: 0x3b136c,
    pillar: 0x4a1985,
    neon: 0xff6b00,
    sun: 0xffbe0b,
    label: 'SECTOR 02 · SKYRAIL VIADUCT',
  },
  tunnel: {
    sky: 0x140b38,
    fog: 0x1f1152,
    pillar: 0x232d54,
    neon: 0xff1e56,
    sun: 0x00bbf9,
    label: 'SECTOR 03 · SUB-METRO TUNNEL',
  },
  downtown: {
    sky: 0x092954,
    fog: 0x103b75,
    pillar: 0x1d4ed8,
    neon: 0x00f5d4,
    sun: 0xe879f9,
    label: 'SECTOR 04 · CYBER DOWNTOWN',
  },
};

export class TrackshiftEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private aoVibrancePass: ShaderPass;
  private outputPass: OutputPass;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private playerLight: THREE.PointLight;
  private accentLight: THREE.PointLight;
  private fog: THREE.FogExp2;

  private isHeadless: boolean;
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private fpsFrames = 0;
  private fpsTimer = 0;
  private currentFps = 60;

  private gameState: GameState = 'title';
  private saveData: SaveData;
  private callbacks: EngineCallbacks;
  private hudRefs: HudDomRefs = {
    scoreEl: null,
    distanceEl: null,
    coinsEl: null,
    tokensEl: null,
    multiplierEl: null,
    speedEl: null,
    biomeEl: null,
    fpsEl: null,
    vortexBarEl: null,
    vortexWrapEl: null,
    bootsBarEl: null,
    bootsWrapEl: null,
    gliderBarEl: null,
    gliderWrapEl: null,
    aegisBarEl: null,
    aegisWrapEl: null,
  };

  // Player & Drone rigs
  private courier: CourierRig;
  private drone: THREE.Group;
  private horizonGroup: THREE.Group;
  private horizonSunMat!: THREE.MeshBasicMaterial;
  private currentLane: LaneIndex = 0;
  private playerX = 0;
  private laneTilt = 0;
  private rampPitch = 0;
  private isOnRampSlope = false;
  private runCyclePhase = 0;
  private trailSpawnTimer = 0;
  private squashY = 1;
  private squashX = 1;
  private dronePursuitZ = 2.15;
  private invulnerableTimer = 0;
  private hitstopTimer = 0;
  private cameraTrauma = 0;
  private titleOrbitAngle = 0;

  private vertState: VerticalPhysicsState = {
    y: 0,
    vy: 0,
    groundY: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    coyoteTimer: 0.1,
    jumpBufferTimer: 0,
  };

  // Input edge queues
  private queuedLaneDelta: number[] = [];
  private jumpJustPressed = false;
  private slideJustPressed = false;

  // Run telemetry
  private score = 0;
  private distance = 0;
  private runCoins = 0;
  private runTokens = 0;
  private coinComboPitch = 0;
  private coinComboTimer = 0;
  private currentBiome: BiomeType = 'station';
  private powerUps: ActivePowerUps = {
    vortex: 0,
    boots: 0,
    glider: 0,
    aegis: 0,
  };

  // Endless world chunks & pools
  private trackChunks: THREE.Group[] = [];
  private neonTrimMaterials: THREE.MeshStandardMaterial[] = [];
  private pillarMaterials: THREE.MeshStandardMaterial[] = [];
  private envAoMaterials: THREE.MeshBasicMaterial[] = [];
  private obstaclePools: Record<ObstacleType, PooledObstacle[]> = {
    train_stationary: [],
    train_moving: [],
    train_ramp: [],
    barrier_low: [],
    gate_high: [],
  };
  private collectiblePools: Record<CollectibleKind, PooledCollectible[]> = {
    coin: [],
    token: [],
    vortex: [],
    boots: [],
    glider: [],
    aegis: [],
  };
  private activeObstacles: PooledObstacle[] = [];
  private activeCollectibles: PooledCollectible[] = [];
  private nextSpawnZ = -28;
  private idCounter = 1;

  // Pooled InstancedMesh particles & 3D Neon Speed Lines
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private readonly maxParticles = 140;

  private speedLinesMesh: THREE.InstancedMesh;
  private speedLines: SpeedLineSlot[] = [];
  private readonly maxSpeedLines = 32;

  // Textures to dispose
  private trackTex: THREE.CanvasTexture;
  private buildingTex: THREE.CanvasTexture;
  private billboardTex: THREE.CanvasTexture;
  private hazardTex: THREE.CanvasTexture;
  private aoTex: THREE.CanvasTexture;
  private propAoTex: THREE.CanvasTexture;

  constructor(container: HTMLElement, initialSave: SaveData, callbacks: EngineCallbacks) {
    this.container = container;
    this.saveData = initialSave;
    this.callbacks = callbacks;

    this.isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BIOME_PALETTES.station.sky);
    this.fog = new THREE.FogExp2(BIOME_PALETTES.station.fog, 0.0082);
    this.scene.fog = this.fog;

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 195);
    this.camera.position.set(0, 4.4, 7.2);
    this.camera.lookAt(0, 1.4, -8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isHeadless && initialSave.settings.graphicsQuality === 'high',
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });

    // Detect software WebGL rasterizers (SwiftShader / llvmpipe in headless browsers)
    try {
      const gl = this.renderer.getContext();
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = dbg
        ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
        : '';
      if (/SwiftShader|llvmpipe|Software|SubZero/i.test(rendererStr)) {
        this.isHeadless = true;
      }
    } catch {
      // Ignore context query errors
    }

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setSize(width, height);

    // Clear container and mount canvas
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(this.renderer.domElement);

    // Initialize Post-Processing Pipeline:
    // 1. RenderPass -> 2. Dynamic Ambient Occlusion & Vibrance ShaderPass -> 3. Subtle UnrealBloomPass -> 4. ACES Filmic OutputPass
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.aoVibrancePass = new ShaderPass(DynamicAOVibranceShader);
    this.aoVibrancePass.uniforms['uResolution'].value.set(width, height);
    this.aoVibrancePass.uniforms['uAoStrength'].value = 0.42;
    this.aoVibrancePass.uniforms['uVibrance'].value = 0.26;
    this.composer.addPass(this.aoVibrancePass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(height / 2))),
      0.18, // subtle, crisp bloom strength so neon glows without washing out character details
      0.24, // tight bloom radius
      0.9   // high threshold so only bright neon emissives bloom
    );
    this.composer.addPass(this.bloomPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    // Studio reflection environment
    if (!this.isHeadless) {
      try {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
      } catch {
        // Fallback if PMREM fails
      }
    }

    // Balanced Studio Lighting with reduced glare on tracks and trains
    this.hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0xf43f5e, 1.05);
    this.hemiLight.position.set(0, 40, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.65);
    this.dirLight.position.set(15, 32, 18);
    this.dirLight.castShadow =
      !this.isHeadless && this.saveData.settings.graphicsQuality === 'high';
    this.dirLight.shadow.mapSize.set(2048, 2048);
    const d = 16;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 75;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);

    this.playerLight = new THREE.PointLight(0x00f5d4, 0.4, 9, 1.8);
    this.playerLight.position.set(0, 2.6, 1.6);
    this.scene.add(this.playerLight);

    this.accentLight = new THREE.PointLight(0xff2a85, 0.45, 14, 1.8);
    this.accentLight.position.set(-3.5, 4.5, -4.0);
    this.scene.add(this.accentLight);

    this.applyGraphicsSettings();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.trackTex = createTrackBedTexture(maxAniso);
    this.buildingTex = createBuildingFacadeTexture(maxAniso);
    this.billboardTex = createBillboardTexture(maxAniso);
    this.hazardTex = createHazardStripeTexture(maxAniso);
    this.aoTex = createAmbientOcclusionTexture();
    this.propAoTex = createPropOcclusionTexture();

    // Initialize Courier & Security Drone
    const charCos =
      CHARACTERS.find((c) => c.id === this.saveData.selectedCharacter) || CHARACTERS[0];
    const boardCos =
      HOVERBOARDS.find((b) => b.id === this.saveData.selectedBoard) || HOVERBOARDS[0];
    this.courier = createCourierRig(charCos, boardCos);
    this.scene.add(this.courier.root);

    this.drone = createSecurityDroneMesh();
    this.drone.position.set(1.65, 2.25, -2.2);
    this.scene.add(this.drone);

    // Build Synthwave Horizon Backdrop Vista
    this.horizonGroup = this.createHorizonVista();
    this.scene.add(this.horizonGroup);

    // Build endless track segments & object pools
    this.initTrackChunks();
    this.initObjectPools();

    // Initialize pooled particle InstancedMesh
    const partGeo = new THREE.OctahedronGeometry(0.14, 0);
    const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(partGeo, partMat, this.maxParticles);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 0,
        life: 0,
        maxLife: 0.5,
        color: new THREE.Color(0x00f5d4),
      });
      _dummyObj.scale.setScalar(0);
      _dummyObj.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummyObj.matrix);
      this.particleMesh.setColorAt(i, new THREE.Color(0x00f5d4));
    }
    this.scene.add(this.particleMesh);

    // Initialize 3D High-Speed Wind / Neon Streak InstancedMesh
    const streakGeo = new THREE.BoxGeometry(0.035, 0.035, 1.0);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
    });
    this.speedLinesMesh = new THREE.InstancedMesh(streakGeo, streakMat, this.maxSpeedLines);
    this.speedLinesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.speedLinesMesh.frustumCulled = false;
    const streakPalette = [0x00f5d4, 0xff2a85, 0xffbe0b, 0x38bdf8];
    for (let i = 0; i < this.maxSpeedLines; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const slot: SpeedLineSlot = {
        x: side * (4.3 + (i % 5) * 0.65),
        y: 1.0 + ((i * 7) % 9) * 0.85,
        z: -((i * 13) % 90),
        len: 3.5 + (i % 4) * 1.4,
        speedMult: 1.25 + (i % 3) * 0.2,
      };
      this.speedLines.push(slot);
      _dummyObj.position.set(slot.x, slot.y, slot.z);
      _dummyObj.rotation.set(0, 0, 0);
      _dummyObj.scale.set(1, 1, slot.len);
      _dummyObj.updateMatrix();
      this.speedLinesMesh.setMatrixAt(i, _dummyObj.matrix);
      this.speedLinesMesh.setColorAt(
        i,
        new THREE.Color(streakPalette[i % streakPalette.length])
      );
    }
    this.scene.add(this.speedLinesMesh);

    // Pre-warm shaders
    this.renderer.compile(this.scene, this.camera);

    // Start loop
    this.lastFrameTime = performance.now();
    this.loop(this.lastFrameTime);
  }

  private createHorizonVista(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(0, 0, -135);

    // Outer Halo Ring around the Synthwave Sun
    const outerHaloMat = new THREE.MeshBasicMaterial({
      color: 0xff2a85,
      transparent: true,
      opacity: 0.22,
      fog: false,
    });
    const outerHalo = new THREE.Mesh(new THREE.CircleGeometry(32, 36), outerHaloMat);
    outerHalo.position.set(0, 16, -10.5);
    group.add(outerHalo);

    // Giant Glowing Synthwave Cyber-Sun Disc on the Horizon
    this.horizonSunMat = new THREE.MeshBasicMaterial({
      color: 0xff2a85,
      fog: false,
    });
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(25, 36), this.horizonSunMat);
    sunDisc.position.set(0, 16, -10);
    group.add(sunDisc);

    // Inner bright solar-gold core
    const innerSunMat = new THREE.MeshBasicMaterial({
      color: 0xfff056,
      fog: false,
    });
    const innerSun = new THREE.Mesh(new THREE.CircleGeometry(17, 32), innerSunMat);
    innerSun.position.set(0, 17, -9.8);
    group.add(innerSun);

    // Horizon synthwave scanline silhouette bars cutting across the lower sun
    const barMat = new THREE.MeshBasicMaterial({ color: 0x090d1e, fog: false });
    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(58, 0.9 + i * 0.15, 0.2), barMat);
      bar.position.set(0, 3.2 + i * 2.4, -9.5);
      group.add(bar);
    }

    // Distant Megastructure Citadel Spires framing the sun
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      aoMap: this.aoTex,
      aoMapIntensity: 0.85,
      emissive: 0x3b0764,
      emissiveIntensity: 0.45,
      roughness: 0.35,
    });
    const spireOffsets = [-44, -32, -21, -12, 12, 21, 32, 44];
    spireOffsets.forEach((ox, idx) => {
      const h = 24 + (idx % 4) * 11;
      const tower = new THREE.Mesh(new THREE.BoxGeometry(6.5, h, 6.5), spireMat);
      tower.position.set(ox, h * 0.5 - 2, -6);
      group.add(tower);

      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 7, 8),
        this.horizonSunMat
      );
      beacon.position.set(ox, h + 1.5, -6);
      group.add(beacon);
    });

    return group;
  }

  private initTrackChunks(): void {
    const chunkLen = 20;
    const numChunks = 11;

    const bedGeo = new THREE.PlaneGeometry(11.6, chunkLen);
    bedGeo.rotateX(-Math.PI / 2);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.trackTex,
      aoMap: this.aoTex,
      aoMapIntensity: 0.65,
      roughness: 0.48,
      metalness: 0.28,
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      aoMap: this.aoTex,
      aoMapIntensity: 0.88,
      emissive: 0x0f172a,
      emissiveIntensity: 0.22,
      roughness: 0.48,
      metalness: 0.38,
    });
    this.pillarMaterials.push(wallMat);

    // Subtle low-glare platform curb trim (reduced from 1.12 to 0.38 emissiveIntensity)
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 0.38,
      roughness: 0.28,
    });
    this.neonTrimMaterials.push(neonMat);

    const magentaNeonMat = new THREE.MeshStandardMaterial({
      color: 0xff2a85,
      emissive: 0xff1e56,
      emissiveIntensity: 0.52,
      roughness: 0.24,
    });

    const amberNeonMat = new THREE.MeshStandardMaterial({
      color: 0xffbe0b,
      emissive: 0xff9e00,
      emissiveIntensity: 0.52,
      roughness: 0.24,
    });

    const billboardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.billboardTex,
      aoMap: this.aoTex,
      aoMapIntensity: 0.5,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.32,
      roughness: 0.22,
    });

    const skylineMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.buildingTex,
      aoMap: this.aoTex,
      aoMapIntensity: 0.9,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.28,
      roughness: 0.38,
      metalness: 0.32,
    });

    const cableMat = new THREE.MeshBasicMaterial({ color: 0x334155 });

    // Shared dynamic Ambient Occlusion contact material for trackside props
    const propContactAoMat = new THREE.MeshBasicMaterial({
      map: this.propAoTex,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.envAoMaterials.push(propContactAoMat);

    const pillarAoGeo = new THREE.PlaneGeometry(1.75, 1.75);
    pillarAoGeo.rotateX(-Math.PI / 2);

    const lampAoGeo = new THREE.PlaneGeometry(0.85, 0.85);
    lampAoGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < numChunks; i++) {
      const chunk = new THREE.Group();
      chunk.position.z = 20 - i * chunkLen;

      // Track ballast floor
      const bed = new THREE.Mesh(bedGeo, bedMat);
      bed.receiveShadow = true;
      chunk.add(bed);

      // Left & right raised station curbs with baked AO map
      const curbGeo = new THREE.BoxGeometry(1.9, 0.88, chunkLen);
      const lCurb = new THREE.Mesh(curbGeo, wallMat);
      lCurb.position.set(-6.25, 0.44, 0);
      const rCurb = new THREE.Mesh(curbGeo, wallMat);
      rCurb.position.set(6.25, 0.44, 0);
      chunk.add(lCurb, rCurb);

      // Thin, low-glare platform edge safety trim
      const stripGeo = new THREE.BoxGeometry(0.1, 0.1, chunkLen);
      const lStrip = new THREE.Mesh(stripGeo, neonMat);
      lStrip.position.set(-5.28, 0.86, 0);
      const rStrip = new THREE.Mesh(stripGeo, neonMat);
      rStrip.position.set(5.28, 0.86, 0);
      chunk.add(lStrip, rStrip);

      // Spaced-out Streetlamps only on every 2nd chunk (reduced track lighting clutter)
      if (i % 2 === 0) {
        const lampPostGeo = new THREE.CylinderGeometry(0.09, 0.12, 4.8, 10);
        const lPost = new THREE.Mesh(lampPostGeo, wallMat);
        lPost.position.set(-5.75, 2.8, -5);
        const rPost = new THREE.Mesh(lampPostGeo, wallMat);
        rPost.position.set(5.75, 2.8, -5);
        const lampBulbGeo = new THREE.BoxGeometry(0.85, 0.12, 0.26);
        const lBulb = new THREE.Mesh(lampBulbGeo, amberNeonMat);
        lBulb.position.set(-5.32, 5.15, -5);
        const rBulb = new THREE.Mesh(lampBulbGeo, amberNeonMat);
        rBulb.position.set(5.32, 5.15, -5);

        const lLampAo = new THREE.Mesh(lampAoGeo, propContactAoMat);
        lLampAo.position.set(-5.75, 0.89, -5);
        const rLampAo = new THREE.Mesh(lampAoGeo, propContactAoMat);
        rLampAo.position.set(5.75, 0.89, -5);
        chunk.add(lPost, rPost, lBulb, rBulb, lLampAo, rLampAo);
      }

      // High-Clearance Overhead Catenary Gantry Arch (y = 11.4, non-glowing structural steel)
      const archHeight = 11.4;
      const archPillarGeo = new THREE.BoxGeometry(0.48, archHeight, 0.48);
      const lArch = new THREE.Mesh(archPillarGeo, wallMat);
      lArch.position.set(-6.65, archHeight * 0.5, 0);
      const rArch = new THREE.Mesh(archPillarGeo, wallMat);
      rArch.position.set(6.65, archHeight * 0.5, 0);
      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.42, 0.42), wallMat);
      topBeam.position.set(0, archHeight, 0);

      const lArchAo = new THREE.Mesh(pillarAoGeo, propContactAoMat);
      lArchAo.position.set(-6.65, 0.89, 0);
      const rArchAo = new THREE.Mesh(pillarAoGeo, propContactAoMat);
      rArchAo.position.set(6.65, 0.89, 0);
      chunk.add(lArch, rArch, topBeam, lArchAo, rArchAo);

      // Overhead Catenary Power Wires above the 3 lanes (at y = 10.6)
      const wireGeo = new THREE.BoxGeometry(0.03, 0.03, chunkLen);
      for (const wx of [-2.6, 0, 2.6]) {
        const wire = new THREE.Mesh(wireGeo, cableMat);
        wire.position.set(wx, 10.6, 0);
        chunk.add(wire);
      }

      // Multi-Tiered Illuminated Skyscrapers on both flanks
      const bldgHeightL = 16 + ((i * 7) % 16);
      const bldgL = new THREE.Mesh(
        new THREE.BoxGeometry(5.8, bldgHeightL, 13.0),
        skylineMat
      );
      bldgL.position.set(-11.4, bldgHeightL * 0.5 - 1, -2);

      const bldgHeightR = 18 + ((i * 11) % 18);
      const bldgR = new THREE.Mesh(
        new THREE.BoxGeometry(5.8, bldgHeightR, 13.0),
        skylineMat
      );
      bldgR.position.set(11.4, bldgHeightR * 0.5 - 1, 2);

      // Rooftop Neon Crown Trim + Penthouse Setback on Skyscrapers
      const crownL = new THREE.Mesh(
        new THREE.BoxGeometry(6.0, 0.4, 13.2),
        i % 2 === 0 ? magentaNeonMat : neonMat
      );
      crownL.position.set(-11.4, bldgHeightL - 1, -2);

      const crownR = new THREE.Mesh(
        new THREE.BoxGeometry(6.0, 0.4, 13.2),
        i % 2 === 0 ? amberNeonMat : magentaNeonMat
      );
      crownR.position.set(11.4, bldgHeightR - 1, 2);

      // Glowing Holographic Billboards on alternating chunks
      if (i % 2 === 0) {
        const signFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.1, 5.8), magentaNeonMat);
        signFrameL.position.set(-8.25, 6.2, -2);
        const signFaceL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 2.8, 5.4), billboardMat);
        signFaceL.position.set(-8.22, 6.2, -2);
        chunk.add(signFrameL, signFaceL);
      } else {
        const signFrameR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.1, 5.8), amberNeonMat);
        signFrameR.position.set(8.25, 6.4, 2);
        const signFaceR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 2.8, 5.4), billboardMat);
        signFaceR.position.set(8.22, 6.4, 2);
        chunk.add(signFrameR, signFaceR);
      }

      chunk.add(bldgL, bldgR, crownL, crownR);
      this.scene.add(chunk);
      this.trackChunks.push(chunk);
    }
  }

  private initObjectPools(): void {
    const obsCounts: Record<ObstacleType, number> = {
      train_stationary: 9,
      train_moving: 6,
      train_ramp: 6,
      barrier_low: 12,
      gate_high: 12,
    };

    (Object.keys(obsCounts) as ObstacleType[]).forEach((type) => {
      const count = obsCounts[type];
      for (let i = 0; i < count; i++) {
        const mesh = createObstacleMesh(type, this.hazardTex, this.aoTex, this.propAoTex);
        mesh.visible = false;
        this.scene.add(mesh);
        const aoShadow = (mesh.getObjectByName('dynamicAoShadow') as THREE.Mesh) || null;
        this.obstaclePools[type].push({
          data: {
            id: 0,
            lane: 0,
            z: -999,
            type,
            length:
              type === 'train_ramp'
                ? 18.0
                : type.startsWith('train')
                  ? 13.5
                  : 0.8,
            height: type.startsWith('train')
              ? TRAIN_ROOF_HEIGHT
              : type === 'barrier_low'
                ? 1.05
                : 2.9,
            clearanceY: type === 'gate_high' ? 1.15 : 0,
            speed: 0,
            active: false,
          },
          mesh,
          aoShadow,
        });
      }
    });

    const colCounts: Record<CollectibleKind, number> = {
      coin: 95,
      token: 6,
      vortex: 3,
      boots: 3,
      glider: 3,
      aegis: 3,
    };

    (Object.keys(colCounts) as CollectibleKind[]).forEach((kind) => {
      const count = colCounts[kind];
      for (let i = 0; i < count; i++) {
        const mesh = createCollectibleMesh(kind);
        mesh.visible = false;
        this.scene.add(mesh);
        this.collectiblePools[kind].push({
          data: {
            id: 0,
            lane: 0,
            x: 0,
            y: 1,
            z: -999,
            kind,
            active: false,
          },
          mesh,
        });
      }
    });
  }

  public bindHudRefs(refs: HudDomRefs): void {
    this.hudRefs = refs;
    this.syncHudDom();
  }

  public updateSaveAndSettings(newSave: SaveData): void {
    this.saveData = newSave;
    const charCos =
      CHARACTERS.find((c) => c.id === this.saveData.selectedCharacter) || CHARACTERS[0];
    const boardCos =
      HOVERBOARDS.find((b) => b.id === this.saveData.selectedBoard) || HOVERBOARDS[0];
    applyCosmeticsToCourier(this.courier, charCos, boardCos);
    this.applyGraphicsSettings();
    audioManager.configure(
      this.saveData.settings.soundEnabled,
      this.saveData.settings.musicEnabled,
      this.gameState === 'playing'
    );
  }

  private applyGraphicsSettings(): void {
    if (!this.renderer) return;
    const isPerf =
      this.isHeadless || this.saveData.settings.graphicsQuality === 'performance';
    const pr = isPerf ? 1 : Math.min(window.devicePixelRatio || 1, 2.0);
    this.renderer.setPixelRatio(pr);
    this.renderer.shadowMap.enabled = !isPerf;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (this.dirLight) {
      this.dirLight.castShadow = !isPerf;
    }
    if (this.bloomPass) {
      this.bloomPass.enabled = this.saveData.settings.graphicsQuality === 'high';
    }
    if (this.aoVibrancePass) {
      this.aoVibrancePass.enabled = true;
    }
    if (this.composer && this.container) {
      const width = Math.max(1, this.container.clientWidth || window.innerWidth);
      const height = Math.max(1, this.container.clientHeight || window.innerHeight);
      this.composer.setPixelRatio(pr);
      this.composer.setSize(width, height);
    }
  }

  public setGameState(nextState: GameState): void {
    this.gameState = nextState;
    if (typeof document !== 'undefined') {
      document.body.dataset.state = nextState === 'loading' ? 'title' : nextState;
    }
    audioManager.configure(
      this.saveData.settings.soundEnabled,
      this.saveData.settings.musicEnabled,
      nextState === 'playing'
    );
    if (nextState !== 'playing') {
      this.clearInputs();
    }
  }

  public startNewRun(): void {
    this.clearActiveWorldEntities();

    this.currentLane = 0;
    this.playerX = 0;
    this.laneTilt = 0;
    this.rampPitch = 0;
    this.isOnRampSlope = false;
    this.runCyclePhase = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.dronePursuitZ = 2.15;
    this.invulnerableTimer = 1.5;
    this.hitstopTimer = 0;
    this.cameraTrauma = 0;

    this.vertState = {
      y: 0,
      vy: 0,
      groundY: 0,
      isJumping: false,
      isSliding: false,
      slideTimer: 0,
      coyoteTimer: 0.1,
      jumpBufferTimer: 0,
    };

    this.score = 0;
    this.distance = 0;
    this.runCoins = 0;
    this.runTokens = 0;
    this.coinComboPitch = 0;
    this.coinComboTimer = 0;
    this.currentBiome = 'station';
    this.powerUps = {
      vortex: 0,
      boots: 0,
      glider: 0,
      aegis: 0,
    };

    this.nextSpawnZ = -42;
    for (let i = 0; i < 6; i++) {
      this.spawnProceduralRow();
    }

    this.courier.root.position.set(0, 0, 0);
    this.courier.root.rotation.set(0, 0, 0);
    this.camera.position.set(0, 4.4, 7.2);
    _currentLookAt.set(0, 1.4, -8);
    this.camera.lookAt(_currentLookAt);

    this.setGameState('playing');
    this.syncHudDom();
  }

  public clearInputs(): void {
    this.queuedLaneDelta = [];
    this.jumpJustPressed = false;
    this.slideJustPressed = false;
  }

  public triggerLaneSwitch(delta: -1 | 1): void {
    if (this.gameState !== 'playing') return;
    if (this.queuedLaneDelta.length < 2) {
      this.queuedLaneDelta.push(delta);
    }
  }

  public triggerJump(): void {
    if (this.gameState !== 'playing') return;
    this.jumpJustPressed = true;
  }

  public triggerSlide(): void {
    if (this.gameState !== 'playing') return;
    this.slideJustPressed = true;
  }

  public triggerHoverboardAegis(): void {
    if (this.gameState !== 'playing') return;
    if (this.powerUps.aegis <= 0) {
      this.powerUps.aegis = AEGIS_DURATION;
      audioManager.playPowerUp();
      this.spawnParticleBurst(0, this.vertState.y + 0.5, 0, 0x10b981, 14);
    }
  }

  private clearActiveWorldEntities(): void {
    for (const obs of this.activeObstacles) {
      obs.data.active = false;
      obs.mesh.visible = false;
    }
    this.activeObstacles = [];

    for (const col of this.activeCollectibles) {
      col.data.active = false;
      col.mesh.visible = false;
    }
    this.activeCollectibles = [];
  }

  private acquireObstacle(type: ObstacleType): PooledObstacle | null {
    const pool = this.obstaclePools[type];
    for (const item of pool) {
      if (!item.data.active) {
        item.data.active = true;
        item.mesh.visible = true;
        return item;
      }
    }
    return null;
  }

  private acquireCollectible(kind: CollectibleKind): PooledCollectible | null {
    const pool = this.collectiblePools[kind];
    for (const item of pool) {
      if (!item.data.active) {
        item.data.active = true;
        item.mesh.visible = true;
        return item;
      }
    }
    return null;
  }

  private spawnProceduralRow(): void {
    const difficulty = Math.min(1, this.distance / 2200);
    const pattern = generateFairRowPattern(() => Math.random(), difficulty);
    const rowZ = this.nextSpawnZ;

    const currentSpeed = computeRunSpeed(this.distance, false);
    const rowSpacing = Math.max(24, Math.min(36, currentSpeed * 1.02));
    this.nextSpawnZ -= rowSpacing;

    const openLanes: LaneIndex[] = [];
    const roofCoinY = TRAIN_ROOF_HEIGHT + 0.85; // 3.5m

    for (let i = 0; i < 3; i++) {
      const lane = LANES[i];
      const obsType = pattern[i];

      if (obsType === 'none') {
        openLanes.push(lane);
        continue;
      }

      const pooled = this.acquireObstacle(obsType);
      if (!pooled) {
        openLanes.push(lane);
        continue;
      }

      pooled.data.id = this.idCounter++;
      pooled.data.lane = lane;
      pooled.data.z = rowZ;
      pooled.data.speed = obsType === 'train_moving' ? 11 + difficulty * 8 : 0;
      pooled.mesh.position.set(laneToWorldX(lane), 0, rowZ);
      this.activeObstacles.push(pooled);

      // Place elevated coin line following ramp slope or train roof
      if (obsType === 'train_ramp') {
        this.spawnCollectibleAt(lane, 1.35, rowZ + 7.2, 'coin');
        this.spawnCollectibleAt(lane, 2.45, rowZ + 4.2, 'coin');
        this.spawnCollectibleAt(lane, roofCoinY, rowZ + 1.0, 'coin');
        this.spawnCollectibleAt(lane, roofCoinY, rowZ - 2.0, 'coin');
        this.spawnCollectibleAt(lane, roofCoinY, rowZ - 5.0, 'coin');
      } else if (obsType === 'train_stationary' && Math.random() < 0.65) {
        for (let c = -2; c <= 2; c++) {
          this.spawnCollectibleAt(lane, roofCoinY, rowZ + c * 2.2, 'coin');
        }
      } else if (obsType === 'barrier_low') {
        this.spawnCollectibleAt(lane, 2.15, rowZ, 'coin');
      }
    }

    // Spawn line of coins in one of the open lanes
    const coinLane =
      openLanes.length > 0
        ? openLanes[Math.floor(Math.random() * openLanes.length)]
        : LANES[Math.floor(Math.random() * 3)];

    if (openLanes.length > 0) {
      for (let c = -2; c <= 2; c++) {
        this.spawnCollectibleAt(coinLane, 1.0, rowZ + c * 2.1, 'coin');
      }
    }

    // Spawn Skyrail Glider elevated coins if glider is active or randomly
    if (this.powerUps.glider > 0 || Math.random() < 0.25) {
      const skyLane = LANES[Math.floor(Math.random() * 3)];
      for (let c = -2; c <= 2; c++) {
        this.spawnCollectibleAt(skyLane, 6.4, rowZ + c * 2.2, 'coin');
      }
    }

    // Spawn Power-Up or Rare Token occasionally
    const specialRoll = Math.random();
    if (specialRoll < 0.16) {
      const powerTypes: PowerUpType[] = ['vortex', 'boots', 'glider', 'aegis'];
      const chosenPower = powerTypes[Math.floor(Math.random() * powerTypes.length)];
      this.spawnCollectibleAt(coinLane, 1.15, rowZ + rowSpacing * 0.45, chosenPower);
    } else if (specialRoll < 0.21) {
      this.spawnCollectibleAt(coinLane, 1.25, rowZ + rowSpacing * 0.45, 'token');
    }
  }

  private spawnCollectibleAt(
    lane: LaneIndex,
    y: number,
    z: number,
    kind: CollectibleKind
  ): void {
    const item = this.acquireCollectible(kind);
    if (!item) return;
    item.data.id = this.idCounter++;
    item.data.lane = lane;
    item.data.x = laneToWorldX(lane);
    item.data.y = y;
    item.data.z = z;
    item.mesh.position.set(item.data.x, y, z);
    this.activeCollectibles.push(item);
  }

  private spawnParticleBurst(
    x: number,
    y: number,
    z: number,
    hexColor: number,
    count: number
  ): void {
    if (this.saveData.settings.reducedMotion) return;
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.pos.set(x, y, z);
        p.vel.set(
          (Math.random() - 0.5) * 7,
          Math.random() * 5 + 1.5,
          (Math.random() - 0.5) * 7
        );
        p.scale = 0.9 + Math.random() * 0.6;
        p.maxLife = 0.32 + Math.random() * 0.22;
        p.life = p.maxLife;
        p.color.setHex(hexColor);
        this.particleMesh.setColorAt(i, p.color);
        spawned++;
      }
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateParticles(dt: number): void {
    let anyUpdated = false;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyUpdated = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummyObj.scale.setScalar(0);
        _dummyObj.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummyObj.matrix);
        continue;
      }
      p.pos.addScaledVector(p.vel, dt);
      p.vel.y -= 14 * dt;
      const ratio = p.life / p.maxLife;
      _dummyObj.position.copy(p.pos);
      _dummyObj.scale.setScalar(p.scale * ratio);
      _dummyObj.rotation.x += 5 * dt;
      _dummyObj.rotation.y += 5 * dt;
      _dummyObj.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummyObj.matrix);
    }
    if (anyUpdated) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateSpeedLines(dt: number, speed: number): void {
    if (this.saveData.settings.reducedMotion) {
      this.speedLinesMesh.visible = false;
      return;
    }
    this.speedLinesMesh.visible = true;
    for (let i = 0; i < this.maxSpeedLines; i++) {
      const s = this.speedLines[i];
      s.z += speed * s.speedMult * dt;
      if (s.z > 14) {
        s.z = -95 - (i % 20);
      }
      _dummyObj.position.set(s.x, s.y + this.vertState.y * 0.35, s.z);
      _dummyObj.rotation.set(0, 0, 0);
      _dummyObj.scale.set(1, 1, s.len * (speed / 22));
      _dummyObj.updateMatrix();
      this.speedLinesMesh.setMatrixAt(i, _dummyObj.matrix);
    }
    this.speedLinesMesh.instanceMatrix.needsUpdate = true;
  }

  public resize(): void {
    if (!this.container || !this.renderer) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(
        Math.max(1, Math.floor(width / 2)),
        Math.max(1, Math.floor(height / 2))
      );
    }
    if (this.aoVibrancePass) {
      this.aoVibrancePass.uniforms['uResolution'].value.set(width, height);
    }
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);

    const rawDt = (now - this.lastFrameTime) * 0.001;
    if (this.isHeadless && rawDt < 0.085) {
      return;
    }
    this.lastFrameTime = now;
    const dt = Math.min(Math.max(0.001, rawDt), 0.05);

    this.fpsFrames++;
    this.fpsTimer += rawDt;
    if (this.fpsTimer >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsTimer);
      this.fpsFrames = 0;
      this.fpsTimer = 0;
      if (this.hudRefs.fpsEl && this.saveData.settings.showFps) {
        this.hudRefs.fpsEl.textContent = `${this.currentFps} FPS`;
      }
    }

    if (this.gameState === 'title' || this.gameState === 'loading') {
      this.stepTitleShowcase(dt);
    } else if (this.gameState === 'playing') {
      this.stepGameplay(dt);
    }

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private stepTitleShowcase(dt: number): void {
    this.titleOrbitAngle += dt * 0.45;
    this.runCyclePhase += dt * 8.5;

    // On Title Showcase, rotate courier to face the camera at a heroic 3/4 angle so visor, headphones & chest core shine
    this.courier.root.position.set(0, Math.sin(this.titleOrbitAngle * 3) * 0.08, 0);
    this.courier.root.rotation.set(
      0,
      Math.PI - 0.32 + Math.sin(this.titleOrbitAngle) * 0.22,
      0
    );
    this.courier.bodyGroup.position.set(0, 0, 0);
    this.courier.bodyGroup.rotation.set(0, 0, 0);
    this.courier.headGroup.rotation.set(0, Math.sin(this.titleOrbitAngle * 1.4) * 0.14, 0);
    this.courier.boardGroup.rotation.set(0, 0, 0);
    this.courier.boardGroup.visible = true;
    this.courier.gliderWings.visible = false;
    this.courier.bootThrusters.visible = false;
    this.courier.shieldDome.visible = false;
    this.courier.thrusterFlames.visible = false;

    this.courier.leftArm.rotation.x = Math.sin(this.runCyclePhase * 0.5) * 0.25;
    this.courier.rightArm.rotation.x = -Math.sin(this.runCyclePhase * 0.5) * 0.25;
    this.courier.leftLeg.rotation.x = 0.12;
    this.courier.rightLeg.rotation.x = -0.12;

    this.drone.scale.setScalar(0.72);
    this.drone.position.set(
      1.65 + Math.cos(this.titleOrbitAngle * 1.6) * 0.25,
      2.25 + Math.sin(this.titleOrbitAngle * 2.4) * 0.14,
      -2.2
    );
    this.drone.rotation.y = Math.sin(this.titleOrbitAngle) * 0.4;

    const scrollDist = 9.5 * dt;
    for (const chunk of this.trackChunks) {
      chunk.position.z += scrollDist;
      if (chunk.position.z > 30) {
        chunk.position.z -= this.trackChunks.length * 20;
      }
    }
    this.updateSpeedLines(dt, 14);

    if (this.bloomPass) {
      this.bloomPass.strength = 0.18 + Math.sin(this.titleOrbitAngle * 2.0) * 0.02;
    }

    _targetCamPos.set(
      -0.9 + Math.sin(this.titleOrbitAngle * 0.7) * 0.35,
      2.15,
      3.85
    );
    this.camera.position.lerp(_targetCamPos, Math.min(1, dt * 5));
    _targetLookAt.set(-0.35, 1.25, -4.0);
    _currentLookAt.lerp(_targetLookAt, Math.min(1, dt * 5));
    this.camera.lookAt(_currentLookAt);
  }

  private stepGameplay(dt: number): void {
    this.updateParticles(dt);
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // Consume queued lane switch input
    if (this.queuedLaneDelta.length > 0) {
      const delta = this.queuedLaneDelta.shift()!;
      const nextLane = clampLane(this.currentLane + delta);
      if (nextLane !== this.currentLane) {
        this.currentLane = nextLane;
        this.laneTilt = -delta * 0.26;
        audioManager.playLaneSwitch();
      }
    }

    const isGliding = this.powerUps.glider > 0;
    const hasBoots = this.powerUps.boots > 0;
    const hasVortex = this.powerUps.vortex > 0;
    const hasAegis = this.powerUps.aegis > 0;

    const speed = computeRunSpeed(this.distance, isGliding);
    const distDelta = speed * dt;
    this.distance += distDelta;

    this.updateSpeedLines(dt, speed);

    // Dynamically modulate post-processing Bloom & Ambient Occlusion intensity with speed & active power-ups
    if (this.bloomPass) {
      const anyPowerActive = isGliding || hasBoots || hasVortex || hasAegis;
      const targetBloom = anyPowerActive ? 0.24 : 0.18;
      this.bloomPass.strength = THREE.MathUtils.damp(
        this.bloomPass.strength,
        targetBloom,
        6,
        dt
      );
    }
    if (this.aoVibrancePass) {
      this.aoVibrancePass.uniforms['uAoStrength'].value =
        0.42 + Math.min(0.12, (speed - 18) * 0.005);
    }

    const multiplier = this.saveData.missionLevel + (hasAegis ? 1 : 0);
    this.score += calculateScoreIncrement(distDelta, multiplier, hasBoots);

    this.saveData.missions = updateMissionsWithEvent(
      this.saveData.missions,
      'distance_run',
      this.distance,
      true
    );

    // Smooth lateral lane interpolation
    const targetX = laneToWorldX(this.currentLane);
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 16, dt);
    this.laneTilt = THREE.MathUtils.damp(this.laneTilt, 0, 10, dt);

    // Advance endless track chunks
    for (const chunk of this.trackChunks) {
      chunk.position.z += distDelta;
      if (chunk.position.z > 30) {
        chunk.position.z -= this.trackChunks.length * 20;
      }
    }

    // Advance obstacles and evaluate ramp/roof elevation & collisions BEFORE vertical step
    this.nextSpawnZ += distDelta;
    while (this.nextSpawnZ > -145) {
      this.spawnProceduralRow();
    }

    let highestSupportY = 0;
    let onRampSlopeNow = false;

    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];
      obs.data.z += (speed + obs.data.speed) * dt;
      obs.mesh.position.z = obs.data.z;

      if (obs.data.z > 24) {
        obs.data.active = false;
        obs.mesh.visible = false;
        this.activeObstacles.splice(i, 1);
        continue;
      }

      // Dynamic Ambient Occlusion modulation on obstacle contact planes based on camera proximity
      if (obs.aoShadow) {
        const proximity = 1.0 - Math.min(1.0, Math.abs(obs.data.z) / 85.0);
        const aoMat = obs.aoShadow.material as THREE.MeshBasicMaterial;
        aoMat.opacity = 0.55 + proximity * 0.3;
        const pulseScale = 1.0 + proximity * 0.06;
        obs.aoShadow.scale.set(pulseScale, 1, 1);
      }

      const outcome = evaluateObstacleInteraction(
        {
          lane: this.currentLane,
          x: this.playerX,
          y: this.vertState.y,
          isSliding: this.vertState.isSliding,
          isGliding,
        },
        obs.data
      );

      if (outcome.landedOnTrainTop) {
        if (outcome.trainTopY >= highestSupportY) {
          highestSupportY = outcome.trainTopY;
          onRampSlopeNow = Boolean(outcome.isOnRampSlope);
        }
      } else if (outcome.hitHazard && this.invulnerableTimer <= 0) {
        if (this.powerUps.aegis > 0) {
          this.powerUps.aegis = 0;
          this.invulnerableTimer = 1.4;
          this.hitstopTimer = 0.055;
          this.cameraTrauma = 0.65;
          this.dronePursuitZ = 1.75;
          obs.data.active = false;
          obs.mesh.visible = false;
          this.activeObstacles.splice(i, 1);
          audioManager.playShieldBreak();
          this.spawnParticleBurst(this.playerX, this.vertState.y + 1.0, 0, 0x00f5d4, 24);
        } else {
          this.handlePlayerCrash();
          return;
        }
      }
    }

    this.isOnRampSlope = onRampSlopeNow;
    this.vertState.groundY = highestSupportY;

    // Never allow player to sit below the current support surface (ramp or train roof)
    if (!isGliding && this.vertState.y < highestSupportY) {
      this.vertState.y = highestSupportY;
      if (this.vertState.vy < 0) {
        this.vertState.vy = 0;
      }
    }

    // Step vertical physics (jump, gravity, landing on ground or train roof)
    const physRes = stepVerticalPhysics(
      this.vertState,
      dt,
      hasBoots,
      isGliding,
      this.jumpJustPressed,
      this.slideJustPressed
    );
    this.vertState = physRes.next;
    this.jumpJustPressed = false;
    this.slideJustPressed = false;

    if (physRes.didJump) {
      audioManager.playJump(hasBoots);
      this.squashX = 0.84;
      this.squashY = 1.2;
      this.spawnParticleBurst(this.playerX, this.vertState.y + 0.1, 0, 0x00f5d4, 8);
      this.updateAndCheckMission('jumps', 1);
    }
    if (physRes.didLand) {
      audioManager.playLand();
      this.squashX = 1.22;
      this.squashY = 0.78;
      this.spawnParticleBurst(this.playerX, this.vertState.y + 0.05, 0, 0x38bdf8, 6);
    }
    if (physRes.didSlide) {
      audioManager.playSlide();
      this.squashX = 1.22;
      this.squashY = 0.6;
      this.updateAndCheckMission('slides', 1);
    }

    this.squashX = THREE.MathUtils.damp(this.squashX, 1, 12, dt);
    this.squashY = THREE.MathUtils.damp(this.squashY, 1, 12, dt);

    // Continuous neon trail sparks when climbing ramps, using hoverboard, or sprinting fast
    this.trailSpawnTimer += dt;
    if (this.trailSpawnTimer >= 0.055) {
      this.trailSpawnTimer = 0;
      if (this.isOnRampSlope || hasAegis || isGliding || hasBoots) {
        this.spawnParticleBurst(
          this.playerX + (Math.random() - 0.5) * 0.35,
          this.vertState.y + 0.12,
          0.35,
          this.isOnRampSlope ? 0x00f5d4 : hasBoots ? 0xffbe0b : 0xff2a85,
          2
        );
      }
    }

    // Step Power-up timers
    this.powerUps = stepPowerUpTimers(this.powerUps, dt);
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }
    if (this.coinComboTimer > 0) {
      this.coinComboTimer -= dt;
      if (this.coinComboTimer <= 0) {
        this.coinComboPitch = 0;
      }
    }

    // Advance & collect coins, tokens, and power-ups
    for (let i = this.activeCollectibles.length - 1; i >= 0; i--) {
      const col = this.activeCollectibles[i];
      col.data.z += distDelta;

      if (col.data.z > 14) {
        col.data.active = false;
        col.mesh.visible = false;
        this.activeCollectibles.splice(i, 1);
        continue;
      }

      const pull = computeCoinPullPosition(
        { x: col.data.x, y: col.data.y, z: col.data.z },
        { x: this.playerX, y: this.vertState.y, z: 0 },
        dt,
        hasVortex && col.data.kind === 'coin'
      );

      col.data.x = pull.x;
      col.data.y = pull.y;
      col.data.z = pull.z;
      col.mesh.position.set(pull.x, pull.y, pull.z);
      col.mesh.rotation.y += 3.4 * dt;

      if (pull.collected) {
        this.collectItem(col.data.kind, pull.x, pull.y, pull.z);
        col.data.active = false;
        col.mesh.visible = false;
        this.activeCollectibles.splice(i, 1);
      }
    }

    // Animate Courier Rig & dynamic lights
    this.animateCourierGameplay(dt, speed, isGliding, hasBoots, hasAegis);
    this.playerLight.position.set(this.playerX, this.vertState.y + 2.5, 1.5);
    this.accentLight.position.set(-this.playerX * 0.8, this.vertState.y + 3.8, -3.5);

    // Animate pursuing Security Drone on outer flank so it never blocks camera view when climbing trains
    this.drone.scale.setScalar(0.56);
    this.dronePursuitZ = THREE.MathUtils.damp(this.dronePursuitZ, 2.25, 0.6, dt);
    const droneFlankOffset = this.currentLane >= 0 ? -1.85 : 1.85;
    this.drone.position.set(
      THREE.MathUtils.damp(this.drone.position.x, this.playerX + droneFlankOffset, 5, dt),
      this.vertState.y + 1.85 + Math.sin(this.distance * 0.4) * 0.12,
      this.dronePursuitZ
    );
    this.drone.rotation.y = 0;
    this.drone.rotation.z = -this.laneTilt * 0.8;

    // Biome atmospheric transition
    const targetBiome = getBiomeForDistance(this.distance);
    if (targetBiome !== this.currentBiome) {
      this.currentBiome = targetBiome;
    }
    const pal = BIOME_PALETTES[this.currentBiome];
    _skyTargetColor.setHex(pal.sky);
    (this.scene.background as THREE.Color).lerp(_skyTargetColor, dt * 1.8);
    this.fog.color.lerp(_skyTargetColor.setHex(pal.fog), dt * 1.8);
    this.horizonSunMat.color.lerp(_skyTargetColor.setHex(pal.sun), dt * 1.8);
    for (const mat of this.neonTrimMaterials) {
      mat.color.lerp(_skyTargetColor.setHex(pal.neon), dt * 2.5);
      mat.emissive.lerp(_skyTargetColor.setHex(pal.neon), dt * 2.5);
    }

    // Smooth Third-Person Camera with trauma shake, speed FOV, and full train-top elevation tracking
    this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 1.8);
    const shakeAmt = this.saveData.settings.reducedMotion
      ? 0
      : this.cameraTrauma * this.cameraTrauma * 0.42;
    const shakeX = (Math.random() - 0.5) * shakeAmt;
    const shakeY = (Math.random() - 0.5) * shakeAmt;

    const targetFov = isGliding ? 70 : 62 + ((speed - 18) / 24) * 6;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dt);
    this.camera.updateProjectionMatrix();

    _targetCamPos.set(
      this.playerX * 0.62 + shakeX,
      3.95 + this.vertState.y * 0.88 + shakeY,
      6.45
    );
    this.camera.position.lerp(_targetCamPos, Math.min(1, dt * 14));

    _targetLookAt.set(this.playerX * 0.35, 1.45 + this.vertState.y * 0.82, -10);
    _currentLookAt.lerp(_targetLookAt, Math.min(1, dt * 16));
    this.camera.lookAt(_currentLookAt);

    this.syncHudDom();
  }

  private animateCourierGameplay(
    dt: number,
    speed: number,
    isGliding: boolean,
    hasBoots: boolean,
    hasAegis: boolean
  ): void {
    // Smoothly align pitch with ascending train ramp when climbing a ramp
    const slopeAngle = Math.atan2(TRAIN_ROOF_HEIGHT, RAMP_SLOPE_LENGTH);
    const targetPitch =
      this.isOnRampSlope && !this.vertState.isJumping && !isGliding ? slopeAngle : 0;
    this.rampPitch = THREE.MathUtils.damp(this.rampPitch, targetPitch, 18, dt);

    this.runCyclePhase += dt * speed * 0.88;
    const runBounce =
      !this.vertState.isJumping && !this.vertState.isSliding && !isGliding
        ? Math.abs(Math.sin(this.runCyclePhase)) * 0.08
        : 0;

    // Courier rig is authored facing local -Z (forward down the track), so rotation.y stays near 0 during gameplay
    this.courier.root.position.set(
      this.playerX,
      this.vertState.y + this.rampPitch * 0.12,
      0
    );
    this.courier.root.rotation.set(
      this.rampPitch * 0.55,
      -this.laneTilt * 0.35,
      this.laneTilt
    );

    const slideScaleY = this.vertState.isSliding ? 0.56 : this.squashY;
    this.courier.bodyGroup.position.set(
      0,
      this.vertState.isSliding ? 0.08 : runBounce,
      0
    );
    this.courier.bodyGroup.scale.set(this.squashX, slideScaleY, this.squashX);
    this.courier.bodyGroup.rotation.set(
      this.vertState.isSliding ? 0.28 : isGliding ? -0.38 : -0.14,
      Math.sin(this.runCyclePhase) * 0.06,
      0
    );

    // Subtle expressive head turn into the lane switch direction
    this.courier.headGroup.rotation.set(
      this.vertState.isJumping ? -0.12 : 0,
      -this.laneTilt * 0.55,
      -this.laneTilt * 0.25
    );

    this.courier.boardGroup.visible = hasAegis || isGliding || this.isOnRampSlope;
    this.courier.boardGroup.rotation.x = this.rampPitch * 0.45;
    this.courier.gliderWings.visible = isGliding;
    this.courier.bootThrusters.visible = hasBoots;
    this.courier.shieldDome.visible = hasAegis;
    if (hasAegis) {
      this.courier.shieldDome.rotation.y += dt * 2.2;
    }

    // Only activate jetpack thruster flames when jumping or gliding
    const showJetFlames = this.vertState.isJumping || isGliding;
    this.courier.thrusterFlames.visible = showJetFlames;
    if (showJetFlames) {
      const flameScale = 1.05 + Math.sin(this.runCyclePhase * 3) * 0.2;
      this.courier.thrusterFlames.scale.set(1, flameScale, 1);
    }

    if (this.vertState.isJumping || isGliding) {
      this.courier.leftArm.rotation.x = 0.75;
      this.courier.rightArm.rotation.x = -0.55;
      this.courier.leftLeg.rotation.x = 0.5;
      this.courier.rightLeg.rotation.x = -0.35;
    } else if (this.vertState.isSliding) {
      this.courier.leftArm.rotation.x = -0.45;
      this.courier.rightArm.rotation.x = -0.45;
      this.courier.leftLeg.rotation.x = 0.78;
      this.courier.rightLeg.rotation.x = 0.15;
    } else {
      const swing = Math.sin(this.runCyclePhase) * 0.72;
      this.courier.leftArm.rotation.x = swing;
      this.courier.rightArm.rotation.x = -swing;
      this.courier.leftLeg.rotation.x = -swing;
      this.courier.rightLeg.rotation.x = swing;
    }
  }

  private collectItem(kind: CollectibleKind, x: number, y: number, z: number): void {
    if (kind === 'coin') {
      this.runCoins += 1;
      this.score += 25 * this.saveData.missionLevel;
      this.coinComboPitch = Math.min(12, this.coinComboPitch + 1);
      this.coinComboTimer = 0.9;
      audioManager.playCoin(this.coinComboPitch);
      this.spawnParticleBurst(x, y, z, 0xffbe0b, 6);
      this.updateAndCheckMission('coins_total', 1);
      return;
    }

    if (kind === 'token') {
      this.runTokens += 1;
      this.score += 150 * this.saveData.missionLevel;
      audioManager.playToken();
      this.spawnParticleBurst(x, y, z, 0xff2a85, 16);
      return;
    }

    audioManager.playPowerUp();
    this.spawnParticleBurst(x, y, z, 0x00f5d4, 20);
    this.updateAndCheckMission('powerups', 1);

    if (kind === 'vortex') {
      this.powerUps.vortex = POWERUP_DURATION;
    } else if (kind === 'boots') {
      this.powerUps.boots = POWERUP_DURATION;
    } else if (kind === 'glider') {
      this.powerUps.glider = POWERUP_DURATION * 0.85;
    } else if (kind === 'aegis') {
      this.powerUps.aegis = AEGIS_DURATION;
    }
  }

  private updateAndCheckMission(
    metric: SaveData['missions'][0]['metric'],
    amount: number
  ): void {
    const beforeCompleted = this.saveData.missions.filter(
      (m) => m.progress >= m.target
    ).length;
    this.saveData.missions = updateMissionsWithEvent(
      this.saveData.missions,
      metric,
      amount,
      false
    );
    const afterCompleted = this.saveData.missions.filter(
      (m) => m.progress >= m.target
    ).length;
    if (afterCompleted > beforeCompleted) {
      const newlyDone = this.saveData.missions.find(
        (m) => m.metric === metric && m.progress >= m.target && !m.claimed
      );
      if (newlyDone) {
        audioManager.playMissionComplete();
        this.callbacks.onMissionBanner(newlyDone.title);
      }
    }
  }

  private handlePlayerCrash(): void {
    audioManager.playCrash();
    this.cameraTrauma = 1.0;
    this.spawnParticleBurst(this.playerX, this.vertState.y + 0.9, 0, 0xff1e56, 32);

    const finalScore = Math.round(this.score);
    const finalDistance = Math.round(this.distance);
    const isNewBest = finalScore > this.saveData.highScore;

    const updatedSave: SaveData = {
      ...this.saveData,
      highScore: Math.max(this.saveData.highScore, finalScore),
      coins: this.saveData.coins + this.runCoins,
      tokens: this.saveData.tokens + this.runTokens,
      totalDistance: this.saveData.totalDistance + finalDistance,
      totalRuns: this.saveData.totalRuns + 1,
    };
    this.saveData = updatedSave;

    const completedCount = updatedSave.missions.filter(
      (m) => m.progress >= m.target && !m.claimed
    ).length;

    const snapshot: RunStatsSnapshot = {
      score: finalScore,
      distance: finalDistance,
      coins: this.runCoins,
      tokens: this.runTokens,
      multiplier: updatedSave.missionLevel,
      isNewBest,
      completedMissionsCount: completedCount,
      speedReached: Math.round(computeRunSpeed(this.distance, false) * 3.6),
      biome: this.currentBiome,
    };

    this.setGameState('gameover');
    this.callbacks.onRunEnd(snapshot, updatedSave);
  }

  private syncHudDom(): void {
    const r = this.hudRefs;
    if (r.scoreEl) r.scoreEl.textContent = Math.round(this.score).toString();
    if (r.distanceEl) r.distanceEl.textContent = `${Math.round(this.distance)}m`;
    if (r.coinsEl) r.coinsEl.textContent = this.runCoins.toString();
    if (r.tokensEl) r.tokensEl.textContent = (this.saveData.tokens + this.runTokens).toString();
    if (r.multiplierEl) {
      const mult = this.saveData.missionLevel + (this.powerUps.aegis > 0 ? 1 : 0);
      r.multiplierEl.textContent = `x${mult}`;
    }
    if (r.speedEl) {
      const kmh = Math.round(
        computeRunSpeed(this.distance, this.powerUps.glider > 0) * 3.6
      );
      r.speedEl.textContent = `${kmh}`;
    }
    if (r.biomeEl) {
      r.biomeEl.textContent = BIOME_PALETTES[this.currentBiome].label;
    }

    const updateBar = (
      wrap: HTMLElement | null,
      bar: HTMLElement | null,
      rem: number,
      max: number
    ) => {
      if (!wrap || !bar) return;
      if (rem > 0.05) {
        wrap.style.display = 'flex';
        const pct = Math.max(0, Math.min(1, rem / max));
        bar.style.transform = `scaleX(${pct.toFixed(3)})`;
      } else {
        wrap.style.display = 'none';
      }
    };

    updateBar(r.vortexWrapEl, r.vortexBarEl, this.powerUps.vortex, POWERUP_DURATION);
    updateBar(r.bootsWrapEl, r.bootsBarEl, this.powerUps.boots, POWERUP_DURATION);
    updateBar(
      r.gliderWrapEl,
      r.gliderBarEl,
      this.powerUps.glider,
      POWERUP_DURATION * 0.85
    );
    updateBar(r.aegisWrapEl, r.aegisBarEl, this.powerUps.aegis, AEGIS_DURATION);
  }

  public dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.trackTex.dispose();
    this.buildingTex.dispose();
    this.billboardTex.dispose();
    this.hazardTex.dispose();
    this.aoTex.dispose();
    this.propAoTex.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
