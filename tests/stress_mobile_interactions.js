import { chromium } from 'playwright';
import http from 'http';
import { spawn } from 'child_process';

function checkServerReady(url = 'http://localhost:5173/') {
  return new Promise((resolve) => {
    const req = http.get(url, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureDevServer() {
  const isUp = await checkServerReady();
  if (isUp) {
    console.log('   [Server] Dev server active on http://localhost:5173/');
    return null;
  }
  console.log('   [Server] Spawning Vite dev server on http://localhost:5173/...');
  const server = spawn('npx', ['vite', '--port', '5173'], {
    shell: true,
    stdio: 'ignore'
  });

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await checkServerReady()) {
      console.log('   [Server] Vite dev server started successfully.');
      return server;
    }
  }
  throw new Error('Timed out waiting for Vite dev server to start on http://localhost:5173/');
}

function stopDevServer(server) {
  if (!server) return;
  console.log('   [Server] Stopping spawned dev server...');
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t']);
    } else {
      process.kill(-server.pid);
    }
  } catch (e) {
    // ignore
  }
}

/**
 * ADVERSARIAL MOBILE STRESS TEST SUITE
 * Probes:
 * 1. Rapid Upgrade Drawer Toggling & Z-Index Clobbering Resistance
 * 2. Multi-Viewport Bounds & Zero Horizontal Scrolling (320px, 360px, 375px, 390px, 414px)
 * 3. Rapid Touch / Tap Sequences on Lane Buttons & Virtual Numpad
 * 4. Input Race Condition & State Corruption Probing
 */
