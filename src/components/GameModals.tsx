import React, { useState } from 'react';
import {
  CHARACTERS,
  HOVERBOARDS,
  claimMission,
  purchaseBoard,
  purchaseCharacter,
} from '../game/rules';
import { RunStatsSnapshot, SaveData, SubModal } from '../game/types';
import {
  CoinSvgIcon,
  TokenSvgIcon,
} from './GameIcons';

interface SubModalProps {
  activeModal: SubModal;
  saveData: SaveData;
  onClose: () => void;
  onUpdateSave: (next: SaveData) => void;
  onPlayClickSound: () => void;
}

export const SubModalOverlay: React.FC<SubModalProps> = ({
  activeModal,
  saveData,
  onClose,
  onUpdateSave,
  onPlayClickSound,
}) => {
  const [shopTab, setShopTab] = useState<'couriers' | 'boards'>('couriers');

  if (activeModal === 'none') return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 pointer-events-auto overflow-hidden"
      style={{ backgroundColor: 'rgba(5, 8, 18, 0.86)' }}
      role="dialog"
      aria-modal="true"
      onClick={() => {
        onPlayClickSound();
        onClose();
      }}
    >
      <div
        className="modal-surface w-full max-w-2xl rounded-xl p-3.5 sm:p-6 text-slate-100 max-h-[92dvh] min-w-0 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar: Prominent Back Button + Wallet Readout + Close Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/90 min-w-0">
          <button
            type="button"
            onClick={() => {
              onPlayClickSound();
              onClose();
            }}
            aria-label="Back"
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40 text-fluid-xs font-display font-bold tracking-wider uppercase text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span aria-hidden="true" className="text-sm leading-none">
              ←
            </span>
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-fluid-xs font-mono-num min-w-0 max-w-full overflow-hidden">
            <span className="flex items-center gap-1 text-amber-400 font-bold truncate">
              <CoinSvgIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{saveData.coins}</span>
            </span>
            <span className="text-slate-600 shrink-0">·</span>
            <span className="flex items-center gap-1 text-fuchsia-400 font-bold truncate">
              <TokenSvgIcon className="w-4 h-4 shrink-0" />
              <span className="truncate">{saveData.tokens}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onPlayClickSound();
              onClose();
            }}
            aria-label="Close modal"
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-slate-800 hover:bg-rose-500 hover:text-white text-fluid-xs font-bold text-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            ✕ Close
          </button>
        </div>

        {/* Sub-Menu Title & Subtitle */}
        <div className="pt-2.5 pb-2 border-b border-slate-800/60 min-w-0">
          <h2 className="font-display text-fluid-xl font-bold tracking-wide text-white break-words">
            {activeModal === 'shop' && 'COURIER CREW & HOVERBOARD ARMORY'}
            {activeModal === 'missions' && 'SECTOR MISSIONS & MULTIPLIER'}
            {activeModal === 'settings' && 'SYSTEM & CONTROL SETTINGS'}
          </h2>
          <p className="text-fluid-xs text-slate-400 mt-0.5 break-words">
            {activeModal === 'shop' &&
              'Visual-only cosmetics unlocked with earned railway coins and data tokens'}
            {activeModal === 'missions' &&
              `Current Score Multiplier: x${saveData.missionLevel} · Complete targets to rank up`}
            {activeModal === 'settings' &&
              'Configure audio synthesis, rendering performance, and touch sensitivity'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto overflow-x-hidden py-3.5 flex-1 space-y-3.5 min-w-0">
          {activeModal === 'shop' && (
            <>
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 rounded-lg w-fit max-w-full">
                <button
                  type="button"
                  onClick={() => {
                    onPlayClickSound();
                    setShopTab('couriers');
                  }}
                  className={`px-3.5 py-1.5 rounded-md text-fluid-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    shopTab === 'couriers'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Couriers ({CHARACTERS.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPlayClickSound();
                    setShopTab('boards');
                  }}
                  className={`px-3.5 py-1.5 rounded-md text-fluid-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    shopTab === 'boards'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Hoverboards ({HOVERBOARDS.length})
                </button>
              </div>

              {shopTab === 'couriers' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  {CHARACTERS.map((char) => {
                    const isUnlocked = saveData.unlockedCharacters.includes(char.id);
                    const isSelected = saveData.selectedCharacter === char.id;
                    const canAfford =
                      saveData.coins >= char.costCoins && saveData.tokens >= char.costTokens;

                    return (
                      <div
                        key={char.id}
                        className={`p-3.5 rounded-xl border transition-colors flex flex-col justify-between min-w-0 overflow-hidden ${
                          isSelected
                            ? 'bg-slate-900/95 border-cyan-400'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-3.5 h-3.5 rounded-sm shrink-0"
                                style={{ backgroundColor: char.badgeHex }}
                              />
                              <h3 className="font-display font-bold text-fluid-base text-white truncate min-w-0">
                                {char.name}
                              </h3>
                            </div>
                            <span className="text-fluid-xs text-slate-400 font-mono-num shrink-0">
                              {isSelected ? 'Equipped' : isUnlocked ? 'Unlocked' : 'Locked'}
                            </span>
                          </div>
                          <p className="text-fluid-xs text-cyan-400 mt-1 truncate">{char.role}</p>
                          <p className="text-fluid-xs text-slate-300 mt-1.5 leading-relaxed break-words">
                            {char.description}
                          </p>
                        </div>

                        <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 min-w-0">
                          <div className="text-fluid-xs font-mono-num text-slate-300 flex items-center gap-2 min-w-0">
                            {isUnlocked ? (
                              <span className="text-emerald-400 font-semibold">Owned</span>
                            ) : (
                              <>
                                <span className="flex items-center gap-1 text-amber-400 font-bold">
                                  <CoinSvgIcon className="w-3.5 h-3.5 shrink-0" />
                                  {char.costCoins}
                                </span>
                                {char.costTokens > 0 && (
                                  <span className="flex items-center gap-1 text-fuchsia-400 font-bold">
                                    <TokenSvgIcon className="w-3.5 h-3.5 shrink-0" />
                                    {char.costTokens}
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={!isUnlocked && !canAfford}
                            onClick={() => {
                              onPlayClickSound();
                              const res = purchaseCharacter(saveData, char.id);
                              if (res.ok) {
                                onUpdateSave(res.next);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-fluid-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 max-w-full truncate ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isUnlocked
                                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                                  : canAfford
                                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isSelected
                              ? 'Active Courier'
                              : isUnlocked
                                ? 'Select Courier'
                                : 'Unlock Courier'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  {HOVERBOARDS.map((board) => {
                    const isUnlocked = saveData.unlockedBoards.includes(board.id);
                    const isSelected = saveData.selectedBoard === board.id;
                    const canAfford =
                      saveData.coins >= board.costCoins &&
                      saveData.tokens >= board.costTokens;

                    return (
                      <div
                        key={board.id}
                        className={`p-3.5 rounded-xl border transition-colors flex flex-col justify-between min-w-0 overflow-hidden ${
                          isSelected
                            ? 'bg-slate-900/95 border-cyan-400'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-3.5 h-3.5 rounded-sm shrink-0"
                                style={{ backgroundColor: board.trailHex }}
                              />
                              <h3 className="font-display font-bold text-fluid-base text-white truncate min-w-0">
                                {board.name}
                              </h3>
                            </div>
                            <span className="text-fluid-xs text-slate-400 font-mono-num shrink-0">
                              {isSelected ? 'Equipped' : isUnlocked ? 'Unlocked' : 'Locked'}
                            </span>
                          </div>
                          <p className="text-fluid-xs text-slate-300 mt-1.5 break-words">
                            {board.tagline}
                          </p>
                        </div>

                        <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 min-w-0">
                          <div className="text-fluid-xs font-mono-num text-slate-300 flex items-center gap-2 min-w-0">
                            {isUnlocked ? (
                              <span className="text-emerald-400 font-semibold">Owned</span>
                            ) : (
                              <>
                                <span className="flex items-center gap-1 text-amber-400 font-bold">
                                  <CoinSvgIcon className="w-3.5 h-3.5 shrink-0" />
                                  {board.costCoins}
                                </span>
                                {board.costTokens > 0 && (
                                  <span className="flex items-center gap-1 text-fuchsia-400 font-bold">
                                    <TokenSvgIcon className="w-3.5 h-3.5 shrink-0" />
                                    {board.costTokens}
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={!isUnlocked && !canAfford}
                            onClick={() => {
                              onPlayClickSound();
                              const res = purchaseBoard(saveData, board.id);
                              if (res.ok) {
                                onUpdateSave(res.next);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-fluid-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 max-w-full truncate ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isUnlocked
                                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                                  : canAfford
                                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isSelected
                              ? 'Equipped Board'
                              : isUnlocked
                                ? 'Equip Board'
                                : 'Unlock Board'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeModal === 'missions' && (
            <div className="space-y-3 min-w-0">
              {saveData.missions.map((m) => {
                const isDone = m.progress >= m.target;
                const pct = Math.min(100, Math.round((m.progress / m.target) * 100));

                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 min-w-0 overflow-hidden"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <h3 className="font-display font-bold text-fluid-base text-white truncate min-w-0">
                          {m.title}
                        </h3>
                        <span className="text-fluid-xs font-mono-num text-cyan-400 font-semibold shrink-0">
                          {m.progress} / {m.target}
                        </span>
                      </div>
                      <p className="text-fluid-xs text-slate-300 break-words">{m.description}</p>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 transition-transform origin-left"
                          style={{ transform: `scaleX(${pct / 100})` }}
                        />
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 min-w-0">
                      <div className="flex items-center gap-2 text-fluid-xs font-mono-num">
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                          <CoinSvgIcon className="w-3.5 h-3.5 shrink-0" />+{m.rewardCoins}
                        </span>
                        <span className="flex items-center gap-1 text-fuchsia-400 font-bold">
                          <TokenSvgIcon className="w-3.5 h-3.5 shrink-0" />+{m.rewardTokens}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={!isDone || m.claimed}
                        onClick={() => {
                          onPlayClickSound();
                          const next = claimMission(saveData, m.id);
                          onUpdateSave(next);
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-fluid-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          m.claimed
                            ? 'bg-slate-800 text-slate-500 cursor-default'
                            : isDone
                              ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                              : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {m.claimed ? 'Claimed' : isDone ? 'Claim Reward' : 'In Progress'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeModal === 'settings' && (
            <div className="space-y-3.5 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 flex items-center justify-between gap-3 min-w-0 overflow-hidden">
                  <div className="min-w-0 flex-1">
                    <div className="text-fluid-sm font-semibold text-white truncate">
                      Sound Effects
                    </div>
                    <div className="text-fluid-xs text-slate-400 break-words">
                      Web Audio synth feedback
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClickSound();
                      onUpdateSave({
                        ...saveData,
                        settings: {
                          ...saveData.settings,
                          soundEnabled: !saveData.settings.soundEnabled,
                        },
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-fluid-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                      saveData.settings.soundEnabled
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {saveData.settings.soundEnabled ? 'Enabled' : 'Muted'}
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 flex items-center justify-between gap-3 min-w-0 overflow-hidden">
                  <div className="min-w-0 flex-1">
                    <div className="text-fluid-sm font-semibold text-white truncate">
                      Synth Pulse Loop
                    </div>
                    <div className="text-fluid-xs text-slate-400 break-words">
                      Rhythmic bassline during runs
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClickSound();
                      onUpdateSave({
                        ...saveData,
                        settings: {
                          ...saveData.settings,
                          musicEnabled: !saveData.settings.musicEnabled,
                        },
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-fluid-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                      saveData.settings.musicEnabled
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {saveData.settings.musicEnabled ? 'Enabled' : 'Muted'}
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 flex items-center justify-between gap-3 min-w-0 overflow-hidden">
                  <div className="min-w-0 flex-1">
                    <div className="text-fluid-sm font-semibold text-white truncate">
                      Graphics Quality
                    </div>
                    <div className="text-fluid-xs text-slate-400 break-words">
                      Shadows &amp; pixel resolution
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClickSound();
                      onUpdateSave({
                        ...saveData,
                        settings: {
                          ...saveData.settings,
                          graphicsQuality:
                            saveData.settings.graphicsQuality === 'high'
                              ? 'performance'
                              : 'high',
                        },
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-fluid-xs font-bold text-cyan-300 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {saveData.settings.graphicsQuality === 'high'
                      ? 'High Quality'
                      : '60 FPS Perf'}
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 flex items-center justify-between gap-3 min-w-0 overflow-hidden">
                  <div className="min-w-0 flex-1">
                    <div className="text-fluid-sm font-semibold text-white truncate">
                      Reduced Motion
                    </div>
                    <div className="text-fluid-xs text-slate-400 break-words">
                      Disable camera shake &amp; bursts
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClickSound();
                      onUpdateSave({
                        ...saveData,
                        settings: {
                          ...saveData.settings,
                          reducedMotion: !saveData.settings.reducedMotion,
                        },
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-fluid-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                      saveData.settings.reducedMotion
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {saveData.settings.reducedMotion ? 'Reduced' : 'Standard'}
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 flex items-center justify-between gap-3 min-w-0 overflow-hidden">
                  <div className="min-w-0 flex-1">
                    <div className="text-fluid-sm font-semibold text-white truncate">
                      On-Screen Touch Pad
                    </div>
                    <div className="text-fluid-xs text-slate-400 break-words">
                      Show directional action buttons
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClickSound();
                      onUpdateSave({
                        ...saveData,
                        settings: {
                          ...saveData.settings,
                          onScreenControls: !saveData.settings.onScreenControls,
                        },
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-fluid-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                      saveData.settings.onScreenControls
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {saveData.settings.onScreenControls ? 'Shown' : 'Swipe Only'}
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 flex items-center justify-between gap-3 min-w-0 overflow-hidden">
                  <div className="min-w-0 flex-1">
                    <div className="text-fluid-sm font-semibold text-white truncate">
                      FPS Counter
                    </div>
                    <div className="text-fluid-xs text-slate-400 break-words">
                      Show real-time frame rate
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayClickSound();
                      onUpdateSave({
                        ...saveData,
                        settings: {
                          ...saveData.settings,
                          showFps: !saveData.settings.showFps,
                        },
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-fluid-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                      saveData.settings.showFps
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {saveData.settings.showFps ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <label
                    htmlFor="swipe-sensitivity-slider"
                    className="text-fluid-sm font-semibold text-white truncate min-w-0"
                  >
                    Swipe Gesture Sensitivity
                  </label>
                  <span className="text-fluid-xs font-mono-num text-cyan-400 font-bold shrink-0">
                    {saveData.settings.swipeSensitivity.toFixed(1)}x
                  </span>
                </div>
                <input
                  id="swipe-sensitivity-slider"
                  type="range"
                  min="0.6"
                  max="1.6"
                  step="0.1"
                  value={saveData.settings.swipeSensitivity}
                  onChange={(e) => {
                    onUpdateSave({
                      ...saveData,
                      settings: {
                        ...saveData.settings,
                        swipeSensitivity: parseFloat(e.target.value),
                      },
                    });
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Persistent Modal Footer with Prominent Back Button */}
        <div className="pt-3 border-t border-slate-800/90 flex items-center justify-between gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              onPlayClickSound();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-fluid-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span aria-hidden="true">←</span>
            <span>Back to Menu</span>
          </button>

          <span className="hidden sm:inline text-fluid-xs font-mono-num text-slate-400 truncate">
            Press ESC or click outside to return
          </span>
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenSettings,
  onMainMenu,
}) => {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 pointer-events-auto overflow-hidden"
      style={{ backgroundColor: 'rgba(5, 8, 18, 0.82)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
    >
      <div className="modal-surface w-full max-w-sm max-h-[92dvh] overflow-y-auto overflow-x-hidden min-w-0 rounded-xl p-4 sm:p-6 text-center space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 min-w-0">
          <button
            type="button"
            onClick={onResume}
            aria-label="Back to Run"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40 text-fluid-xs font-display font-bold tracking-wider uppercase text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </button>
          <span className="text-fluid-xs font-mono-num text-cyan-400 tracking-widest truncate">
            SIMULATION FROZEN
          </span>
        </div>

        <div className="min-w-0">
          <h2 className="font-display text-fluid-2xl font-bold text-white break-words">
            RUN PAUSED
          </h2>
        </div>

        <div className="space-y-2.5 min-w-0">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-4 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-fluid-base tracking-wide transition-colors cursor-pointer truncate"
          >
            Resume Run
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-fluid-sm transition-colors cursor-pointer truncate"
          >
            Restart Run
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-fluid-sm transition-colors cursor-pointer truncate"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-fluid-sm border border-slate-800 transition-colors cursor-pointer truncate"
          >
            ← Back to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  snapshot: RunStatsSnapshot;
  saveData: SaveData;
  onTryAgain: () => void;
  onOpenShop: () => void;
  onOpenMissions: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  snapshot,
  saveData,
  onTryAgain,
  onOpenShop,
  onOpenMissions,
  onMainMenu,
}) => {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 pointer-events-auto overflow-hidden"
      style={{ backgroundColor: 'rgba(5, 8, 18, 0.85)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Run Complete"
    >
      <div className="modal-surface w-full max-w-md max-h-[92dvh] overflow-y-auto overflow-x-hidden min-w-0 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 min-w-0">
          <button
            type="button"
            onClick={onMainMenu}
            aria-label="Back to Main Menu"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40 text-fluid-xs font-display font-bold tracking-wider uppercase text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </button>
          <span className="text-fluid-xs font-mono-num text-rose-400 tracking-wider truncate">
            {snapshot.biome.toUpperCase()}
          </span>
        </div>

        <div className="text-center min-w-0">
          <div className="text-fluid-xs font-mono-num text-rose-400 tracking-widest break-words">
            INTERCEPTED BY SECURITY DRONE
          </div>
          <h2 className="font-display text-fluid-2xl font-bold text-white mt-1 break-words">
            {snapshot.isNewBest ? 'NEW PERSONAL RECORD!' : 'RUN TERMINATED'}
          </h2>
        </div>

        {/* 3 Primary Stat Tiles with strict min-w-0 & truncate bounds */}
        <div className="grid grid-cols-3 gap-2 text-center min-w-0">
          <div className="p-2.5 sm:p-3 rounded-lg bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
            <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase truncate">
              Final Score
            </div>
            <div className="font-mono-num font-bold text-fluid-lg text-cyan-400 mt-0.5 truncate">
              {snapshot.score}
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono-num text-slate-500 mt-0.5 truncate">
              Best: {saveData.highScore}
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-lg bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
            <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase truncate">
              Distance
            </div>
            <div className="font-mono-num font-bold text-fluid-lg text-white mt-0.5 truncate">
              {snapshot.distance}m
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono-num text-slate-500 mt-0.5 truncate">
              Peak: {snapshot.speedReached} km/h
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-lg bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
            <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase truncate">
              Coins Earned
            </div>
            <div className="font-mono-num font-bold text-fluid-lg text-amber-400 mt-0.5 flex items-center justify-center gap-1 min-w-0">
              <CoinSvgIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">+{snapshot.coins}</span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono-num text-slate-500 mt-0.5 truncate">
              Bank: {saveData.coins}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 min-w-0">
          <button
            type="button"
            data-start="true"
            onClick={onTryAgain}
            className="w-full py-3 sm:py-3.5 px-5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-fluid-lg tracking-wide transition-colors cursor-pointer truncate"
          >
            Try Again
          </button>

          <div className="grid grid-cols-3 gap-2 min-w-0">
            <button
              type="button"
              onClick={onOpenMissions}
              className="py-2.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-fluid-xs font-bold text-slate-200 transition-colors cursor-pointer truncate min-w-0"
            >
              Missions
              {snapshot.completedMissionsCount > 0
                ? ` (${snapshot.completedMissionsCount})`
                : ''}
            </button>
            <button
              type="button"
              onClick={onOpenShop}
              className="py-2.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-fluid-xs font-bold text-slate-200 transition-colors cursor-pointer truncate min-w-0"
            >
              Crew Shop
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="py-2.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-fluid-xs font-bold text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer truncate min-w-0"
            >
              ← Main Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function PowerUpHudSlot({
  wrapRef,
  barRef,
  label,
  colorHex,
  icon,
}: {
  wrapRef: React.RefObject<HTMLDivElement | null>;
  barRef: React.RefObject<HTMLDivElement | null>;
  label: string;
  colorHex: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      ref={wrapRef}
      style={{ display: 'none' }}
      className="hud-panel px-2.5 py-1.5 rounded-lg items-center gap-2 min-w-[108px] sm:min-w-[132px] max-w-[44vw] sm:max-w-[180px] overflow-hidden"
    >
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold tracking-wider uppercase text-slate-200 truncate">
          {label}
        </div>
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-0.5">
          <div
            ref={barRef}
            className="h-full origin-left"
            style={{ backgroundColor: colorHex, transform: 'scaleX(1)' }}
          />
        </div>
      </div>
    </div>
  );
}
