import type {
  ActivePowerUps,
  BiomeType,
  BoardCosmetic,
  CharacterCosmetic,
  LaneIndex,
  Mission,
  ObstacleInstanceData,
  ObstacleType,
  SaveData,
} from './types.ts';

export const LANE_WIDTH = 2.6;
export const LANES: LaneIndex[] = [-1, 0, 1];

export const BASE_START_SPEED = 18.0;
export const MAX_RUN_SPEED = 42.0;
export const SPEED_ACCEL_PER_METER = 0.011;

export const GRAVITY = 38.0;
export const BASE_JUMP_VELOCITY = 15.6;
export const BOOTS_JUMP_VELOCITY = 19.8;
export const GLIDER_ALTITUDE = 6.2;
export const TRAIN_ROOF_HEIGHT = 2.65;
export const RAMP_SLOPE_LENGTH = 7.0;
export const SLIDE_DURATION = 0.62;
export const POWERUP_DURATION = 10.0;
export const AEGIS_DURATION = 18.0;

export const CHARACTERS: CharacterCosmetic[] = [
  {
    id: 'kairo_cyan',
    name: 'Kairo Vance',
    role: 'Grid Courier · Standard Issue',
    description: 'Electric-cyan windbreaker with hyper-luminous pulse pack and reflex sneakers.',
    costCoins: 0,
    costTokens: 0,
    hoodieColor: 0x00e5ff,
    accentColor: 0xffbe0b,
    visorColor: 0x72efdd,
    backpackColor: 0x1e293b,
    sneakerColor: 0xff5400,
    badgeHex: '#00e5ff',
  },
  {
    id: 'nyx_crimson',
    name: 'Nyx Solaris',
    role: 'Nightline Runner · Sector 9',
    description: 'Solar-crimson stealth shell with anodized gold visor and hyper-weave boots.',
    costCoins: 350,
    costTokens: 0,
    hoodieColor: 0xff1e56,
    accentColor: 0xffd000,
    visorColor: 0xfff056,
    backpackColor: 0x151934,
    sneakerColor: 0xff2a85,
    badgeHex: '#ff1e56',
  },
  {
    id: 'sol_amber',
    name: 'Volt Hiro',
    role: 'Arc Technician · Skyrail Crew',
    description: 'High-voltage amber hazard jacket with cobalt arc-cell pack and titanium treads.',
    costCoins: 750,
    costTokens: 0,
    hoodieColor: 0xff9e00,
    accentColor: 0x00f5d4,
    visorColor: 0x00bbf9,
    backpackColor: 0x1e1b4b,
    sneakerColor: 0x00f5d4,
    badgeHex: '#ff9e00',
  },
  {
    id: 'astra_violet',
    name: 'Astra Zero',
    role: 'Phantom Courier · Elite Core',
    description: 'Ultraviolet synth-weave jacket with plasma-mint visor and zero-g stabilizers.',
    costCoins: 1200,
    costTokens: 3,
    hoodieColor: 0x9d4edd,
    accentColor: 0x00f5d4,
    visorColor: 0x52b788,
    backpackColor: 0x10002b,
    sneakerColor: 0xc77dff,
    badgeHex: '#9d4edd',
  },
];

export const HOVERBOARDS: BoardCosmetic[] = [
  {
    id: 'ion_board',
    name: 'Ion Skimmer',
    tagline: 'Twin-rail cyan magnetic deck',
    costCoins: 0,
    costTokens: 0,
    deckColor: 0x0096c7,
    glowColor: 0x00f5d4,
    trailHex: '#00f5d4',
  },
  {
    id: 'solar_flare',
    name: 'Solar Flare',
    tagline: 'Thermal orange overdrive chassis',
    costCoins: 300,
    costTokens: 0,
    deckColor: 0xff5400,
    glowColor: 0xffbe0b,
    trailHex: '#ffbe0b',
  },
  {
    id: 'phantom_rail',
    name: 'Phantom Rail',
    tagline: 'Deep violet phase-shift stabilizer',
    costCoins: 650,
    costTokens: 0,
    deckColor: 0x7b2cbf,
    glowColor: 0xff4d6d,
    trailHex: '#ff4d6d',
  },
  {
    id: 'overdrive_hex',
    name: 'Emerald Apex',
    tagline: 'Quantum-mint hyper-conductor deck',
    costCoins: 950,
    costTokens: 2,
    deckColor: 0x00b4d8,
    glowColor: 0x00f5d4,
    trailHex: '#00f5d4',
  },
];