async function runAdversarialMobileStress() {
  console.log('======================================================================');
  console.log('⚔️  ADVERSARIAL MOBILE E2E STRESS HARNESS: MATH INVADERS');
  console.log('======================================================================\n');

  const devServer = await ensureDevServer();
  let browser = null;

  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });

    // -------------------------------------------------------------------------
    // TEST SUITE 1: Rapid Upgrade Drawer Toggling Stress (414x896)
    // -------------------------------------------------------------------------
    console.log('[STRESS TEST 1] Rapid Upgrade Drawer Toggling & Z-Index Integrity...');
    {
      const context = await browser.newContext({
        viewport: { width: 414, height: 896 },
        hasTouch: true
      });
      const page = await context.newPage();

      // Listen for unhandled errors
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err));

      await page.goto('http://localhost:5173/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForTimeout(400);

      // Create pilot
      await page.fill('#gateway-input-name', 'StressPilot');
      await page.selectOption('#gateway-select-grade', '3');
      await page.click('#gateway-btn-create');
      await page.waitForTimeout(300);

      // Dismiss difficulty modal if shown
      if (await page.isVisible('#btn-save-diff')) {
        await page.click('#btn-save-diff');
        await page.waitForTimeout(300);
      }

      // Launch Sector 1 Stage 1
      await page.click('.stage-node[data-sector="1"][data-stage="1"]', { force: true });
      await page.waitForTimeout(500);

      // Verify arena loaded
      if (!(await page.isVisible('#view-game-arena:not(.hidden)'))) {
        throw new Error('Combat arena did not load');
      }

      // Verify Initial Style Contracts
      const contractCheck = await page.evaluate(() => {
        const hud = document.getElementById('game-hud');
        const drawer = document.getElementById('upgrade-side-panel');
        const toggleBtn = document.getElementById('btn-toggle-upgrade-panel');
        return {
          hudZ: window.getComputedStyle(hud).zIndex,
          drawerZ: window.getComputedStyle(drawer).zIndex,
          drawerInitialClosed: drawer.classList.contains('closed'),
          toggleBtnVisible: toggleBtn.offsetWidth > 0 && toggleBtn.offsetHeight > 0
        };
      });

      console.log(`   Initial HUD z-index: ${contractCheck.hudZ}, Drawer z-index: ${contractCheck.drawerZ}`);
      console.log(`   Drawer initially closed: ${contractCheck.drawerInitialClosed}`);
      if (parseInt(contractCheck.hudZ, 10) <= parseInt(contractCheck.drawerZ, 10)) {
        throw new Error(`HUD z-index (${contractCheck.hudZ}) must be higher than drawer z-index (${contractCheck.drawerZ})`);
      }

      // Rapidly toggle the upgrade side drawer 40 times back-to-back with 25ms delay
      console.log('   Executing 40 rapid toggle operations...');
      for (let i = 0; i < 40; i++) {
        if (i % 2 === 0) {
          await page.click('#btn-toggle-upgrade-panel');
        } else {
          // alternate between toggle and minimize button
          await page.click('#btn-minimize-upgrade');
        }
        await page.waitForTimeout(25);
      }

      // Check whether any errors were thrown
      if (pageErrors.length > 0) {
        throw new Error(`Page errors occurred during rapid toggling: ${pageErrors.map(e => e.message).join(', ')}`);
      }

      // Ensure drawer can be deterministically opened and closed after spam
      console.log('   Testing deterministic open after rapid spam...');
      await page.evaluate(() => {
        const drawer = document.getElementById('upgrade-side-panel');
        if (drawer.classList.contains('closed')) {
          document.getElementById('btn-toggle-upgrade-panel').click();
        }
      });
      await page.waitForTimeout(150);
      let isOpen = await page.evaluate(() => !document.getElementById('upgrade-side-panel').classList.contains('closed'));
      if (!isOpen) throw new Error('Drawer failed to open cleanly after rapid toggle stress!');

      console.log('   Testing deterministic close after rapid spam...');
      await page.click('#btn-minimize-upgrade');
      await page.waitForTimeout(150);
      let isClosed = await page.evaluate(() => document.getElementById('upgrade-side-panel').classList.contains('closed'));
      if (!isClosed) throw new Error('Drawer failed to close cleanly after rapid toggle stress!');

      // Verify HUD and Game loop are fully functional after toggling
      console.log('   Verifying alien descent and HUD interaction remain live...');
      const y1 = await page.evaluate(() => {
        const aliens = window.app.gameEngine.state.aliens;
        return aliens.length > 0 ? aliens[0].y : null;
      });
      await page.waitForTimeout(1100);
      const y2 = await page.evaluate(() => {
        const aliens = window.app.gameEngine.state.aliens;
        return aliens.length > 0 ? aliens[0].y : null;
      });
      console.log(`   Alien movement during stress: y1=${y1?.toFixed(1)}, y2=${y2?.toFixed(1)}`);
      if (y1 !== null && y2 !== null && y2 <= y1) {
        throw new Error('Game loop or alien descent halted after drawer toggle stress!');
      }

      await context.close();
      console.log('   ✅ Rapid Toggle & Z-Index Integrity: PASSED');
    }

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Multi-Viewport Bounds & Zero Horizontal Overflow
    // -------------------------------------------------------------------------
    console.log('\n[STRESS TEST 2] Multi-Viewport Overflow Matrix (320px, 360px, 375px, 390px, 414px)...');
    const viewportsToTest = [
      { name: 'iPhone 5/SE 1st Gen (Ultra-Compact)', width: 320, height: 568 },
      { name: 'Android Small (Galaxy S/A)', width: 360, height: 640 },
      { name: 'iPhone SE 2/3 / iPhone 8', width: 375, height: 667 },
      { name: 'iPhone 12/13/14 Pro', width: 390, height: 844 },
      { name: 'iPhone Plus / Max Standard', width: 414, height: 896 }
    ];

    for (const vp of viewportsToTest) {
      console.log(`   Testing Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: true
      });
      const page = await context.newPage();

      await page.goto('http://localhost:5173/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForTimeout(300);

      // Check Gateway
      const gatewayOverflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      if (gatewayOverflow.scrollWidth > gatewayOverflow.clientWidth) {
        throw new Error(`Horizontal overflow on Gateway at ${vp.width}x${vp.height}: scrollWidth=${gatewayOverflow.scrollWidth} > clientWidth=${gatewayOverflow.clientWidth}`);
      }

      // Create pilot & dismiss modal
      await page.fill('#gateway-input-name', `VP${vp.width}`);
      await page.selectOption('#gateway-select-grade', '2');
      await page.click('#gateway-btn-create');
      await page.waitForTimeout(300);

      if (await page.isVisible('#btn-save-diff')) {
        const diffOverflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        }));
        if (diffOverflow.scrollWidth > diffOverflow.clientWidth) {
          throw new Error(`Horizontal overflow on Difficulty Modal at ${vp.width}x${vp.height}: scrollWidth=${diffOverflow.scrollWidth} > clientWidth=${diffOverflow.clientWidth}`);
        }
        await page.click('#btn-save-diff');
        await page.waitForTimeout(300);
      }

      // Check Star Map View
      const mapOverflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      if (mapOverflow.scrollWidth > mapOverflow.clientWidth) {
        throw new Error(`Horizontal overflow on Star Map at ${vp.width}x${vp.height}: scrollWidth=${mapOverflow.scrollWidth} > clientWidth=${mapOverflow.clientWidth}`);
      }

      // Launch Stage
      await page.click('.stage-node[data-sector="1"][data-stage="1"]', { force: true });
      await page.waitForTimeout(500);

      // Check Combat Arena (Drawer closed)
      const arenaClosedOverflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      if (arenaClosedOverflow.scrollWidth > arenaClosedOverflow.clientWidth) {
        throw new Error(`Horizontal overflow on Arena (Drawer closed) at ${vp.width}x${vp.height}: scrollWidth=${arenaClosedOverflow.scrollWidth} > clientWidth=${arenaClosedOverflow.clientWidth}`);
      }

      // Open drawer & check Combat Arena (Drawer open)
      await page.click('#btn-toggle-upgrade-panel');
      await page.waitForTimeout(200);
      const arenaOpenOverflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      if (arenaOpenOverflow.scrollWidth > arenaOpenOverflow.clientWidth) {
        throw new Error(`Horizontal overflow on Arena (Drawer open) at ${vp.width}x${vp.height}: scrollWidth=${arenaOpenOverflow.scrollWidth} > clientWidth=${arenaOpenOverflow.clientWidth}`);
      }

      // Close drawer again
      await page.click('#btn-minimize-upgrade');
      await page.waitForTimeout(200);

      // Check Parent Report Modal
      await page.click('#btn-parent-report');
      await page.waitForTimeout(300);
      const reportOverflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      if (reportOverflow.scrollWidth > reportOverflow.clientWidth) {
        throw new Error(`Horizontal overflow on Parent Report at ${vp.width}x${vp.height}: scrollWidth=${reportOverflow.scrollWidth} > clientWidth=${reportOverflow.clientWidth}`);
      }
      await page.click('#btn-close-report');
      await page.waitForTimeout(200);

      await context.close();
      console.log(`      ✓ Viewport ${vp.width}x${vp.height}: Zero overflow verified across all screens.`);
    }
    console.log('   ✅ Multi-Viewport Overflow Matrix: PASSED');

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Rapid Touch / Tap Sequences on Lane Buttons & Virtual Numpad
    // -------------------------------------------------------------------------
    console.log('\n[STRESS TEST 3] Rapid Touch Tap Sequences (Lanes & Virtual Numpad)...');
    {
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
        hasTouch: true
      });
      const page = await context.newPage();

      await page.goto('http://localhost:5173/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForTimeout(300);

      await page.fill('#gateway-input-name', 'TapStress');
      await page.selectOption('#gateway-select-grade', '2');
      await page.click('#gateway-btn-create');
      await page.waitForTimeout(300);
      if (await page.isVisible('#btn-save-diff')) {
        await page.click('#btn-save-diff');
        await page.waitForTimeout(300);
      }

      await page.click('.stage-node[data-sector="1"][data-stage="1"]', { force: true });
      await page.waitForTimeout(500);

      // 3a. Rapid Lane Button Tap Barrage
      console.log('   Executing 30 rapid lane button taps across lanes 0-4...');
      const targetLanesSequence = [0, 4, 1, 3, 2, 0, 2, 4, 1, 3, 0, 4, 2, 1, 3, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0, 2, 0, 4, 1, 3];
      for (const laneIdx of targetLanesSequence) {
        await page.tap(`.lane-btn[data-lane="${laneIdx}"]`);
        await page.waitForTimeout(20);
      }

      // Final target lane should be Lane 4 (index 3)
      await page.waitForTimeout(100);
      const activeLaneState = await page.evaluate(() => {
        return {
          engineLane: window.app.gameEngine.state.selectedLane,
          hudTag: document.getElementById('math-lane-tag').textContent,
          activeBtnIndex: Array.from(document.querySelectorAll('.lane-btn')).findIndex(b => b.classList.contains('active'))
        };
      });
      console.log(`   Final Lane State: Engine=${activeLaneState.engineLane}, HUD="${activeLaneState.hudTag}", ButtonIndex=${activeLaneState.activeBtnIndex}`);
      if (activeLaneState.engineLane !== 3 || activeLaneState.activeBtnIndex !== 3 || !activeLaneState.hudTag.includes('LANE 4')) {
        throw new Error(`Lane selection desynced after rapid taps! Expected lane 3, got engine=${activeLaneState.engineLane}, btn=${activeLaneState.activeBtnIndex}`);
      }

      // 3b. Rapid Virtual Numpad Typing & Modifiers Stress
      console.log('   Executing rapid Virtual Numpad tapping (digits, signs, backspaces)...');
      // Test negation on standard 3-digit number (123 -> -123 -> 123)
      await page.tap('.num-key[data-val="1"]');
      await page.tap('.num-key[data-val="2"]');
      await page.tap('.num-key[data-val="3"]');
      await page.waitForTimeout(30);

      let currentDisplay = await page.textContent('#math-input-display');
      console.log(`   Display after digits 1, 2, 3: "${currentDisplay}"`);
      if (currentDisplay !== '123') {
        throw new Error(`Digits entry failed: expected "123", got "${currentDisplay}"`);
      }

      // Negation toggle test on populated 3-digit number
      await page.tap('.num-key[data-action="neg"]');
      await page.waitForTimeout(30);
      currentDisplay = await page.textContent('#math-input-display');
      console.log(`   Display after negation: "${currentDisplay}"`);
      if (currentDisplay !== '-123') {
        throw new Error(`Negation failed on populated number: expected "-123", got "${currentDisplay}"`);
      }

      // Negation toggle back
      await page.tap('.num-key[data-action="neg"]');
      await page.waitForTimeout(30);
      currentDisplay = await page.textContent('#math-input-display');
      console.log(`   Display after toggling negation back: "${currentDisplay}"`);
      if (currentDisplay !== '123') {
        throw new Error(`Negation revert failed: expected "123", got "${currentDisplay}"`);
      }

      // Clear input
      for (let i = 0; i < 4; i++) {
        await page.tap('.num-key[data-action="backspace"]');
        await page.waitForTimeout(15);
      }

      // Test 6-character buffer saturation & capping
      console.log('   Testing 6-character buffer limit capping...');
      for (const d of ['1', '2', '3', '4', '5', '6', '7', '8']) {
        await page.tap(`.num-key[data-val="${d}"]`);
        await page.waitForTimeout(15);
      }
      currentDisplay = await page.textContent('#math-input-display');
      console.log(`   Display after 8 digits (capped at 6): "${currentDisplay}"`);
      if (currentDisplay !== '123456') {
        throw new Error(`Buffer capping failed: expected "123456", got "${currentDisplay}"`);
      }

      // Verify that negating a saturated 6-character positive number does not overflow buffer
      await page.tap('.num-key[data-action="neg"]');
      await page.waitForTimeout(30);
      currentDisplay = await page.textContent('#math-input-display');
      console.log(`   Display after negating saturated buffer: "${currentDisplay}"`);
      if (currentDisplay.length > 6) {
        throw new Error(`Buffer overflow occurred: length ${currentDisplay.length} > 6`);
      }

      // Rapid backspacing down to empty
      for (let i = 0; i < 8; i++) {
        await page.tap('.num-key[data-action="backspace"]');
        await page.waitForTimeout(15);
      }
      currentDisplay = await page.textContent('#math-input-display');
      console.log(`   Display after complete backspacing: "${currentDisplay}"`);
      if (currentDisplay !== '?') {
        throw new Error(`Empty input display failed: expected "?", got "${currentDisplay}"`);
      }

      // Double-toggle negation on empty
      await page.tap('.num-key[data-action="neg"]');
      await page.waitForTimeout(30);
      currentDisplay = await page.textContent('#math-input-display');
      if (currentDisplay !== '-') throw new Error(`Single neg toggle on empty failed: got "${currentDisplay}"`);
      await page.tap('.num-key[data-action="neg"]');
      await page.waitForTimeout(30);
      currentDisplay = await page.textContent('#math-input-display');
      if (currentDisplay !== '?') throw new Error(`Double neg toggle revert on empty failed: got "${currentDisplay}"`);

      // 3c. Solve active defense equation with tap input
      console.log('   Solving active defense equation with touch taps...');
      const combatProb = await page.evaluate(() => {
        const lane = window.app.gameEngine.state.selectedLane;
        return window.app.gameEngine.state.laneProblems[lane];
      });
      console.log(`      Equation: "${combatProb.question}" (Answer = ${combatProb.answer})`);

      const ansStr = String(combatProb.answer);
      if (ansStr.startsWith('-')) {
        await page.tap('.num-key[data-action="neg"]');
        for (const ch of ansStr.slice(1)) {
          await page.tap(`.num-key[data-val="${ch}"]`);
        }
      } else {
        for (const ch of ansStr) {
          await page.tap(`.num-key[data-val="${ch}"]`);
        }
      }
      await page.tap('.num-key[data-action="submit"]');
      await page.waitForTimeout(300);

      const feedback = await page.textContent('#math-feedback');
      console.log(`      Feedback after touch solve: "${feedback}"`);
      if (!feedback.includes('EXCELLENT')) {
        throw new Error(`Touch tap solve failed: expected "EXCELLENT", got "${feedback}"`);
      }

      // 3d. Submit incorrect answer intentionally to stress error path
      console.log('   Testing intentional wrong answer submission...');
      await page.tap('.num-key[data-val="9"]');
      await page.tap('.num-key[data-val="9"]');
      await page.tap('.num-key[data-action="submit"]');
      await page.waitForTimeout(300);
      const wrongFeedback = await page.textContent('#math-feedback');
      console.log(`      Feedback after wrong answer: "${wrongFeedback}"`);
      if (!wrongFeedback.includes('WRONG! JAMMED!')) {
        throw new Error(`Wrong answer test failed: expected "WRONG! JAMMED!", got "${wrongFeedback}"`);
      }

      await context.close();
      console.log('   ✅ Rapid Touch Tap Sequences & Numpad Stress: PASSED');
    }

    console.log('\n======================================================================');
    console.log('🎉 ALL ADVERSARIAL MOBILE STRESS TESTS PASSED WITH ZERO FAILURES!');
    console.log('======================================================================');
  } finally {
    if (browser) {
      await browser.close();
    }
    stopDevServer(devServer);
  }
}

runAdversarialMobileStress().catch((err) => {
  console.error('\n❌ ADVERSARIAL MOBILE STRESS HARNESS FAILED:', err);
  process.exit(1);
});
