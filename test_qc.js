import { chromium } from 'playwright';
import http from 'http';
import { spawn } from 'child_process';

function checkServerReady(url = 'http://localhost:5173/') {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(true);
    });
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
 * Math Invaders Desktop E2E Quality Control & Regression Suite
 * Viewport: 1280x800 (Desktop Standard)
 * Browser: Google Chrome (Headless)
 */
async function runDesktopQC() {
  console.log('===============================================================');
  console.log('🚀 RUNNING MATH INVADERS DESKTOP E2E TEST SUITE (1280x800)');
  console.log('===============================================================');

  const devServer = await ensureDevServer();
  let browser = null;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

  // Helper for checking horizontal overflow
  const assertZeroHorizontalOverflow = async (contextName) => {
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    console.log(`   [Overflow Check: ${contextName}] scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}`);
    if (overflow.scrollWidth > overflow.clientWidth) {
      throw new Error(`Horizontal overflow detected in ${contextName}! scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`);
    }
  };

  // 1. Startup & Profile Creation Gateway
  console.log('\n[TEST 1] First-Time Startup & Custom Profile Creation...');
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(500);

  const isProfileGatewayVisible = await page.isVisible('#view-profile-select:not(.hidden)');
  console.log(`   Profile Gateway Visible on first startup: ${isProfileGatewayVisible}`);
  if (!isProfileGatewayVisible) throw new Error('Profile Gateway not visible on first startup!');

  await assertZeroHorizontalOverflow('Profile Gateway');

  // Select custom avatar: robot 🤖
  console.log('   Selecting custom avatar (🤖)...');
  await page.click('.gateway-avatar-btn[data-av="🤖"]');

  // Fill custom name and grade
  console.log('   Entering custom pilot name "Astra" and selecting Grade 3...');
  await page.fill('#gateway-input-name', 'Astra');
  await page.selectOption('#gateway-select-grade', '3');
  await page.click('#gateway-btn-create');
  await page.waitForTimeout(400);

  // 2. Math Difficulty Customization & Persistence
  console.log('\n[TEST 2] Math Difficulty Customization & Settings Persistence...');
  const isDiffModalVisible = await page.isVisible('.modal-title');
  console.log(`   Math Difficulty Tailoring Modal opened for new profile: ${isDiffModalVisible}`);
  if (!isDiffModalVisible) throw new Error('Difficulty modal did not appear for new profile!');

  // Switch Grade Preset to Grade 4
  console.log('   Switching grade preset to G4...');
  await page.click('.grade-preset-btn[data-grade="4"]');
  await page.waitForTimeout(200);

  // Adjust number ceiling slider to 80 (step is 10)
  console.log('   Adjusting maximum number ceiling slider to 80...');
  await page.evaluate(() => {
    const slider = document.getElementById('slider-max-num');
    slider.value = '80';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const maxNumDisplay = await page.textContent('#display-max-num');
  console.log(`   Max number ceiling display updated to: "${maxNumDisplay}"`);
  if (maxNumDisplay !== '80') throw new Error(`Slider display expected '80' but got '${maxNumDisplay}'`);

  // Verify operations checkboxes exist
  const opCheckboxesCount = await page.locator('.op-checkbox').count();
  console.log(`   Operations checkboxes rendered: ${opCheckboxesCount}`);
  if (opCheckboxesCount < 4) throw new Error('Operations checkboxes missing in difficulty modal!');

  // Save tailored math settings
  console.log('   Saving tailored math settings...');
  await page.click('#btn-save-diff');
  await page.waitForTimeout(400);

  // Verify header UI displays chosen custom avatar, name, and updated grade
  const headerAvatar = await page.textContent('#header-avatar');
  const headerName = await page.textContent('#header-player-name');
  const headerGrade = await page.textContent('#header-grade-tag');
  console.log(`   Header UI verified: Avatar="${headerAvatar}", Name="${headerName}", Grade="${headerGrade}"`);
  if (!headerAvatar.includes('🤖')) throw new Error(`Header avatar expected '🤖' but got '${headerAvatar}'`);
  if (headerName !== 'Astra') throw new Error(`Header name expected 'Astra' but got '${headerName}'`);
  if (!headerGrade.includes('Grade 4') && !headerGrade.includes('4. klasse')) throw new Error(`Header grade expected 'Grade 4' or '4. klasse' but got '${headerGrade}'`);

  // Verify localStorage persistence
  const savedSettings = await page.evaluate(() => {
    const profiles = JSON.parse(localStorage.getItem('math_invaders_profiles_v1') || '[]');
    const active = profiles.find(p => p.name === 'Astra');
    return active ? active.mathSettings : null;
  });
  console.log('   Verified localStorage persistence:', savedSettings);
  if (!savedSettings || savedSettings.maxNumber !== 80 || savedSettings.grade !== 4) {
    throw new Error('Math difficulty settings failed to persist to localStorage!');
  }

  // Test re-opening difficulty modal via header tag to confirm values persist
  console.log('   Re-opening difficulty modal via header tag to verify persisted values...');
  await page.click('#header-grade-tag');
  await page.waitForTimeout(300);
  const reloadedMaxNum = await page.textContent('#display-max-num');
  const isG4Active = await page.getAttribute('.grade-preset-btn[data-grade="4"]', 'class');
  console.log(`   Re-opened modal: maxNum="${reloadedMaxNum}", G4 active class="${isG4Active}"`);
  if (reloadedMaxNum !== '80' || !isG4Active.includes('active')) {
    throw new Error('Difficulty modal did not preserve settings upon reopening!');
  }
  await page.click('#btn-close-diff');
  await page.waitForTimeout(300);

  // 3. Star Map Navigation Across Sectors & Stage Launching
  console.log('\n[TEST 3] Cosmic Star Map Navigation Across All 5 Planetary Sectors...');
  const isStarMapVisible = await page.isVisible('#view-star-map:not(.hidden)');
  console.log(`   Star Map Visible: ${isStarMapVisible}`);
  if (!isStarMapVisible) throw new Error('Star map view not visible!');
  await assertZeroHorizontalOverflow('Cosmic Star Map');

  // Verify all 5 sectors are displayed
  const sectorsCount = await page.locator('.sector-section').count();
  console.log(`   Planetary Sectors rendered: ${sectorsCount} (Expected 5)`);
  if (sectorsCount !== 5) throw new Error(`Expected 5 planetary sectors on Star Map, found ${sectorsCount}`);

  // Launch Sector 1 Stage 1
  console.log('   Launching Sector 1 Stage 1...');
  await page.click('.stage-node[data-sector="1"][data-stage="1"]', { force: true });
  await page.waitForTimeout(600);

  const isArenaVisible = await page.isVisible('#view-game-arena:not(.hidden)');
  console.log(`   Combat Arena Visible: ${isArenaVisible}`);
  if (!isArenaVisible) throw new Error('Combat Arena did not become visible!');
  const stageName = await page.textContent('#hud-stage-name');
  console.log(`   HUD Stage Name: "${stageName}"`);
  if (!stageName.includes('SECTOR 1 — STAGE 1') && !stageName.includes('SEKTOR 1 — BANE 1')) throw new Error('Unexpected stage title in arena HUD!');

  // Test returning to map from arena
  console.log('   Testing return to Star Map via #btn-exit-to-map...');
  await page.click('#btn-exit-to-map');
  await page.waitForTimeout(400);
  const isBackOnMap = await page.isVisible('#view-star-map:not(.hidden)');
  console.log(`   Returned to Star Map: ${isBackOnMap}`);
  if (!isBackOnMap) throw new Error('Failed to return to Star Map from arena!');

  // Unlock and test launching another sector (Sector 2 Stage 1)
  console.log('   Testing unlocking and launching Sector 2 Stage 1...');
  await page.evaluate(() => {
    const prof = window.app.profile;
    prof.stageProgress['2-1'] = { completed: false, stars: 0, highScore: 0, accuracy: 0 };
    window.app.renderStarMap();
  });
  await page.waitForTimeout(300);
  await page.click('.stage-node.unlocked[data-sector="2"][data-stage="1"]', { force: true });
  await page.waitForTimeout(500);
  const sec2StageName = await page.textContent('#hud-stage-name');
  console.log(`   Sector 2 Stage Launched: "${sec2StageName}"`);
  if (!sec2StageName.includes('SECTOR 2 — STAGE 1') && !sec2StageName.includes('SEKTOR 2 — BANE 1')) throw new Error('Failed to launch Sector 2 Stage 1!');

  // Return to map and relaunch Sector 1 Stage 1 for the remaining tests
  await page.click('#btn-exit-to-map');
  await page.waitForTimeout(400);
  await page.click('.stage-node[data-sector="1"][data-stage="1"]', { force: true });
  await page.waitForTimeout(600);

  // 4. 5-Lane Targeting
  console.log('\n[TEST 4] 5-Lane Responsive Targeting (Canvas, Buttons, Keys, Steering)...');
  const canvasBox = await page.locator('#game-canvas').boundingBox();
  if (!canvasBox) throw new Error('Game canvas bounding box not found!');

  // 4a. Canvas Pointerdown / Click
  console.log('   4a. Testing canvas click targeting...');
  // Click Lane 1 (x ~ 10%)
  await page.mouse.click(canvasBox.x + canvasBox.width * 0.1, canvasBox.y + canvasBox.height * 0.5);
  await page.waitForTimeout(200);
  let activeLane = await page.textContent('#math-lane-tag');
  console.log(`      Active lane after clicking Lane 1 on canvas: "${activeLane}"`);
  if (!activeLane.includes('LANE 1') && !activeLane.includes('BANE 1')) throw new Error('Canvas click failed to select Lane 1!');

  // Click Lane 5 (x ~ 90%)
  await page.mouse.click(canvasBox.x + canvasBox.width * 0.9, canvasBox.y + canvasBox.height * 0.5);
  await page.waitForTimeout(200);
  activeLane = await page.textContent('#math-lane-tag');
  console.log(`      Active lane after clicking Lane 5 on canvas: "${activeLane}"`);
  if (!activeLane.includes('LANE 5') && !activeLane.includes('BANE 5')) throw new Error('Canvas click failed to select Lane 5!');

  // 4b. Bottom Buttons .lane-btn [1]–[5]
  console.log('   4b. Testing bottom .lane-btn buttons...');
  // Click Lane 2 (data-lane="1")
  await page.click('.lane-btn[data-lane="1"]');
  await page.waitForTimeout(200);
  activeLane = await page.textContent('#math-lane-tag');
  const isBtn2Active = await page.getAttribute('.lane-btn[data-lane="1"]', 'class');
  console.log(`      Active lane after clicking Lane 2 button: "${activeLane}", class="${isBtn2Active}"`);
  if ((!activeLane.includes('LANE 2') && !activeLane.includes('BANE 2')) || !isBtn2Active.includes('active')) {
    throw new Error('Lane button 2 failed to select Lane 2!');
  }

  // Click Lane 4 (data-lane="3")
  await page.click('.lane-btn[data-lane="3"]');
  await page.waitForTimeout(200);
  activeLane = await page.textContent('#math-lane-tag');
  console.log(`      Active lane after clicking Lane 4 button: "${activeLane}"`);
  if (!activeLane.includes('LANE 4') && !activeLane.includes('BANE 4')) throw new Error('Lane button 4 failed to select Lane 4!');

  // 4c. Top-row Number Keys 1–5 & Input Disambiguation
  console.log('   4c. Testing top-row keys 1–5 and input disambiguation...');
  await page.keyboard.press('3');
  await page.waitForTimeout(200);
  activeLane = await page.textContent('#math-lane-tag');
  console.log(`      Active lane after pressing '3': "${activeLane}"`);
  if (!activeLane.includes('LANE 3') && !activeLane.includes('BANE 3')) throw new Error('Key "3" failed to select Lane 3!');

  // When on Lane 3 with empty input, pressing '3' must append digit '3' to currentInput
  await page.keyboard.press('3');
  await page.waitForTimeout(200);
  let mathInput = await page.textContent('#math-input-display');
  console.log(`      Math input display after pressing key '3' on Lane 3: "${mathInput}"`);
  if (!mathInput.includes('3')) throw new Error('Keyboard disambiguation failed: digit 3 was not entered!');

  // Clear with backspace
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(100);

  // 4d. Arrow & A / D Steering
  console.log('   4d. Testing Arrow and A / D steering navigation...');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  activeLane = await page.textContent('#math-lane-tag');
  if (!activeLane.includes('LANE 4') && !activeLane.includes('BANE 4')) throw new Error('ArrowRight failed to steer to Lane 4!');

  await page.keyboard.press('d');
  await page.waitForTimeout(200);
  activeLane = await page.textContent('#math-lane-tag');
  if (!activeLane.includes('LANE 5') && !activeLane.includes('BANE 5')) throw new Error('Key "d" failed to steer right to Lane 5!');

  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(200);
  activeLane = await page.textContent('#math-lane-tag');
  if (!activeLane.includes('LANE 4') && !activeLane.includes('BANE 4')) throw new Error('ArrowLeft failed to steer left to Lane 4!');

  await page.keyboard.press('a');
  await page.waitForTimeout(200);
  activeLane = await page.textContent('#math-lane-tag');
  if (!activeLane.includes('LANE 3') && !activeLane.includes('BANE 3')) throw new Error('Key "a" failed to steer left to Lane 3!');
  console.log('      Steering navigation fully validated (ArrowRight, d, ArrowLeft, a).');

  // 5. Live Upgrade Drawer & Ship Upgrades (Tiers 1–4)
  console.log('\n[TEST 5] Live Upgrade Drawer & Ship Upgrades (Tiers 1–4)...');
  const isDrawerOpen = await page.isVisible('#upgrade-side-panel:not(.closed)');
  console.log(`   Upgrade side drawer open & visible: ${isDrawerOpen}`);
  if (!isDrawerOpen) throw new Error('Upgrade side drawer should be open by default on desktop!');

  // Verify alien descent continues live while interacting with the drawer
  console.log('   Verifying alien march continues live without pausing...');
  const initialAlienY = await page.evaluate(() => {
    const aliens = window.app.gameEngine.state.aliens;
    return aliens.length > 0 ? aliens[0].y : null;
  });
  console.log(`      Initial Alien #0 Y position: ${initialAlienY}`);

  // Wait 1000ms while keeping drawer active
  await page.waitForTimeout(1000);

  const updatedAlienY = await page.evaluate(() => {
    const aliens = window.app.gameEngine.state.aliens;
    return aliens.length > 0 ? aliens[0].y : null;
  });
  console.log(`      Subsequent Alien #0 Y position after 1000ms: ${updatedAlienY}`);
  if (initialAlienY !== null && updatedAlienY !== null && updatedAlienY <= initialAlienY) {
    throw new Error('Alien descent stalled while upgrade drawer was active! Non-pausing invariant violated.');
  }
  console.log('      Alien descent continues continuously in real time!');

  // Helper to solve an upgrade bonus problem via the mini-numpad
  const solveUpgradeProblemViaMiniNumpad = async () => {
    const prob = await page.evaluate(() => window.app.gameEngine.getActiveUpgradeProblem());
    if (!prob) throw new Error('No active upgrade problem found!');
    const questionText = await page.textContent('#side-upg-question');
    console.log(`      Solving Upgrade Question "${questionText}" (Answer = ${prob.answer})...`);

    const ansStr = String(prob.answer);
    if (ansStr.startsWith('-')) {
      await page.click('#btn-upg-neg');
      for (const ch of ansStr.slice(1)) {
        await page.click(`.mini-key.upg-digit[data-v="${ch}"]`);
      }
    } else {
      for (const ch of ansStr) {
        await page.click(`.mini-key.upg-digit[data-v="${ch}"]`);
      }
    }
    await page.click('#btn-upg-submit');
    await page.waitForTimeout(250);
  };

  // Check initial tier (Tier 1)
  let currentTierLabel = await page.textContent('#side-tier-label');
  console.log(`   Initial ship tier: "${currentTierLabel}"`);
  if (!currentTierLabel.includes('Tier 1') && !currentTierLabel.includes('Niveau 1')) {
    throw new Error(`Expected Tier 1 Starter Scout, got "${currentTierLabel}"`);
  }

  // Solve to Tier 2 (Requires 1 solve)
  console.log('   Solving bonus problem to advance to Tier 2...');
  await solveUpgradeProblemViaMiniNumpad();
  currentTierLabel = await page.textContent('#side-tier-label');
  console.log(`   Updated ship tier: "${currentTierLabel}"`);
  if (!currentTierLabel.includes('Tier 2') && !currentTierLabel.includes('Niveau 2')) {
    throw new Error(`Expected Tier 2 Dual-Wing Hunter, got "${currentTierLabel}"`);
  }

  // Solve to Tier 3 (Requires 2 solves)
  console.log('   Solving bonus problems to advance to Tier 3...');
  await solveUpgradeProblemViaMiniNumpad();
  await solveUpgradeProblemViaMiniNumpad();
  currentTierLabel = await page.textContent('#side-tier-label');
  console.log(`   Updated ship tier: "${currentTierLabel}"`);
  if (!currentTierLabel.includes('Tier 3') && !currentTierLabel.includes('Niveau 3')) {
    throw new Error(`Expected Tier 3 Plasma Cruiser, got "${currentTierLabel}"`);
  }

  // Solve to Tier 4 (Requires 3 solves)
  console.log('   Solving bonus problems to advance to Tier 4 (MAX TIER)...');
  await solveUpgradeProblemViaMiniNumpad();
  await solveUpgradeProblemViaMiniNumpad();
  await solveUpgradeProblemViaMiniNumpad();
  currentTierLabel = await page.textContent('#side-tier-label');
  console.log(`   Updated ship tier: "${currentTierLabel}"`);
  if (!currentTierLabel.includes('Tier 4') && !currentTierLabel.includes('Niveau 4')) {
    throw new Error(`Expected Tier 4 Neon Flagship, got "${currentTierLabel}"`);
  }

  const upgradeBtnText = await page.textContent('#btn-toggle-upgrade-panel');
  console.log(`   Upgrade HUD button state: "${upgradeBtnText}"`);
  if (!upgradeBtnText.includes('MAX POWER') && !upgradeBtnText.includes('MAKS STYRKE')) {
    throw new Error('Upgrade button did not reflect MAX POWER state at Tier 4!');
  }

  // 6. Combat Equation Solving (Numpad & Keyboard)
  console.log('\n[TEST 6] Combat Equation Solving via Virtual Numpad & Keyboard...');
  // 6a. Virtual Numpad Solve
  const combatProblem1 = await page.evaluate(() => {
    const lane = window.app.gameEngine.state.selectedLane;
    return window.app.gameEngine.state.laneProblems[lane];
  });
  console.log(`   6a. Solving active combat equation via Virtual Numpad: "${combatProblem1.question}" (Answer = ${combatProblem1.answer})`);

  const ansStr1 = String(combatProblem1.answer);
  if (ansStr1.startsWith('-')) {
    await page.click('.num-key[data-action="neg"]');
    for (const ch of ansStr1.slice(1)) {
      await page.click(`.num-key[data-val="${ch}"]`);
    }
  } else {
    for (const ch of ansStr1) {
      await page.click(`.num-key[data-val="${ch}"]`);
    }
  }
  await page.click('.num-key[data-action="submit"]');
  await page.waitForTimeout(300);

  let feedback = await page.textContent('#math-feedback');
  console.log(`      Combat solve feedback: "${feedback}"`);
  if (!feedback.includes('EXCELLENT') && !feedback.includes('RIGTIGT')) throw new Error('Virtual numpad combat equation solve failed!');

  // 6b. Physical Keyboard Solve (Numpad)
  const combatProblem2 = await page.evaluate(() => {
    const lane = window.app.gameEngine.state.selectedLane;
    return window.app.gameEngine.state.laneProblems[lane];
  });
  console.log(`   6b. Solving next combat equation via Keyboard Numpad: "${combatProblem2.question}" (Answer = ${combatProblem2.answer})`);

  const ansStr2 = String(combatProblem2.answer);
  for (const ch of ansStr2) {
    if (ch === '-') {
      await page.keyboard.press('NumpadSubtract');
    } else {
      await page.keyboard.press(`Numpad${ch}`);
    }
    await page.waitForTimeout(50);
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  feedback = await page.textContent('#math-feedback');
  console.log(`      Keyboard combat solve feedback: "${feedback}"`);
  if (!feedback.includes('EXCELLENT') && !feedback.includes('RIGTIGT')) throw new Error('Keyboard combat equation solve failed!');

  // 6c. Intentional incorrect answer to test feedback and log trouble spot
  console.log('   6c. Submitting intentional wrong answer to test error handling & trouble spot logging...');
  await page.keyboard.press('9');
  await page.keyboard.press('9');
  await page.keyboard.press('9');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  feedback = await page.textContent('#math-feedback');
  console.log(`      Incorrect answer feedback: "${feedback}"`);
  if (!feedback.includes('WRONG') && !feedback.includes('FEJL') && !feedback.includes('BLOKERET')) throw new Error('Wrong answer feedback was not triggered!');

  // 7. Parent Report Modal & Printable Offline Worksheet
  console.log('\n[TEST 7] Parent Analytics Report & Printable Offline Worksheet Generation...');
  await page.click('#btn-parent-report');
  await page.waitForTimeout(400);

  const isReportModalVisible = await page.isVisible('.modal-title');
  console.log(`   Parent Report Modal open: ${isReportModalVisible}`);
  if (!isReportModalVisible) throw new Error('Parent Report Modal did not open!');

  // Inspect KPI Cards
  const kpiValues = await page.evaluate(() => {
    const cards = document.querySelectorAll('.modal-body [style*="text-align: center"] div:last-child');
    return Array.from(cards).map(c => c.textContent?.trim());
  });
  console.log(`   Summary KPI Cards: Solved="${kpiValues[0]}", Accuracy="${kpiValues[1]}", AvgResponse="${kpiValues[2]}"`);
  const totalSolvedNum = parseInt(kpiValues[0] || '0', 10);
  if (totalSolvedNum < 1) throw new Error('Total problems solved metric should be >= 1');
  if (!kpiValues[1]?.includes('%')) throw new Error('Accuracy metric should contain %');

  // Verify recent trouble spot is logged
  const troubleSpotsText = await page.textContent('.modal-body');
  const hasTroubleSpot = troubleSpotsText.includes('999') || troubleSpotsText.includes('Answer:') || troubleSpotsText.includes('Svarede:');
  console.log(`   Recent trouble spots logged: ${hasTroubleSpot}`);
  if (!hasTroubleSpot) throw new Error('Expected recent incorrect attempt to be logged in trouble spots!');

  // Test Printable Offline Worksheet Generation (window.open popup)
  console.log('   Testing #btn-print-offline printable worksheet generation popup...');
  const [popup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 5000 }),
    page.click('#btn-print-offline')
  ]);

  const popupTitle = await popup.title();
  const popupBody = await popup.textContent('body');
  console.log(`   Printable Sheet Window Title: "${popupTitle}"`);
  const hasWorksheetHeader = popupBody.includes('Offline Practice Worksheet') || popupBody.includes('Træningsark') || popupBody.includes('øveark');
  const hasAnswerKey = popupBody.includes('Parent Answer Key') || popupBody.includes('Facit') || popupBody.includes('Svar');
  console.log(`   Worksheet contains practice sheet header: ${hasWorksheetHeader}`);
  console.log(`   Worksheet contains Pilot name "Astra": ${popupBody.includes('Astra')}`);
  console.log(`   Worksheet contains Answer Key: ${hasAnswerKey}`);

  if (!popupTitle.includes('Astra') || !hasWorksheetHeader || !hasAnswerKey) {
    throw new Error('Printable worksheet generation popup content validation failed!');
  }
  await popup.close();
  console.log('   Popup verified and closed successfully.');

  // Close parent report modal
  await page.click('#btn-close-report');
  await page.waitForTimeout(300);

  // Final Desktop Layout Bounding Box & Horizontal Overflow Check
  await assertZeroHorizontalOverflow('Desktop Final Arena');

  console.log('\n===============================================================');
  console.log('✅ ALL DESKTOP PLAYWRIGHT E2E TESTS PASSED WITH 100% SUCCESS!');
  console.log('===============================================================');
  } finally {
    if (browser) {
      await browser.close();
    }
    stopDevServer(devServer);
  }
}

runDesktopQC().catch(err => {
  console.error('\n❌ DESKTOP QC TEST SUITE FAILED:', err);
  process.exit(1);
});
