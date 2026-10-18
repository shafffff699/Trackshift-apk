import { CHARACTERS, HOVERBOARDS, INITIAL_MISSIONS } from './rules';
import { SaveData } from './types';

const STORAGE_KEY = 'trackshift_neon_run_save_v1';

let memoryFallback: SaveData | null = null;

export function createDefaultSaveData(): SaveData {
  return {
    highScore: 0,
    coins: 250, // starter coins so players can test or save up quickly
    tokens: 1,
    totalDistance: 0,
    totalRuns: 0,
    missionLevel: 1,
    unlockedCharacters: ['kairo_cyan'],
    selectedCharacter: 'kairo_cyan',
    unlockedBoards: ['ion_board'],
    selectedBoard: 'ion_board',
    missions: INITIAL_MISSIONS.map((m) => ({ ...m })),
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      graphicsQuality: 'high',
      reducedMotion: false,
      swipeSensitivity: 1.0,
      showFps: false,
      onScreenControls: false,
    },
  };
}

export function loadSaveData(): SaveData {
  const defaults = createDefaultSaveData();
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return memoryFallback ? { ...memoryFallback } : defaults;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const validChars = new Set(CHARACTERS.map((c) => c.id));
    const validBoards = new Set(HOVERBOARDS.map((b) => b.id));

    const unlockedCharacters = Array.isArray(parsed.unlockedCharacters)
      ? parsed.unlockedCharacters.filter((id) => validChars.has(id))
      : defaults.unlockedCharacters;
    if (!unlockedCharacters.includes('kairo_cyan')) {
      unlockedCharacters.unshift('kairo_cyan');
    }

    const unlockedBoards = Array.isArray(parsed.unlockedBoards)
      ? parsed.unlockedBoards.filter((id) => validBoards.has(id))
      : defaults.unlockedBoards;
    if (!unlockedBoards.includes('ion_board')) {
      unlockedBoards.unshift('ion_board');
    }

    const selectedCharacter =
      parsed.selectedCharacter && unlockedCharacters.includes(parsed.selectedCharacter)
        ? parsed.selectedCharacter
        : 'kairo_cyan';

    const selectedBoard =
      parsed.selectedBoard && unlockedBoards.includes(parsed.selectedBoard)
        ? parsed.selectedBoard
        : 'ion_board';

    const missions = Array.isArray(parsed.missions) && parsed.missions.length > 0
      ? INITIAL_MISSIONS.map((def) => {
          const savedM = parsed.missions?.find((m) => m.id === def.id);
          return savedM
            ? {
                ...def,
                progress: Math.min(def.target, Math.max(0, Number(savedM.progress) || 0)),
                claimed: Boolean(savedM.claimed),
              }
            : { ...def };
        })
      : defaults.missions;

    return {
      highScore: Math.max(0, Math.floor(Number(parsed.highScore) || 0)),
      coins: Math.max(0, Math.floor(Number(parsed.coins) ?? defaults.coins)),
      tokens: Math.max(0, Math.floor(Number(parsed.tokens) ?? defaults.tokens)),
      totalDistance: Math.max(0, Math.floor(Number(parsed.totalDistance) || 0)),
      totalRuns: Math.max(0, Math.floor(Number(parsed.totalRuns) || 0)),
      missionLevel: Math.max(1, Math.floor(Number(parsed.missionLevel) || 1)),
      unlockedCharacters,
      selectedCharacter,
      unlockedBoards,
      selectedBoard,
      missions,
      settings: {
        soundEnabled: parsed.settings?.soundEnabled ?? defaults.settings.soundEnabled,
        musicEnabled: parsed.settings?.musicEnabled ?? defaults.settings.musicEnabled,
        graphicsQuality:
          parsed.settings?.graphicsQuality === 'performance' ? 'performance' : 'high',
        reducedMotion: Boolean(parsed.settings?.reducedMotion),
        swipeSensitivity: Math.min(
          1.6,
          Math.max(0.6, Number(parsed.settings?.swipeSensitivity) || 1.0)
        ),
        showFps: Boolean(parsed.settings?.showFps),
        onScreenControls: Boolean(parsed.settings?.onScreenControls),
      },
    };
  } catch {
    return memoryFallback ? { ...memoryFallback } : defaults;
  }
}

export function writeSaveData(data: SaveData): void {
  memoryFallback = { ...data };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // Ignore storage quota or private-mode errors safely
  }
}