export const INITIAL_MISSIONS: Mission[] = [
  {
    id: 'm_coins_50',
    title: 'Credit Sweep',
    description: 'Collect 40 coins across runs',
    metric: 'coins_total',
    target: 40,
    progress: 0,
    rewardCoins: 120,
    rewardTokens: 1,
    claimed: false,
  },
  {
    id: 'm_jumps_12',
    title: 'Hurdle Vault',
    description: 'Jump over 12 barriers or trains',
    metric: 'jumps',
    target: 12,
    progress: 0,
    rewardCoins: 150,
    rewardTokens: 1,
    claimed: false,
  },
  {
    id: 'm_dist_500',
    title: 'Sector Sprint',
    description: 'Reach 400m in a single run',
    metric: 'distance_run',
    target: 400,
    progress: 0,
    rewardCoins: 200,
    rewardTokens: 1,
    claimed: false,
  },
  {
    id: 'm_slides_8',
    title: 'Low Clearance',
    description: 'Slide under 8 Laser Gates',
    metric: 'slides',
    target: 8,
    progress: 0,
    rewardCoins: 140,
    rewardTokens: 1,
    claimed: false,
  },
  {
    id: 'm_powerups_3',
    title: 'Tech Surge',
    description: 'Activate 3 Power-Ups in total',
    metric: 'powerups',
    target: 3,
    progress: 0,
    rewardCoins: 180,
    rewardTokens: 2,
    claimed: false,
  },
];

export function laneToWorldX(lane: LaneIndex): number {
  return lane * LANE_WIDTH;
}

export function clampLane(lane: number): LaneIndex {
  if (lane <= -1) return -1;
  if (lane >= 1) return 1;
  return 0;
}

export function computeRunSpeed(distance: number, isGliding: boolean): number {
  const base = Math.min(MAX_RUN_SPEED, BASE_START_SPEED + Math.max(0, distance) * SPEED_ACCEL_PER_METER);
  return isGliding ? Math.min(MAX_RUN_SPEED + 4, base * 1.15) : base;
}

export function getBiomeForDistance(distance: number): BiomeType {
  const cycle = Math.floor(Math.max(0, distance) / 350) % 4;
  switch (cycle) {
    case 0:
      return 'station';
    case 1:
      return 'elevated';
    case 2:
      return 'tunnel';
    default:
      return 'downtown';
  }
}

export function calculateScoreIncrement(
  distanceDelta: number,
  multiplier: number,
  hasBoots: boolean
): number {
  const bonusFactor = hasBoots ? 1.2 : 1.0;
  return Math.max(0, distanceDelta * 10 * multiplier * bonusFactor);
}

export interface VerticalPhysicsState {
  y: number;
  vy: number;
  groundY: number;
  isJumping: boolean;
  isSliding: boolean;
  slideTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
}

