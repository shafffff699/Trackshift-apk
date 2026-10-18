import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AegisSvgIcon,
  BootsSvgIcon,
  CoinSvgIcon,
  GliderSvgIcon,
  PauseSvgIcon,
  SoundOffSvgIcon,
  SoundOnSvgIcon,
  TokenSvgIcon,
  TrackshiftTitleSvg,
  VortexSvgIcon,
} from './components/GameIcons';
import {
  GameOverModal,
  PauseModal,
  PowerUpHudSlot,
  SubModalOverlay,
} from './components/GameModals';
import { audioManager } from './game/AudioManager';
import { TrackshiftEngine } from './game/GameEngine';
import { CHARACTERS, HOVERBOARDS } from './game/rules';
import { loadSaveData, writeSaveData } from './game/SaveManager';
import { GameState, RunStatsSnapshot, SaveData, SubModal } from './game/types';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<TrackshiftEngine | null>(null);

  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const saveDataRef = useRef<SaveData>(saveData);

  const [gameState, setGameState] = useState<GameState>('title');
  const gameStateRef = useRef<GameState>('title');

  const [subModal, setSubModal] = useState<SubModal>('none');
  const subModalRef = useRef<SubModal>('none');

  const [lastRunSnapshot, setLastRunSnapshot] = useState<RunStatsSnapshot | null>(null);
  const [missionToast, setMissionToast] = useState<string | null>(null);

  // Direct DOM refs for 60Hz HUD updates without React re-renders
  const scoreElRef = useRef<HTMLDivElement | null>(null);
  const distanceElRef = useRef<HTMLDivElement | null>(null);
  const coinsElRef = useRef<HTMLSpanElement | null>(null);
  const tokensElRef = useRef<HTMLSpanElement | null>(null);
  const multiplierElRef = useRef<HTMLSpanElement | null>(null);
  const speedElRef = useRef<HTMLSpanElement | null>(null);
  const biomeElRef = useRef<HTMLDivElement | null>(null);
  const fpsElRef = useRef<HTMLDivElement | null>(null);

  const vortexWrapRef = useRef<HTMLDivElement | null>(null);
  const vortexBarRef = useRef<HTMLDivElement | null>(null);
  const bootsWrapRef = useRef<HTMLDivElement | null>(null);
  const bootsBarRef = useRef<HTMLDivElement | null>(null);
  const gliderWrapRef = useRef<HTMLDivElement | null>(null);
  const gliderBarRef = useRef<HTMLDivElement | null>(null);
  const aegisWrapRef = useRef<HTMLDivElement | null>(null);
  const aegisBarRef = useRef<HTMLDivElement | null>(null);

  // Touch / Pointer swipe tracking
  const swipeStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    consumed: boolean;
  } | null>(null);

  const updateSave = useCallback((nextSave: SaveData) => {
    saveDataRef.current = nextSave;
    setSaveData(nextSave);
    writeSaveData(nextSave);
    engineRef.current?.updateSaveAndSettings(nextSave);
  }, []);

  const handleStartRun = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSubModal('none');
    subModalRef.current = 'none';
    setGameState('playing');
    gameStateRef.current = 'playing';
    document.body.dataset.state = 'playing';
    audioManager.playButton();
    engineRef.current?.startNewRun();
  }, []);

  const handlePauseRun = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    setGameState('paused');
    gameStateRef.current = 'paused';
    document.body.dataset.state = 'paused';
    engineRef.current?.setGameState('paused');
    audioManager.playButton();
  }, []);

  const handleResumeRun = useCallback(() => {
    if (gameStateRef.current !== 'paused') return;
    setSubModal('none');
    subModalRef.current = 'none';
    setGameState('playing');
    gameStateRef.current = 'playing';
    document.body.dataset.state = 'playing';
    engineRef.current?.setGameState('playing');
    audioManager.playButton();
  }, []);

  const handleReturnToTitle = useCallback(() => {
    setSubModal('none');
    subModalRef.current = 'none';
    setGameState('title');
    gameStateRef.current = 'title';
    document.body.dataset.state = 'title';
    engineRef.current?.setGameState('title');
    audioManager.playButton();
  }, []);

  const handleToggleMute = useCallback(() => {
    const current = saveDataRef.current;
    const nextMuted = !current.settings.soundEnabled;
    updateSave({
      ...current,
      settings: {
        ...current.settings,
        soundEnabled: nextMuted,
      },
    });
  }, [updateSave]);

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    document.body.dataset.state = 'title';

    const engine = new TrackshiftEngine(mount, saveDataRef.current, {
      onRunEnd: (snapshot, updatedSave) => {
        saveDataRef.current = updatedSave;
        setSaveData(updatedSave);
        writeSaveData(updatedSave);
        setLastRunSnapshot(snapshot);
        setGameState('gameover');
        gameStateRef.current = 'gameover';
      },
      onMissionBanner: (title) => {
        setMissionToast(`MISSION COMPLETE: ${title}`);
        window.setTimeout(() => {
          setMissionToast(null);
        }, 3200);
      },
      onSaveUpdated: (updatedSave) => {
        saveDataRef.current = updatedSave;
        setSaveData(updatedSave);
        writeSaveData(updatedSave);
      },
    });

    engineRef.current = engine;
    engine.bindHudRefs({
      scoreEl: scoreElRef.current,
      distanceEl: distanceElRef.current,
      coinsEl: coinsElRef.current,
      tokensEl: tokensElRef.current,
      multiplierEl: multiplierElRef.current,
      speedEl: speedElRef.current,
      biomeEl: biomeElRef.current,
      fpsEl: fpsElRef.current,
      vortexWrapEl: vortexWrapRef.current,
      vortexBarEl: vortexBarRef.current,
      bootsWrapEl: bootsWrapRef.current,
      bootsBarEl: bootsBarRef.current,
      gliderWrapEl: gliderWrapRef.current,
      gliderBarEl: gliderBarRef.current,
      aegisWrapEl: aegisWrapRef.current,
      aegisBarEl: aegisBarRef.current,
    });

    // Support ?autostart=1 query param
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setGameState('playing');
      gameStateRef.current = 'playing';
      document.body.dataset.state = 'playing';
      engine.startNewRun();
    }

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    const resizeObs =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => engine.resize())
        : null;
    resizeObs?.observe(mount);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObs?.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Re-bind HUD DOM refs whenever gameState changes
  useEffect(() => {
    engineRef.current?.bindHudRefs({
      scoreEl: scoreElRef.current,
      distanceEl: distanceElRef.current,
      coinsEl: coinsElRef.current,
      tokensEl: tokensElRef.current,
      multiplierEl: multiplierElRef.current,
      speedEl: speedElRef.current,
      biomeEl: biomeElRef.current,
      fpsEl: fpsElRef.current,
      vortexWrapEl: vortexWrapRef.current,
      vortexBarEl: vortexBarRef.current,
      bootsWrapEl: bootsWrapRef.current,
      bootsBarEl: bootsBarRef.current,
      gliderWrapEl: gliderWrapRef.current,
      gliderBarEl: gliderBarRef.current,
      aegisWrapEl: aegisWrapRef.current,
      aegisBarEl: aegisBarRef.current,
    });
  }, [gameState]);

  // Global keyboard controls & focus-loss input clearing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const state = gameStateRef.current;
      const modal = subModalRef.current;

      // Start from Title or Game Over via Enter / Space when no sub-modal is open
      if ((state === 'title' || state === 'gameover') && modal === 'none') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartRun();
          return;
        }
      }

      if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (modal !== 'none') {
          setSubModal('none');
          subModalRef.current = 'none';
          return;
        }
        if (state === 'playing') {
          handlePauseRun();
        } else if (state === 'paused') {
          handleResumeRun();
        }
        return;
      }

      if (state === 'playing') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          e.preventDefault();
          engineRef.current?.triggerLaneSwitch(-1);
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          e.preventDefault();
          engineRef.current?.triggerLaneSwitch(1);
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
          e.preventDefault();
          engineRef.current?.triggerJump();
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          e.preventDefault();
          engineRef.current?.triggerSlide();
        } else if (e.code === 'KeyE' || e.code === 'ShiftLeft') {
          e.preventDefault();
          engineRef.current?.triggerHoverboardAegis();
        } else if (e.code === 'KeyR') {
          e.preventDefault();
          handleStartRun();
        }
      }
    };

    const onBlurOrVisibility = () => {
      engineRef.current?.clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlurOrVisibility);
    document.addEventListener('visibilitychange', onBlurOrVisibility);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlurOrVisibility);
      document.removeEventListener('visibilitychange', onBlurOrVisibility);
    };
  }, [handlePauseRun, handleResumeRun, handleStartRun, handleToggleMute]);

  // Mobile Touch / Pointer swipe gesture handlers on the canvas wrapper
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameStateRef.current !== 'playing') return;
    swipeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: performance.now(),
      consumed: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameStateRef.current !== 'playing') return;
    const start = swipeStartRef.current;
    if (!start || start.consumed) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const sensitivity = saveDataRef.current.settings.swipeSensitivity || 1.0;
    const threshold = 32 / sensitivity;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    start.consumed = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      engineRef.current?.triggerLaneSwitch(dx > 0 ? 1 : -1);
    } else {
      if (dy < 0) {
        engineRef.current?.triggerJump();
      } else {
        engineRef.current?.triggerSlide();
      }
    }
  };

  const onPointerUpOrCancel = () => {
    swipeStartRef.current = null;
  };

  const activeChar =
    CHARACTERS.find((c) => c.id === saveData.selectedCharacter) || CHARACTERS[0];
  const activeBoard =
    HOVERBOARDS.find((b) => b.id === saveData.selectedBoard) || HOVERBOARDS[0];
  const claimableMissionsCount = saveData.missions.filter(
    (m) => m.progress >= m.target && !m.claimed
  ).length;

  return (
    <main className="relative w-full h-full overflow-hidden select-none bg-[#070913]">
      {/* Isolated Three.js WebGL Mount Container */}
      <div
        ref={canvasMountRef}
        data-testid="game-canvas-container"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUpOrCancel}
        onPointerCancel={onPointerUpOrCancel}
        onDoubleClick={() => {
          if (gameStateRef.current === 'playing') {
            engineRef.current?.triggerHoverboardAegis();
          }
        }}
        className="absolute inset-0 w-full h-full cursor-pointer"
      />

      {/* TITLE SCREEN OVERLAY */}
      {gameState === 'title' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3.5 sm:p-8 md:p-10 overflow-hidden max-w-full">
          {/* Top Zone: Title Lockup in Left/Top Negative Space + Wallet Readout */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 min-w-0 max-w-full">
            <div className="pointer-events-auto max-w-md min-w-0 w-full">
              <TrackshiftTitleSvg className="w-full max-w-[430px] drop-shadow-lg" />
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-fluid-xs text-slate-300 font-mono-num min-w-0 max-w-full">
                <span className="truncate">BEST SCORE: {saveData.highScore}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">MULTIPLIER: x{saveData.missionLevel}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">COURIER: {activeChar.name.toUpperCase()}</span>
              </div>
            </div>

            {/* Top-Right Currency & Quick Utility Bar */}
            <div className="pointer-events-auto flex items-center gap-2 self-start min-w-0 max-w-full shrink-0">
              <div className="hud-panel px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg flex items-center gap-2.5 text-fluid-sm font-mono-num min-w-0 max-w-full overflow-hidden">
                <span
                  className="flex items-center gap-1.5 text-amber-400 font-bold truncate"
                  aria-label="Lifetime Coins"
                >
                  <CoinSvgIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{saveData.coins}</span>
                </span>
                <span className="text-slate-600 shrink-0" aria-hidden="true">
                  ·
                </span>
                <span
                  className="flex items-center gap-1.5 text-fuchsia-400 font-bold truncate"
                  aria-label="Data Tokens"
                >
                  <TokenSvgIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{saveData.tokens}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={saveData.settings.soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
                className="hud-panel p-2 sm:p-2.5 rounded-lg hover:border-cyan-400 transition-colors cursor-pointer shrink-0"
              >
                {saveData.settings.soundEnabled ? (
                  <SoundOnSvgIcon className="w-5 h-5" />
                ) : (
                  <SoundOffSvgIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Bottom Zone: Primary Start CTA + Docked Secondary Actions + Flat Control Hint Line */}
          <div className="flex flex-col items-start gap-3 max-w-xl w-full min-w-0">
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 sm:gap-3 w-full min-w-0">
              <button
                type="button"
                data-start="true"
                onClick={handleStartRun}
                className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-fluid-lg tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer max-w-full truncate shrink-0"
              >
                START NEON RUN
              </button>

              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  setSubModal('shop');
                  subModalRef.current = 'shop';
                }}
                className="hud-panel px-3.5 py-2.5 sm:px-4 sm:py-3.5 rounded-xl hover:border-cyan-400 text-fluid-xs font-bold tracking-wider uppercase text-slate-100 transition-colors cursor-pointer max-w-full truncate"
              >
                Crew &amp; Boards ({activeBoard.name})
              </button>

              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  setSubModal('missions');
                  subModalRef.current = 'missions';
                }}
                className="hud-panel px-3.5 py-2.5 sm:px-4 sm:py-3.5 rounded-xl hover:border-cyan-400 text-fluid-xs font-bold tracking-wider uppercase text-slate-100 transition-colors cursor-pointer max-w-full truncate"
              >
                Missions
                {claimableMissionsCount > 0 ? ` (${claimableMissionsCount} Ready)` : ''}
              </button>

              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  setSubModal('settings');
                  subModalRef.current = 'settings';
                }}
                className="hud-panel px-3.5 py-2.5 sm:px-4 sm:py-3.5 rounded-xl hover:border-cyan-400 text-fluid-xs font-bold tracking-wider uppercase text-slate-100 transition-colors cursor-pointer max-w-full truncate"
              >
                Settings
              </button>
            </div>

            {/* Single Flat Borderless Control-Hint Line */}
            <div className="text-fluid-xs text-slate-300 font-mono-num tracking-wide hud-stroke max-w-full break-words">
              WASD / Arrows / Swipe Move · Space / W Jump · S / Down Slide · Double-Tap / E
              Aegis Board · Esc / P Pause
            </div>
          </div>
        </div>
      )}

      {/* PLAYING HUD OVERLAY (>= 85% Unobstructed Viewport, Zero Backdrop-Filter) */}
      {gameState === 'playing' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-6 overflow-hidden max-w-full">
          {/* Top Perimeter Clusters */}
          <div className="flex flex-col gap-2 w-full min-w-0">
            <div className="flex items-start justify-between gap-2 w-full min-w-0">
              {/* Top-Left Telemetry Cluster: Score, Distance, Multiplier */}
              <div className="hud-panel px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-2.5 sm:gap-4 min-w-0 max-w-[58vw] sm:max-w-none overflow-hidden">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-cyan-400 truncate">
                    SCORE{' '}
                    <span ref={multiplierElRef} className="text-amber-400 ml-1">
                      x{saveData.missionLevel}
                    </span>
                  </div>
                  <div
                    ref={scoreElRef}
                    data-testid="hud-score"
                    className="font-mono-num font-bold text-fluid-score text-white leading-tight truncate"
                  >
                    0
                  </div>
                </div>

                <div className="h-6 sm:h-7 w-[1px] bg-slate-800 shrink-0" />

                <div className="min-w-0">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 truncate">
                    DIST
                  </div>
                  <div
                    ref={distanceElRef}
                    data-testid="hud-distance"
                    className="font-mono-num font-bold text-fluid-base text-slate-100 leading-tight truncate"
                  >
                    0m
                  </div>
                </div>

                <div className="hidden md:block h-7 w-[1px] bg-slate-800 shrink-0" />

                <div className="hidden md:block min-w-0">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 truncate">
                    SPEED
                  </div>
                  <div className="font-mono-num font-bold text-fluid-base text-cyan-300 leading-tight truncate">
                    <span ref={speedElRef}>65</span>{' '}
                    <span className="text-xs text-slate-400">km/h</span>
                  </div>
                </div>
              </div>

              {/* Top-Right Currency & Utility Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0 min-w-0 max-w-[40vw] sm:max-w-none justify-end">
                <div className="hud-panel px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 font-mono-num text-fluid-xs min-w-0 overflow-hidden">
                  <span className="flex items-center gap-1 text-amber-400 font-bold truncate">
                    <CoinSvgIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span ref={coinsElRef} data-testid="hud-coins" className="truncate">
                      0
                    </span>
                  </span>
                  <span className="text-slate-600 shrink-0">·</span>
                  <span className="flex items-center gap-1 text-fuchsia-400 font-bold truncate">
                    <TokenSvgIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span ref={tokensElRef} className="truncate">
                      {saveData.tokens}
                    </span>
                  </span>
                </div>

                {saveData.settings.showFps && (
                  <div
                    ref={fpsElRef}
                    className="hidden sm:block hud-panel px-2 py-2 rounded-xl font-mono-num text-fluid-xs font-bold text-emerald-400 shrink-0"
                  >
                    60 FPS
                  </div>
                )}

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={saveData.settings.soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleToggleMute();
                  }}
                  className="hud-panel p-2 sm:p-2.5 rounded-xl hover:border-cyan-400 transition-colors cursor-pointer shrink-0"
                >
                  {saveData.settings.soundEnabled ? (
                    <SoundOnSvgIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <SoundOffSvgIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Pause Game"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handlePauseRun();
                  }}
                  className="hud-panel p-2 sm:p-2.5 rounded-xl hover:border-cyan-400 transition-colors cursor-pointer shrink-0"
                >
                  <PauseSvgIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Sub-Row: Biome Label & Active Power-Up Timers */}
            <div className="flex flex-col items-center gap-1.5 pointer-events-none min-w-0 max-w-full">
              <div
                ref={biomeElRef}
                className="text-fluid-xs font-mono-num font-bold tracking-widest text-cyan-300 hud-stroke uppercase max-w-[92vw] truncate text-center"
              >
                SECTOR 01 · NEON STATION
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-full">
                <PowerUpHudSlot
                  wrapRef={vortexWrapRef}
                  barRef={vortexBarRef}
                  label="Coin Vortex"
                  colorHex="#f43f5e"
                  icon={<VortexSvgIcon className="w-5 h-5 shrink-0" />}
                />
                <PowerUpHudSlot
                  wrapRef={bootsWrapRef}
                  barRef={bootsBarRef}
                  label="Pulse Boots"
                  colorHex="#f59e0b"
                  icon={<BootsSvgIcon className="w-5 h-5 shrink-0" />}
                />
                <PowerUpHudSlot
                  wrapRef={gliderWrapRef}
                  barRef={gliderBarRef}
                  label="Skyrail Glider"
                  colorHex="#06b6d4"
                  icon={<GliderSvgIcon className="w-5 h-5 shrink-0" />}
                />
                <PowerUpHudSlot
                  wrapRef={aegisWrapRef}
                  barRef={aegisBarRef}
                  label="Aegis Shield"
                  colorHex="#10b981"
                  icon={<AegisSvgIcon className="w-5 h-5 shrink-0" />}
                />
              </div>

              {missionToast && (
                <div className="hud-panel-amber px-3 py-1.5 rounded-lg text-fluid-xs font-mono-num font-bold text-amber-300 max-w-[92vw] truncate">
                  {missionToast}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Perimeter: Aegis Board Trigger + Optional On-Screen Mobile Action Pad */}
          <div className="flex items-end justify-between gap-2 sm:gap-4 min-w-0 max-w-full">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Activate Aegis Hoverboard"
              onClick={(e) => {
                e.currentTarget.blur();
                engineRef.current?.triggerHoverboardAegis();
              }}
              className="pointer-events-auto hud-panel px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl hover:border-emerald-400 flex items-center gap-1.5 sm:gap-2 text-fluid-xs font-bold text-emerald-300 transition-colors cursor-pointer max-w-[52vw] sm:max-w-none truncate"
            >
              <AegisSvgIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">AEGIS BOARD [E]</span>
            </button>

            {saveData.settings.onScreenControls && (
              <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  aria-label="Move Left"
                  onClick={() => engineRef.current?.triggerLaneSwitch(-1)}
                  className="hud-panel w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-display font-bold text-base sm:text-lg text-white active:scale-95 cursor-pointer"
                >
                  ◀
                </button>
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    aria-label="Jump"
                    onClick={() => engineRef.current?.triggerJump()}
                    className="hud-panel w-11 h-10 sm:w-12 sm:h-11 rounded-xl font-display font-bold text-xs sm:text-sm text-cyan-300 active:scale-95 cursor-pointer"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="Slide"
                    onClick={() => engineRef.current?.triggerSlide()}
                    className="hud-panel w-11 h-10 sm:w-12 sm:h-11 rounded-xl font-display font-bold text-xs sm:text-sm text-amber-300 active:scale-95 cursor-pointer"
                  >
                    ▼
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Move Right"
                  onClick={() => engineRef.current?.triggerLaneSwitch(1)}
                  className="hud-panel w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-display font-bold text-base sm:text-lg text-white active:scale-95 cursor-pointer"
                >
                  ▶
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {gameState === 'paused' && subModal === 'none' && (
        <PauseModal
          onResume={handleResumeRun}
          onRestart={handleStartRun}
          onOpenSettings={() => {
            audioManager.playButton();
            setSubModal('settings');
            subModalRef.current = 'settings';
          }}
          onMainMenu={handleReturnToTitle}
        />
      )}

      {/* GAME OVER MODAL */}
      {gameState === 'gameover' && subModal === 'none' && lastRunSnapshot && (
        <GameOverModal
          snapshot={lastRunSnapshot}
          saveData={saveData}
          onTryAgain={handleStartRun}
          onOpenShop={() => {
            audioManager.playButton();
            setSubModal('shop');
            subModalRef.current = 'shop';
          }}
          onOpenMissions={() => {
            audioManager.playButton();
            setSubModal('missions');
            subModalRef.current = 'missions';
          }}
          onMainMenu={handleReturnToTitle}
        />
      )}

      {/* SUB-MODAL (SHOP / MISSIONS / SETTINGS / ANDROID) */}
      <SubModalOverlay
        activeModal={subModal}
        saveData={saveData}
        onClose={() => {
          setSubModal('none');
          subModalRef.current = 'none';
        }}
        onUpdateSave={updateSave}
        onPlayClickSound={() => audioManager.playButton()}
      />
    </main>
  );
}
