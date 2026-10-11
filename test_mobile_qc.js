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
 * Math Invaders Mobile E2E Quality Control & Regression Suite
 * Viewport: 414x896 (Mobile Standard / iPhone XR/11/12/13/14 Max viewport)
 * Browser: Google Chrome (Headless)
 */
async function runMobileQC() {
  console.log('===============================================================');
  console.log('📱 RUNNING MATH INVADERS MOBILE E2E TEST SUITE (414x896)');
  console.log('===============================================================');

  const devServer = await ensureDevServer();
  let browser = null;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 414, height: 896 } });
    const page = await context.newPage();

  // Helper for asserting zero horizontal overflow on mobile screens
  const assertZeroHorizontalOverflow = async (screenName) => {
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    console.log(`   [Mobile Overflow Check: ${screenName}] scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}`);
    if (overflow.scrollWidth > overflow.clientWidth) {
      throw new Error(`Horizontal overflow detected on mobile ${screenName}! scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`);
    }
  };

  // 1. Startup & Mobile Profile Creation Gateway
  console.log('\n[TEST 1] Mobile First-Time Startup & Profile Gateway...');
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(500);

  await assertZeroHorizontalOverflow('Mobile Profile Gateway');

  const isGatewayVisible = await page.isVisible('#view-profile-select:not(.hidden)');
  console.log(`   Mobile Gateway Visible: ${isGatewayVisible}`);
  if (!isGatewayVisible) throw new Error('Mobile Gateway not visible on fresh startup!');

  // Select custom flying saucer avatar 🛸
  console.log('   Selecting custom avatar (🛸)...');
  await page.click('.gateway-avatar-btn[data-av="🛸"]');

  // Fill mobile pilot name and select Grade 2
  console.log('   Entering mobile pilot name "NovaMobile" and Grade 2...');
  await page.fill('#gateway-input-name', 'NovaMobile');
  await page.selectOption('#gateway-select-grade', '2');
  await page.click('#gateway-btn-create');
  await page.waitForTimeout(400);

  // Handle difficulty tailoring modal
  const isDiffModal = await page.isVisible('.modal-title:has-text("Math Difficulty")');
  console.log(`   Math difficulty modal opened on mobile: ${isDiffModal}`);
  if (isDiffModal) {
    await assertZeroHorizontalOverflow('Mobile Math Difficulty Modal');
    await page.click('#btn-save-diff');
    await page.waitForTimeout(400);
  }

  // Verify header on mobile
  const headerAvatar = await page.textContent('#header-avatar');
  const headerName = await page.textContent('#header-player-name');
  console.log(`   Mobile header: Avatar="${headerAvatar}", Pilot="${headerName}"`);
  if (!headerAvatar.includes('🛸') || headerName !== 'NovaMobile') {
    throw new Error('Mobile header profile info verification failed!');
  }

  // 2. Mobile Cosmic Star Map Navigation
  console.log('\n[TEST 2] Mobile Cosmic Star Map Responsive Navigation...');
  const isStarMapVisible = await page.isVisible('#view-star-map:not(.hidden)');
  console.log(`   Star Map Visible on mobile: ${isStarMapVisible}`);
  if (!isStarMapVisible) throw new Error('Star Map not visible on mobile!');
  await assertZeroHorizontalOverflow('Mobile Cosmic Star Map');

  const sectorsCount = await page.locator('.sector-section').count();
  console.log(`   Sectors rendered on mobile: ${sectorsCount}`);
  if (sectorsCount !== 5) throw new Error(`Expected 5 sectors on mobile star map, found ${sectorsCount}`);

  // Launch Sector 1 Stage 1
  console.log('   Launching Sector 1 Stage 1 on mobile viewport...');
  await page.click('.stage-node[data-sector="1"][data-stage="1"]', { force: true });
  await page.waitForTimeout(600);

  // 3. Mobile Combat Arena & Responsive Layout
  console.log('\n[TEST 3] Mobile Combat Arena & Responsive Canvas...');
  const isArenaVisible = await page.isVisible('#view-game-arena:not(.hidden)');
  console.log(`   Combat Arena Visible on mobile: ${isArenaVisible}`);
  if (!isArenaVisible) throw new Error('Combat Arena did not become visible on mobile!');
  await assertZeroHorizontalOverflow('Mobile Combat Arena');

  const stageTitle = await page.textContent('#hud-stage-name');
  console.log(`   HUD Stage Title: "${stageTitle}"`);
  if (!stageTitle.includes('SECTOR 1 — STAGE 1')) throw new Error('Unexpected stage title on mobile HUD!');

  // 4. Non-Blocking Upgrade Drawer Contracts (Closed by default, z-index 35 HUD, top 52px)
  console.log('\n[TEST 4] Mobile Non-Blocking Upgrade Drawer Contracts...');
  // 4a. Verify drawer starts CLOSED by default on screen width < 768px
  const drawerClasses = await page.getAttribute('#upgrade-side-panel', 'class');
  console.log(`   Initial drawer class: "${drawerClasses}"`);
  if (!drawerClasses || !drawerClasses.includes('closed')) {
    throw new Error('Upgrade drawer MUST start closed by default on mobile screens (< 768px)!');
  }

  // 4b. Verify HUD and Drawer contract styles (HUD z-index: 35, drawer top: 52px)
  const stylesContract = await page.evaluate(() => {
    const hud = document.getElementById('game-hud');
    const drawer = document.getElementById('upgrade-side-panel');
    const hudStyle = window.getComputedStyle(hud);
    const drawerStyle = window.getComputedStyle(drawer);
    return {
      hudZIndex: hudStyle.zIndex,
      drawerTop: drawerStyle.top
    };
  });
  console.log(`   Style Contracts: HUD z-index="${stylesContract.hudZIndex}", Drawer top="${stylesContract.drawerTop}"`);
  if (stylesContract.hudZIndex !== '35') {
    throw new Error(`Expected HUD z-index 35, got ${stylesContract.hudZIndex}`);
  }
  if (stylesContract.drawerTop !== '52px') {
    throw new Error(`Expected mobile drawer top 52px, got ${stylesContract.drawerTop}`);
  }

  // 4c. Toggle open drawer via #btn-toggle-upgrade-panel
  console.log('   Toggling upgrade drawer open via #btn-toggle-upgrade-panel...');
  await page.click('#btn-toggle-upgrade-panel');
  await page.waitForTimeout(300);

  const drawerAfterOpen = await page.getAttribute('#upgrade-side-panel', 'class');
  const isDrawerOpen = !drawerAfterOpen.includes('closed');
  console.log(`   Drawer open state: ${isDrawerOpen}`);
  if (!isDrawerOpen) throw new Error('Toggle button failed to open mobile upgrade drawer!');
  await assertZeroHorizontalOverflow('Combat Arena with Drawer Open');

  // 4d. Solve a bonus problem in real-time in the open mobile drawer
  console.log('   Solving bonus upgrade problem on mobile via mini-numpad...');
  const upgProb = await page.evaluate(() => window.app.gameEngine.getActiveUpgradeProblem());
  if (!upgProb) throw new Error('No active upgrade problem found on mobile!');
  const upgQuestion = await page.textContent('#side-upg-question');
  console.log(`      Upgrade problem: "${upgQuestion}" (Answer = ${upgProb.answer})`);

  const ansStr = String(upgProb.answer);
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

  const updatedTierLabel = await page.textContent('#side-tier-label');
  console.log(`      Tier label after solve: "${updatedTierLabel}"`);
  if (!updatedTierLabel.includes('Tier 2: Dual-Wing Hunter')) {
    throw new Error(`Expected upgrade to Tier 2 on mobile, got "${updatedTierLabel}"`);
  }

  // 4e. Minimize drawer via #btn-minimize-upgrade
  console.log('   Minimizing upgrade drawer via #btn-minimize-upgrade...');
  await page.click('#btn-minimize-upgrade');
  await page.waitForTimeout(300);

  const drawerAfterMinimize = await page.getAttribute('#upgrade-side-panel', 'class');
  const isDrawerClosedAgain = drawerAfterMinimize.includes('closed');
  console.log(`   Drawer closed after minimize: ${isDrawerClosedAgain}`);
  if (!isDrawerClosedAgain) throw new Error('Minimize button failed to close upgrade drawer!');
  await assertZeroHorizontalOverflow('Combat Arena with Drawer Closed');

  // 5. Mobile 5-Lane Targeting Buttons & Virtual Numpad
  console.log('\n[TEST 5] Mobile 5-Lane Selection & Virtual Numpad Controls...');
  // 5a. Lane 1 Button
  await page.click('.lane-btn[data-lane="0"]');
  await page.waitForTimeout(150);
  let laneTag = await page.textContent('#math-lane-tag');
  console.log(`   Active lane after tapping Lane 1: "${laneTag}"`);
  if (!laneTag.includes('LANE 1')) throw new Error('Lane 1 button failed on mobile!');

  // 5b. Lane 4 Button
  await page.click('.lane-btn[data-lane="3"]');
  await page.waitForTimeout(150);
  laneTag = await page.textContent('#math-lane-tag');
  console.log(`   Active lane after tapping Lane 4: "${laneTag}"`);
  if (!laneTag.includes('LANE 4')) throw new Error('Lane 4 button failed on mobile!');

  // 5c. Lane 3 Button (Center)
  await page.click('.lane-btn[data-lane="2"]');
  await page.waitForTimeout(150);
  laneTag = await page.textContent('#math-lane-tag');
  console.log(`   Active lane after tapping Lane 3: "${laneTag}"`);
  if (!laneTag.includes('LANE 3')) throw new Error('Lane 3 button failed on mobile!');

  // 5d. Virtual Numpad Input Manipulation (Digits, Sign, Backspace)
  console.log('   Testing Virtual Numpad typing and modifiers...');
  await page.click('.num-key[data-val="7"]');
  await page.waitForTimeout(100);
  let mathDisplay = await page.textContent('#math-input-display');
  console.log(`      Display after digit 7: "${mathDisplay}"`);
  if (!mathDisplay.includes('7')) throw new Error('Virtual numpad digit 7 failed!');

  await page.click('.num-key[data-action="neg"]');
  await page.waitForTimeout(100);
  mathDisplay = await page.textContent('#math-input-display');
  console.log(`      Display after neg toggle: "${mathDisplay}"`);
  if (!mathDisplay.includes('-7')) throw new Error('Virtual numpad negative toggle failed!');

  await page.click('.num-key[data-action="backspace"]');
  await page.waitForTimeout(100);
  mathDisplay = await page.textContent('#math-input-display');
  console.log(`      Display after backspace: "${mathDisplay}"`);

  // Clear any remaining input
  await page.click('.num-key[data-action="backspace"]');
  await page.waitForTimeout(100);

  // 5e. Solve Active Defense Equation via Mobile Virtual Numpad
  console.log('   Solving active defense equation via Mobile Virtual Numpad...');
  const combatProb = await page.evaluate(() => {
    const lane = window.app.gameEngine.state.selectedLane;
    return window.app.gameEngine.state.laneProblems[lane];
  });
  console.log(`      Question: "${combatProb.question}" (Answer = ${combatProb.answer})`);

  const combatAnsStr = String(combatProb.answer);
  if (combatAnsStr.startsWith('-')) {
    await page.click('.num-key[data-action="neg"]');
    for (const ch of combatAnsStr.slice(1)) {
      await page.click(`.num-key[data-val="${ch}"]`);
    }
  } else {
    for (const ch of combatAnsStr) {
      await page.click(`.num-key[data-val="${ch}"]`);
    }
  }
  await page.click('.num-key[data-action="submit"]');
  await page.waitForTimeout(300);

  const combatFeedback = await page.textContent('#math-feedback');
  console.log(`      Combat feedback: "${combatFeedback}"`);
  if (!combatFeedback.includes('EXCELLENT')) {
    throw new Error('Combat equation solve via mobile virtual numpad failed!');
  }

  // 6. Mobile Parent Report Modal & Printable Worksheet Generation
  console.log('\n[TEST 6] Mobile Parent Report Modal & Offline Practice Sheet...');
  await page.click('#btn-parent-report');
  await page.waitForTimeout(400);

  const isParentReportVisible = await page.isVisible('.modal-title:has-text("Parent Analytics: NovaMobile")');
  console.log(`   Mobile Parent Report Modal open: ${isParentReportVisible}`);
  if (!isParentReportVisible) throw new Error('Parent Report Modal did not open on mobile!');
  await assertZeroHorizontalOverflow('Mobile Parent Report Modal');

  const mobileKpiValues = await page.evaluate(() => {
    const cards = document.querySelectorAll('.modal-body [style*="text-align: center"] div:last-child');
    return Array.from(cards).map(c => c.textContent?.trim());
  });
  console.log(`   Mobile KPI Cards: Solved="${mobileKpiValues[0]}", Accuracy="${mobileKpiValues[1]}", Speed="${mobileKpiValues[2]}"`);
  if (parseInt(mobileKpiValues[0] || '0', 10) < 1) {
    throw new Error('Problems solved on mobile should be >= 1');
  }

  // Test printable worksheet generation popup on mobile
  console.log('   Testing #btn-print-offline printable sheet generation on mobile...');
  const [mobilePopup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 5000 }),
    page.click('#btn-print-offline')
  ]);

  const mobilePopupTitle = await mobilePopup.title();
  const mobilePopupBody = await mobilePopup.textContent('body');
  console.log(`   Mobile Popup Title: "${mobilePopupTitle}"`);
  console.log(`   Contains NovaMobile: ${mobilePopupBody.includes('NovaMobile')}`);
  console.log(`   Contains Offline Practice Worksheet: ${mobilePopupBody.includes('Offline Practice Worksheet')}`);
  console.log(`   Contains Parent Answer Key: ${mobilePopupBody.includes('Parent Answer Key')}`);

  if (!mobilePopupTitle.includes('Practice Sheet (NovaMobile)') || !mobilePopupBody.includes('Offline Practice Worksheet')) {
    throw new Error('Mobile printable worksheet validation failed!');
  }
  await mobilePopup.close();

  // Close parent report modal
  await page.click('#btn-close-report');
  await page.waitForTimeout(300);

  // Final Mobile Zero-Overflow Assertion
  await assertZeroHorizontalOverflow('Final Mobile View');

  console.log('\n===============================================================');
  console.log('✅ ALL MOBILE PLAYWRIGHT E2E TESTS PASSED WITH 100% SUCCESS!');
  console.log('===============================================================');
  } finally {
    if (browser) {
      await browser.close();
    }
    stopDevServer(devServer);
  }
}

runMobileQC().catch(err => {
  console.error('\n❌ MOBILE QC TEST SUITE FAILED:', err);
  process.exit(1);
});
