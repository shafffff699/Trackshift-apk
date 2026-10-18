import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_START_SPEED,
  MAX_RUN_SPEED,
  claimMission,
  computeCoinPullPosition,
  computeRunSpeed,
  evaluateObstacleInteraction,
  generateFairRowPattern,
  getBiomeForDistance,
  laneToWorldX,
  purchaseBoard,
  purchaseCharacter,
  stepVerticalPhysics,
  updateMissionsWithEvent,
  INITIAL_MISSIONS,
} from './rules.ts';
import type { SaveData } from './types.ts';

function makeDefaultSave(): SaveData {
  return {
    highScore: 0,
    coins: 500,
    tokens: 2,
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

test('speed progression scales smoothly and caps at max speed', () => {
  assert.equal(computeRunSpeed(0, false), BASE_START_SPEED);
  const midSpeed = computeRunSpeed(500, false);
  assert.ok(midSpeed > BASE_START_SPEED && midSpeed < MAX_RUN_SPEED);
  assert.equal(computeRunSpeed(10000, false), MAX_RUN_SPEED);
  assert.ok(computeRunSpeed(500, true) > midSpeed);
});

test('biome rotates cleanly with distance', () => {
  assert.equal(getBiomeForDistance(0), 'station');
  assert.equal(getBiomeForDistance(400), 'elevated');
  assert.equal(getBiomeForDistance(800), 'tunnel');
  assert.equal(getBiomeForDistance(1200), 'downtown');
  assert.equal(getBiomeForDistance(1500), 'station');
});

test('vertical physics handles jump, pulse boots height, and slide state', () => {
  let state = {
    y: 0,
    vy: 0,
    groundY: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    coyoteTimer: 0.1,
    jumpBufferTimer: 0,
  };

  // Trigger jump
  const jumpStep = stepVerticalPhysics(state, 0.016, false, false, true, false);
  assert.equal(jumpStep.didJump, true);
  assert.equal(jumpStep.next.isJumping, true);
  assert.ok(jumpStep.next.y > 0);

  // Trigger slide while high airborne (y = 1.5) initiates fast-fall
  const highAirState = { ...jumpStep.next, y: 1.5 };
  const slideStep = stepVerticalPhysics(highAirState, 0.016, false, false, false, true);
  assert.equal(slideStep.didSlide, true);
  assert.equal(slideStep.next.isSliding, true);
  assert.ok(slideStep.next.vy <= -24);
  assert.ok(slideStep.next.y < 1.5);
});

test('collision logic distinguishes jumping over low barriers and sliding under high gates', () => {
  const lowBarrier = {
    id: 1,
    lane: 0 as const,
    z: 0,
    type: 'barrier_low' as const,
    length: 0.8,
    height: 1.05,
    clearanceY: 0,
    speed: 0,
    active: true,
  };

  // Standing player hits low barrier
  const hitLow = evaluateObstacleInteraction(
    { lane: 0, x: laneToWorldX(0), y: 0, isSliding: false, isGliding: false },
    lowBarrier
  );
  assert.equal(hitLow.hitHazard, true);

  // Jumping player clears low barrier
  const clearLow = evaluateObstacleInteraction(
    { lane: 0, x: laneToWorldX(0), y: 1.2, isSliding: false, isGliding: false },
    lowBarrier
  );
  assert.equal(clearLow.hitHazard, false);

  const highGate = {
    id: 2,
    lane: 0 as const,
    z: 0,
    type: 'gate_high' as const,
    length: 0.8,
    height: 2.9,
    clearanceY: 1.15,
    speed: 0,
    active: true,
  };

  // Standing player hits high gate
  const hitGate = evaluateObstacleInteraction(
    { lane: 0, x: laneToWorldX(0), y: 0, isSliding: false, isGliding: false },
    highGate
  );
  assert.equal(hitGate.hitHazard, true);

  // Sliding player clears high gate cleanly
  const slideGate = evaluateObstacleInteraction(
    { lane: 0, x: laneToWorldX(0), y: 0, isSliding: true, isGliding: false },
    highGate
  );
  assert.equal(slideGate.hitHazard, false);

  // Ramp train smoothly elevates player from ground (y=0) at front tip to roof deck (y=2.65)
  const rampTrain = {
    id: 3,
    lane: 0 as const,
    z: -7.5, // frontZ = -7.5 + 9.0 = +1.5m up the 7.0m slope
    type: 'train_ramp' as const,
    length: 18.0,
    height: 2.65,
    clearanceY: 0,
    speed: 0,
    active: true,
  };
  const stepOnRamp = evaluateObstacleInteraction(
    { lane: 0, x: laneToWorldX(0), y: 0, isSliding: false, isGliding: false },
    rampTrain
  );
  assert.equal(stepOnRamp.hitHazard, false);
  assert.equal(stepOnRamp.landedOnTrainTop, true);
  assert.equal(stepOnRamp.isOnRampSlope, true);
  assert.ok(stepOnRamp.trainTopY > 0 && stepOnRamp.trainTopY < 1.5);

  // Mid-train roof deck supports player at full height (2.65m) and isOnRampSlope is false
  const onRoof = evaluateObstacleInteraction(
    { lane: 0, x: laneToWorldX(0), y: 2.4, isSliding: false, isGliding: false },
    { ...rampTrain, z: 0 }
  );
  assert.equal(onRoof.hitHazard, false);
  assert.equal(onRoof.landedOnTrainTop, true);
  assert.equal(onRoof.isOnRampSlope, false);
  assert.equal(onRoof.trainTopY, 2.65);

  // Rising ramp groundY never lets airborne player clip below ramp surface even while vy > 0
  const airborneOnRamp = stepVerticalPhysics(
    {
      y: 0.8,
      vy: 4.0,
      groundY: 1.45,
      isJumping: true,
      isSliding: false,
      slideTimer: 0,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
    },
    0.016,
    false,
    false,
    false,
    false
  );
  assert.ok(airborneOnRamp.next.y >= 1.45);
});

test('procedural row generator never creates an impassable 3-train wall', () => {
  let seed = 42;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 250; i++) {
    const pattern = generateFairRowPattern(rng, i / 250);
    assert.equal(pattern.length, 3);
    const hasPassableLane = pattern.some(
      (p) => p === 'none' || p === 'barrier_low' || p === 'gate_high' || p === 'train_ramp'
    );
    assert.equal(hasPassableLane, true, `Row ${i} had no passable escape lane: ${pattern.join(',')}`);
  }
});

test('coin vortex pulls distant coins toward player and collects when close', () => {
  const coin = { x: 2.6, y: 1.0, z: 6.0 };
  const player = { x: 0, y: 0, z: 0 };

  // Without vortex, distant coin stays still
  const noVortex = computeCoinPullPosition(coin, player, 0.05, false);
  assert.equal(noVortex.x, coin.x);
  assert.equal(noVortex.collected, false);

  // With vortex, coin pulls closer to player
  const withVortex = computeCoinPullPosition(coin, player, 0.05, true);
  assert.ok(Math.abs(withVortex.x) < Math.abs(coin.x));
  assert.ok(withVortex.z < coin.z);
});

test('missions update progress and claim rewards exactly once', () => {
  let save = makeDefaultSave();
  save.missions = updateMissionsWithEvent(save.missions, 'coins_total', 45, false);
  const m = save.missions.find((x) => x.id === 'm_coins_50')!;
  assert.equal(m.progress, 40);

  const afterFirstClaim = claimMission(save, 'm_coins_50');
  assert.equal(afterFirstClaim.coins, 500 + 120);
  assert.equal(afterFirstClaim.tokens, 2 + 1);

  // Duplicate claim is prevented
  const afterSecondClaim = claimMission(afterFirstClaim, 'm_coins_50');
  assert.equal(afterSecondClaim.coins, afterFirstClaim.coins);
});

test('shop purchases deduct currency and prevent duplicate charges', () => {
  const save = makeDefaultSave();
  const res = purchaseCharacter(save, 'nyx_crimson');
  assert.equal(res.ok, true);
  assert.equal(res.next.coins, 500 - 350);
  assert.equal(res.next.selectedCharacter, 'nyx_crimson');

  // Re-selecting unlocked character does not deduct coins again
  const reselect = purchaseCharacter(res.next, 'nyx_crimson');
  assert.equal(reselect.ok, true);
  assert.equal(reselect.next.coins, 150);

  // Board purchase
  const boardRes = purchaseBoard( makeDefaultSave(), 'solar_flare');
  assert.equal(boardRes.ok, true);
  assert.equal(boardRes.next.coins, 500 - 300);
  assert.equal(boardRes.next.selectedBoard, 'solar_flare');
});

test('haptic feedback triggers distinct vibration durations for lane switch, jump, and slide', async () => {
  const { HAPTIC_PATTERNS, triggerHapticFeedback } = await import('./rules.ts');
  const calls: Array<number | number[]> = [];
  const mockVibrate = (pattern: number | number[]) => {
    calls.push(pattern);
    return true;
  };

  assert.equal(triggerHapticFeedback('lane', mockVibrate), true);
  assert.equal(triggerHapticFeedback('jump', mockVibrate), true);
  assert.equal(triggerHapticFeedback('slide', mockVibrate), true);

  assert.deepEqual(calls, [
    HAPTIC_PATTERNS.lane,
    HAPTIC_PATTERNS.jump,
    HAPTIC_PATTERNS.slide,
  ]);
});

test('camera cutout inset calculation enforces safe clearance on portrait and landscape mobile viewports', async () => {
  const { computeCameraCutoutInsets } = await import('./rules.ts');

  const portraitDefault = computeCameraCutoutInsets({
    viewportWidth: 390,
    viewportHeight: 844,
  });
  assert.equal(portraitDefault.top, 26);
  assert.equal(portraitDefault.bottom, 10);
  assert.equal(portraitDefault.centerNotchClearancePx, 44);

  const portraitDeepCutout = computeCameraCutoutInsets({
    viewportWidth: 390,
    viewportHeight: 844,
    reportedTop: 42,
    reportedBottom: 24,
  });
  assert.equal(portraitDeepCutout.top, 42);
  assert.equal(portraitDeepCutout.bottom, 24);

  const landscapeCutout = computeCameraCutoutInsets({
    viewportWidth: 844,
    viewportHeight: 390,
  });
  assert.equal(landscapeCutout.left, 28);
  assert.equal(landscapeCutout.right, 28);
});


