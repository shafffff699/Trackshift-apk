export type GameState = 'loading' | 'title' | 'playing' | 'paused' | 'gameover';

export type SubModal = 'none' | 'shop' | 'missions' | 'settings';

export type LaneIndex = -1 | 0 | 1;

export type PowerUpType = 'vortex' | 'boots' | 'glider' | 'aegis';

export type BiomeType = 'station' | 'elevated' | 'tunnel' | 'downtown';

export type ObstacleType =
  | 'train_stationary'
  | 'train_moving'
  | 'barrier_low'
  | 'gate_high'
  | 'train_ramp';

export type CollectibleKind = 'coin' | 'token' | PowerUpType;

export interface CharacterCosmetic {
  id: string;
  name: string;
  role: string;
  description: string;
  costCoins: number;
  costTokens: number;
  hoodieColor: number;
  accentColor: number;
  visorColor: number;
  backpackColor: number;
  sneakerColor: number;
  badgeHex: string;
}

export interface BoardCosmetic {
  id: string;
  name: string;
  tagline: string;
  costCoins: number;
  costTokens: number;
  deckColor: number;
  glowColor: number;
  trailHex: string;
}

export type MissionMetric = 'coins_run' | 'coins_total' | 'jumps' | 'slides' | 'distance_run' | 'powerups';

export interface Mission {
  id: string;
  title: string;
  description: string;
  metric: MissionMetric;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardTokens: number;
  claimed: boolean;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  graphicsQuality: 'high' | 'performance';
  reducedMotion: boolean;
  swipeSensitivity: number; // 0.6 to 1.6
  showFps: boolean;
  onScreenControls: boolean;
}

export interface SaveData {
  highScore: number;
  coins: number;
  tokens: number;
  totalDistance: number;
  totalRuns: number;
  missionLevel: number;
  unlockedCharacters: string[];
  selectedCharacter: string;
  unlockedBoards: string[];
  selectedBoard: string;
  missions: Mission[];
  settings: GameSettings;
}

export interface ActivePowerUps {
  vortex: number; // remaining seconds
  boots: number;
  glider: number;
  aegis: number; // remaining seconds or active shield (> 0)
}

export interface RunStatsSnapshot {
  score: number;
  distance: number;
  coins: number;
  tokens: number;
  multiplier: number;
  isNewBest: boolean;
  completedMissionsCount: number;
  speedReached: number;
  biome: BiomeType;
}

export interface ObstacleInstanceData {
  id: number;
  lane: LaneIndex;
  z: number;
  type: ObstacleType;
  length: number;
  height: number;
  clearanceY: number;
  speed: number;
  active: boolean;
}

export interface CollectibleInstanceData {
  id: number;
  lane: LaneIndex;
  x: number;
  y: number;
  z: number;
  kind: CollectibleKind;
  active: boolean;
}