export function stepVerticalPhysics(
  state: VerticalPhysicsState,
  dt: number,
  hasPulseBoots: boolean,
  isGliding: boolean,
  jumpJustPressed: boolean,
  slideJustPressed: boolean
): { next: VerticalPhysicsState; didJump: boolean; didLand: boolean; didSlide: boolean } {
  const next: VerticalPhysicsState = { ...state };
  let didJump = false;
  let didLand = false;
  let didSlide = false;

  if (jumpJustPressed) {
    next.jumpBufferTimer = 0.12;
  } else {
    next.jumpBufferTimer = Math.max(0, next.jumpBufferTimer - dt);
  }

  if (isGliding) {
    next.isJumping = false;
    next.isSliding = false;
    next.slideTimer = 0;
    next.vy = 0;
    next.y += (GLIDER_ALTITUDE - next.y) * Math.min(1, dt * 10);
    return { next, didJump: false, didLand: false, didSlide: false };
  }

  // Ensure player never sinks below rising ground/ramp
  if (next.y < next.groundY) {
    next.y = next.groundY;
    if (next.vy < 0) {
      next.vy = 0;
    }
    if (next.isJumping && next.vy <= 0) {
      next.isJumping = false;
      didLand = true;
    }
  }

  const onGround = next.y <= next.groundY + 0.04 && next.vy <= 0;
  if (onGround) {
    next.coyoteTimer = 0.1;
  } else {
    next.coyoteTimer = Math.max(0, next.coyoteTimer - dt);
  }

  // Slide handling
  if (slideJustPressed) {
    next.isSliding = true;
    next.slideTimer = SLIDE_DURATION;
    next.jumpBufferTimer = 0;
    didSlide = true;
    // Fast-fall if mid-air
    if (next.y > next.groundY + 0.05) {
      next.vy = Math.min(next.vy, -24.0);
    }
  }

  if (next.isSliding) {
    next.slideTimer -= dt;
    if (next.slideTimer <= 0) {
      next.isSliding = false;
      next.slideTimer = 0;
    }
  }

  // Jump handling with buffer + coyote time
  if (next.jumpBufferTimer > 0 && next.coyoteTimer > 0) {
    next.vy = hasPulseBoots ? BOOTS_JUMP_VELOCITY : BASE_JUMP_VELOCITY;
    next.isJumping = true;
    next.isSliding = false;
    next.slideTimer = 0;
    next.jumpBufferTimer = 0;
    next.coyoteTimer = 0;
    didJump = true;
  }

  // Apply vertical velocity and gravity
  if (next.y > next.groundY || next.vy > 0) {
    next.y += next.vy * dt;
    next.vy -= GRAVITY * dt;
    if (next.y <= next.groundY) {
      next.y = next.groundY;
      if (next.vy <= 0) {
        next.vy = 0;
        if (next.isJumping) {
          didLand = true;
        }
        next.isJumping = false;
      }
    }
  } else {
    next.y = next.groundY;
    next.vy = 0;
    next.isJumping = false;
  }

  return { next, didJump, didLand, didSlide };
}

export interface PlayerCollisionState {
  lane: LaneIndex;
  x: number;
  y: number;
  isSliding: boolean;
  isGliding: boolean;
}

export interface CollisionOutcome {
  hitHazard: boolean;
  landedOnTrainTop: boolean;
  trainTopY: number;
  isOnRampSlope?: boolean;
}

export function evaluateObstacleInteraction(
  player: PlayerCollisionState,
  obstacle: ObstacleInstanceData
): CollisionOutcome {
  if (!obstacle.active) {
    return { hitHazard: false, landedOnTrainTop: false, trainTopY: 0, isOnRampSlope: false };
  }

  // Skyrail glider flies safely above all track obstacles
  if (player.isGliding && player.y >= 4.5) {
    return { hitHazard: false, landedOnTrainTop: false, trainTopY: 0, isOnRampSlope: false };
  }

  // Lateral proximity check (lane width is 2.6, obstacle half-width ~ 0.95)
  const obsX = laneToWorldX(obstacle.lane);
  if (Math.abs(player.x - obsX) > 1.05) {
    return { hitHazard: false, landedOnTrainTop: false, trainTopY: 0, isOnRampSlope: false };
  }

  // Z-axis overlap around player at Z = 0
  const halfLen = obstacle.length * 0.5;
  const frontZ = obstacle.z + halfLen;
  const backZ = obstacle.z - halfLen;
  const playerRadiusZ = 0.42;

  if (frontZ < -playerRadiusZ || backZ > playerRadiusZ) {
    return { hitHazard: false, landedOnTrainTop: false, trainTopY: 0, isOnRampSlope: false };
  }

  const playerHeight = player.isSliding ? 0.78 : 1.75;
  const playerTop = player.y + playerHeight;

  if (obstacle.type === 'barrier_low') {
    // Low barrier can be jumped over if player's feet clear height - 0.15
    if (player.y >= obstacle.height - 0.15) {
      return { hitHazard: false, landedOnTrainTop: false, trainTopY: 0, isOnRampSlope: false };
    }
    return { hitHazard: true, landedOnTrainTop: false, trainTopY: 0, isOnRampSlope: false };
  }

  if (obstacle.type === 'gate_high') {
    // High gate has bottom beam at obstacle.clearanceY (e.g., 1.15m)
    // Player clears if sliding (playerTop < clearanceY) or jumping completely above top
    if (playerTop <= obstacle.clearanceY || player.y >= obstacle.height) {
      return { hitHazard: false, landedOnTrainTop: false, trainTopY: 0, isOnRampSlope: false };
    }
    return { hitHazard: true, landedOnTrainTop: false, trainTopY: 0, isOnRampSlope: false };
  }

  // Trains (stationary, moving, or ramp)
  const trainTop = obstacle.height;
  if (obstacle.type === 'train_ramp') {
    // Ramp train has a RAMP_SLOPE_LENGTH (7.0m) sloped boarding ramp at the front (+Z end)
    // leading smoothly from y = 0 at frontZ = 0 up to y = trainTop at frontZ = RAMP_SLOPE_LENGTH.
    const distFromFrontTip = Math.max(0, frontZ);
    const rampProgress = Math.max(0, Math.min(1, distFromFrontTip / RAMP_SLOPE_LENGTH));
    const surfaceY = rampProgress * trainTop;
    const onSlope = frontZ >= -playerRadiusZ && frontZ < RAMP_SLOPE_LENGTH;

    // Entering via the front ramp slope or standing/landing on the ramp/roof
    if (onSlope || player.y >= surfaceY - 0.95) {
      return {
        hitHazard: false,
        landedOnTrainTop: true,
        trainTopY: surfaceY,
        isOnRampSlope: frontZ > 0.02 && frontZ < RAMP_SLOPE_LENGTH - 0.05,
      };
    }
    return { hitHazard: true, landedOnTrainTop: false, trainTopY: 0, isOnRampSlope: false };
  }

  // Stationary or moving train: player lands on roof if high enough
  if (player.y >= trainTop - 0.65) {
    return {
      hitHazard: false,
      landedOnTrainTop: true,
      trainTopY: trainTop,
      isOnRampSlope: false,
    };
  }

  return { hitHazard: true, landedOnTrainTop: false, trainTopY: 0, isOnRampSlope: false };
}

