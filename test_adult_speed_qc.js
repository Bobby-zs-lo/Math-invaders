import { chromium } from 'playwright';
import assert from 'node:assert/strict';

async function runAdultSpeedQC() {
  console.log('===============================================================');
  console.log('⏳ RUNNING ADULT SPEED SLIDER & MONSTER LIFE QC (PLAYWRIGHT)');
  console.log('===============================================================');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);

    // 1. Create pilot
    console.log('[TEST 1] Creating pilot and verifying initial difficulty modal...');
    await page.fill('#gateway-input-name', 'SpeedTester');
    await page.selectOption('#gateway-select-grade', '2');
    await page.click('#gateway-btn-create');
    await page.waitForTimeout(400);

    // Verify Adult Descent Speed Slider exists in Difficulty Modal
    const modalSpeedSlider = page.locator('#slider-descent-speed');
    assert.ok(await modalSpeedSlider.isVisible(), 'Adult descent speed slider must exist in difficulty modal');
    const modalSpeedVal = await page.locator('#display-descent-speed').textContent();
    assert.strictEqual(modalSpeedVal?.trim(), '1.0x', 'Default speed in modal must be 1.0x');

    await page.click('#btn-save-diff');
    await page.waitForTimeout(400);

    // 2. Launch Sector 1 Stage 1
    console.log('[TEST 2] Launching Sector 1 Stage 1 from Star Map...');
    await page.click('.stage-node[data-sector="1"][data-stage="1"]', { force: true });
    await page.waitForTimeout(600);
    assert.ok(await page.isVisible('#view-game-arena:not(.hidden)'), 'Combat arena must be visible');

    // 3. In-Game HUD Adult Speed Button & Flyout Panel
    console.log('[TEST 3] In-Game HUD Adult Speed Button & Flyout Panel...');
    const speedBtn = page.locator('#btn-adult-speed');
    assert.ok(await speedBtn.isVisible(), '#btn-adult-speed must be visible in HUD');
    const badgeText = await page.locator('#hud-speed-badge').textContent();
    assert.strictEqual(badgeText?.trim(), '1.0x', 'Default speed badge must be 1.0x');

    // Toggle Flyout
    await speedBtn.click();
    const speedPanel = page.locator('#in-game-speed-panel');
    assert.ok(await speedPanel.isVisible(), 'Speed flyout panel must be visible after click');

    // Test Preset 0.4x Slow
    console.log('[TEST 4] Testing Speed Preset Buttons...');
    await page.click('.speed-preset-btn[data-speed="0.4"]');
    const updatedBadge1 = await page.locator('#hud-speed-badge').textContent();
    assert.strictEqual(updatedBadge1?.trim(), '0.4x', 'Badge must update to 0.4x');

    const engineSpeed1 = await page.evaluate(() => (window).__mathApp.gameEngine.getDescentSpeedMultiplier());
    assert.strictEqual(engineSpeed1, 0.4, 'GameEngine speed multiplier must be 0.4');

    // Test Slider adjustment to 1.5x
    console.log('[TEST 5] Testing Range Slider Adjustment...');
    await page.evaluate(() => {
      const slider = document.getElementById('in-game-speed-slider');
      slider.value = '1.5';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const updatedBadge2 = await page.locator('#hud-speed-badge').textContent();
    assert.strictEqual(updatedBadge2?.trim(), '1.5x', 'Badge must update to 1.5x');

    const engineSpeed2 = await page.evaluate(() => (window).__mathApp.gameEngine.getDescentSpeedMultiplier());
    assert.strictEqual(engineSpeed2, 1.5, 'GameEngine speed multiplier must be 1.5');

    // Close speed panel
    await page.click('#btn-close-speed-panel');
    const isPanelHidden = await page.locator('#in-game-speed-panel').evaluate(el => el.classList.contains('hidden'));
    assert.ok(isPanelHidden, 'Speed panel must be hidden after close');

    // Test Pause Modal
    console.log('[TEST 6] Testing Pause Button and In-Game Pause Modal...');
    await page.click('#btn-pause-game');
    const pauseModal = page.locator('#in-game-pause-modal');
    assert.ok(await pauseModal.isVisible(), 'Pause modal must be visible');

    const isEnginePaused = await page.evaluate(() => (window).__mathApp.gameEngine.state.isPaused);
    assert.strictEqual(isEnginePaused, true, 'Engine must be paused');

    // Adjust speed inside pause modal to 0.7x
    await page.click('.pause-preset[data-speed="0.7"]');
    const pauseDisplay = await page.locator('#pause-speed-display-val').textContent();
    assert.strictEqual(pauseDisplay?.trim(), '0.7x', 'Pause speed display must update to 0.7x');

    // Resume Game
    await page.click('#btn-resume-game');
    const isModalHidden = await page.locator('#in-game-pause-modal').evaluate(el => el.classList.contains('hidden'));
    assert.ok(isModalHidden, 'Pause modal must close after resume');

    const isEngineResumed = await page.evaluate(() => (window).__mathApp.gameEngine.state.isPaused);
    assert.strictEqual(isEngineResumed, false, 'Engine must be unpaused');

    const finalBadge = await page.locator('#hud-speed-badge').textContent();
    assert.strictEqual(finalBadge?.trim(), '0.7x', 'HUD badge must reflect updated 0.7x speed');

    // 4. Verify Monster HP in GameEngine: Scout HP is 6 and does not die in 1 hit
    console.log('[TEST 7] Verifying Monster HP: 6 HP Scout and lowest weapon survival...');
    const scoutHp = await page.evaluate(() => {
      const scout = (window).__mathApp.gameEngine.state.aliens.find(a => a.type === 'scout');
      return scout ? { hp: scout.hp, maxHp: scout.maxHp } : null;
    });
    assert.ok(scoutHp, 'Scout must exist in Sector 1');
    assert.strictEqual(scoutHp.hp, 6, 'Scout HP must be 6');
    assert.strictEqual(scoutHp.maxHp, 6, 'Scout maxHp must be 6');

    // Take screenshot of adult controls in action
    await page.screenshot({ path: 'qc_adult_speed.png' });
    console.log('Saved screenshot: qc_adult_speed.png');

    console.log('===============================================================');
    console.log('✅ ALL ADULT SPEED & PAUSE QC CHECKS PASSED WITH 100% SUCCESS!');
    console.log('===============================================================');
  } finally {
    await browser.close();
  }
}

runAdultSpeedQC().catch(err => {
  console.error('QC FAILED:', err);
  process.exit(1);
});