/**
 * Generates a guaranteed-passable 3-lane obstacle row pattern.
 * Never blocks all 3 lanes with impassable full-height trains.
 */
export function generateFairRowPattern(
  rand: () => number,
  difficulty: number
): (ObstacleType | 'none')[] {
  const pattern: (ObstacleType | 'none')[] = ['none', 'none', 'none'];
  const clampedDiff = Math.max(0, Math.min(1, difficulty));

  // Decide how many lanes have obstacles (1 to 3, but if 3, at least one is jumpable/slideable/ramp)
  const roll = rand();
  const numObstacles = roll < 0.35 - clampedDiff * 0.15 ? 1 : roll < 0.82 ? 2 : 3;

  const laneOrder = [0, 1, 2].sort(() => rand() - 0.5);
  let fullTrainCount = 0;

  for (let i = 0; i < numObstacles; i++) {
    const laneIdx = laneOrder[i];
    const typeRoll = rand();

    // Prevent all 3 lanes from being full trains
    if (fullTrainCount >= 2) {
      pattern[laneIdx] = typeRoll < 0.45 ? 'barrier_low' : typeRoll < 0.85 ? 'gate_high' : 'train_ramp';
    } else {
      if (typeRoll < 0.28) {
        pattern[laneIdx] = 'barrier_low';
      } else if (typeRoll < 0.54) {
        pattern[laneIdx] = 'gate_high';
      } else if (typeRoll < 0.78) {
        pattern[laneIdx] = 'train_stationary';
        fullTrainCount++;
      } else if (typeRoll < 0.90 && clampedDiff > 0.15) {
        pattern[laneIdx] = 'train_moving';
        fullTrainCount++;
      } else {
        pattern[laneIdx] = 'train_ramp';
      }
    }
  }

  // Safety invariant check: if all 3 lanes somehow ended up as non-passable trains, convert one to barrier_low
  const isPassable = pattern.some(
    (p) => p === 'none' || p === 'barrier_low' || p === 'gate_high' || p === 'train_ramp'
  );
  if (!isPassable) {
    pattern[laneOrder[0]] = 'barrier_low';
  }

  return pattern;
}

export function computeCoinPullPosition(
  coinPos: { x: number; y: number; z: number },
  playerPos: { x: number; y: number; z: number },
  dt: number,
  vortexActive: boolean
): { x: number; y: number; z: number; collected: boolean } {
  const dx = playerPos.x - coinPos.x;
  const dy = playerPos.y + 0.9 - coinPos.y;
  const dz = playerPos.z - coinPos.z;
  const distSq = dx * dx + dy * dy + dz * dz;

  // Direct pickup radius
  if (distSq <= 1.35 * 1.35) {
    return { x: coinPos.x, y: coinPos.y, z: coinPos.z, collected: true };
  }

  // Vortex magnet attraction radius (within 18 meters)
  if (vortexActive && distSq <= 18 * 18 && coinPos.z < 16 && coinPos.z > -4) {
    const dist = Math.sqrt(distSq);
    const pullSpeed = 28.0;
    const step = Math.min(1, (pullSpeed * dt) / Math.max(0.001, dist));
    const nx = coinPos.x + dx * step;
    const ny = coinPos.y + dy * step;
    const nz = coinPos.z + dz * step;
    const newDistSq =
      (playerPos.x - nx) ** 2 + (playerPos.y + 0.9 - ny) ** 2 + (playerPos.z - nz) ** 2;
    return {
      x: nx,
      y: ny,
      z: nz,
      collected: newDistSq <= 1.35 * 1.35,
    };
  }

  return { x: coinPos.x, y: coinPos.y, z: coinPos.z, collected: false };
}

export function stepPowerUpTimers(active: ActivePowerUps, dt: number): ActivePowerUps {
  return {
    vortex: Math.max(0, active.vortex - dt),
    boots: Math.max(0, active.boots - dt),
    glider: Math.max(0, active.glider - dt),
    aegis: Math.max(0, active.aegis - dt),
  };
}

export function updateMissionsWithEvent(
  missions: Mission[],
  metric: Mission['metric'],
  amount: number,
  isSingleRunMetric = false
): Mission[] {
  return missions.map((m) => {
    if (m.metric !== metric) return m;
    const nextProgress = isSingleRunMetric
      ? Math.max(m.progress, amount)
      : m.progress + amount;
    return {
      ...m,
      progress: Math.min(m.target, Math.floor(nextProgress)),
    };
  });
}

export function claimMission(save: SaveData, missionId: string): SaveData {
  const mission = save.missions.find((m) => m.id === missionId);
  if (!mission || mission.claimed || mission.progress < mission.target) {
    return save;
  }

  const updatedMissions = save.missions.map((m) =>
    m.id === missionId ? { ...m, claimed: true } : m
  );

  return {
    ...save,
    coins: save.coins + mission.rewardCoins,
    tokens: save.tokens + mission.rewardTokens,
    missionLevel: save.missionLevel + 1,
    missions: updatedMissions,
  };
}

export function purchaseCharacter(save: SaveData, charId: string): { next: SaveData; ok: boolean } {
  const item = CHARACTERS.find((c) => c.id === charId);
  if (!item) return { next: save, ok: false };
  if (save.unlockedCharacters.includes(charId)) {
    return {
      next: { ...save, selectedCharacter: charId },
      ok: true,
    };
  }
  if (save.coins < item.costCoins || save.tokens < item.costTokens) {
    return { next: save, ok: false };
  }
  return {
    next: {
      ...save,
      coins: save.coins - item.costCoins,
      tokens: save.tokens - item.costTokens,
      unlockedCharacters: [...save.unlockedCharacters, charId],
      selectedCharacter: charId,
    },
    ok: true,
  };
}

export function purchaseBoard(save: SaveData, boardId: string): { next: SaveData; ok: boolean } {
  const item = HOVERBOARDS.find((b) => b.id === boardId);
  if (!item) return { next: save, ok: false };
  if (save.unlockedBoards.includes(boardId)) {
    return {
      next: { ...save, selectedBoard: boardId },
      ok: true,
    };
  }
  if (save.coins < item.costCoins || save.tokens < item.costTokens) {
    return { next: save, ok: false };
  }
  return {
    next: {
      ...save,
      coins: save.coins - item.costCoins,
      tokens: save.tokens - item.costTokens,
      unlockedBoards: [...save.unlockedBoards, boardId],
      selectedBoard: boardId,
    },
    ok: true,
  };
}
