import { chromium } from 'playwright';
import http from 'http';

function checkServerReady(url = 'http://localhost:5173/') {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function runMultipleChoiceQC() {
  console.log('===============================================================');
  console.log('🎯 RUNNING MULTIPLE CHOICE & LANE LOCKING E2E VERIFICATION SUITE');
  console.log('===============================================================');

  const isUp = await checkServerReady();
  if (!isUp) {
    throw new Error('Vite server not running on http://localhost:5173/! Please start the dev server.');
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // 1. Load application
    console.log('\n[TEST 1] Loading application and configuring Multiple Choice mode...');
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(400);

    // Profile creation gateway
    await page.click('.gateway-avatar-btn[data-av="🚀"]');
    await page.fill('#gateway-input-name', 'MathAce');
    await page.click('#gateway-btn-create');
    await page.waitForTimeout(400);

    // In Difficulty Modal, switch Answer Mode to Multiple Choice
    const isModalVisible = await page.isVisible('.modal-card');
    console.log(`   Difficulty Modal open on creation: ${isModalVisible}`);
    
    // Select Multiple Choice radio
    console.log('   Selecting "5 Multiple Choice Options" radio button...');
    await page.click('#mode-multiple-choice');
    await page.click('#btn-save-diff');
    await page.waitForTimeout(300);

    // Verify localStorage stored answerMode: 'multiple_choice'
    const storedSettings = await page.evaluate(() => {
      const p = window.app.profile;
      return p ? p.mathSettings : null;
    });
    console.log(`   Stored MathSettings answerMode: "${storedSettings?.answerMode}"`);
    if (storedSettings?.answerMode !== 'multiple_choice') {
      throw new Error(`Expected answerMode to be 'multiple_choice', got '${storedSettings?.answerMode}'`);
    }

    // 2. Launch Combat Arena
    console.log('\n[TEST 2] Launching Combat Arena in Multiple Choice Mode...');
    await page.click('.stage-node[data-sector="1"][data-stage="1"]', { force: true });
    await page.waitForTimeout(600);

    const isArenaVisible = await page.isVisible('#view-game-arena:not(.hidden)');
    console.log(`   Arena Visible: ${isArenaVisible}`);
    if (!isArenaVisible) throw new Error('Arena not visible after launching stage!');

    // 3. Verify Multiple Choice UI and Numpad Hidden
    console.log('\n[TEST 3] Verifying 5 Multiple Choice Buttons & Hidden Numpad...');
    const isNumpadHiddenClass = await page.evaluate(() => {
      return document.getElementById('virtual-numpad')?.classList.contains('hidden');
    });
    const isNumpadVisible = await page.locator('#virtual-numpad').isVisible();
    const isChoiceGridVisible = await page.isVisible('#multiple-choice-container');
    console.log(`   Virtual Numpad hidden class: ${isNumpadHiddenClass}, isVisible: ${isNumpadVisible}`);
    console.log(`   Multiple Choice Grid visible: ${isChoiceGridVisible}`);
    if (!isNumpadHiddenClass) throw new Error('Virtual numpad must have hidden class in Multiple Choice mode!');
    if (isNumpadVisible) throw new Error('Virtual numpad rows must be completely hidden/invisible in Multiple Choice mode!');
    if (!isChoiceGridVisible) throw new Error('Multiple choice container should be visible in Multiple Choice mode!');

    const choiceButtonsCount = await page.locator('#multiple-choice-container .choice-btn').count();
    console.log(`   Rendered Choice Buttons count: ${choiceButtonsCount} (Expected 5)`);
    if (choiceButtonsCount !== 5) {
      throw new Error(`Expected exactly 5 choice buttons, found ${choiceButtonsCount}`);
    }

    // 4. Strict Lane Locking Verification
    console.log('\n[TEST 4] Verifying Strict Lane Change Math Enforcement...');
    // Initial ship lane is 2 (Lane 3)
    let shipLane = await page.evaluate(() => window.app.gameEngine.state.playerLane);
    console.log(`   Initial ship playerLane: ${shipLane} (Center Lane 3)`);
    if (shipLane !== 2) throw new Error(`Expected initial playerLane 2, got ${shipLane}`);

    // Click Lane 1 (data-lane="0")
    console.log('   Targeting Lane 1 (data-lane="0") via lane selector button...');
    await page.click('.lane-btn[data-lane="0"]');
    await page.waitForTimeout(200);

    let selectedLane = await page.evaluate(() => window.app.gameEngine.state.selectedLane);
    shipLane = await page.evaluate(() => window.app.gameEngine.state.playerLane);
    const targetX = await page.evaluate(() => window.app.gameEngine.state.playerTargetX);
    const centerLane2X = await page.evaluate(() => window.app.gameEngine.state.getLaneCenterX(2));

    console.log(`   Selected Target Lane: ${selectedLane}`);
    console.log(`   Ship playerLane: ${shipLane}`);
    console.log(`   Ship targetX: ${targetX}, Center Lane 2 X: ${centerLane2X}`);

    if (selectedLane !== 0) throw new Error(`Selected lane should be 0, got ${selectedLane}`);
    if (shipLane !== 2) throw new Error(`Ship playerLane must STAY at 2 until math problem is solved! Got ${shipLane}`);
    if (targetX !== centerLane2X) throw new Error('Ship playerTargetX must remain anchored to Lane 2!');

    // Check targeting indicator label
    const tagText = await page.textContent('#math-lane-tag');
    console.log(`   Targeting HUD Tag text: "${tagText}"`);
    if (!tagText.includes('LANE 1') || !tagText.includes('SOLVE TO MOVE')) {
      throw new Error(`Targeting tag must instruct player to solve math: "${tagText}"`);
    }

    // Check .lane-btn classes: Lane 1 has .active, Lane 3 has .ship-here
    const lane0Class = await page.getAttribute('.lane-btn[data-lane="0"]', 'class');
    const lane2Class = await page.getAttribute('.lane-btn[data-lane="2"]', 'class');
    console.log(`   Lane 0 class: "${lane0Class}" (Expected .active)`);
    console.log(`   Lane 2 class: "${lane2Class}" (Expected .ship-here)`);
    if (!lane0Class.includes('active')) throw new Error('Lane 0 must have .active class');
    if (!lane2Class.includes('ship-here')) throw new Error('Lane 2 must have .ship-here class');

    // 5. Submit Wrong Answer in Multiple Choice Mode
    console.log('\n[TEST 5] Submitting Incorrect Answer via Multiple Choice Button...');
    const activeProblem = await page.evaluate(() => window.app.gameEngine.getActiveMathProblem());
    console.log(`   Active Equation: "${activeProblem.question}", Correct Answer: ${activeProblem.answer}`);

    // Find a distractor button (value !== answer)
    const wrongBtn = page.locator(`#multiple-choice-container .choice-btn:not([data-choice-val="${activeProblem.answer}"])`).first();
    const wrongVal = await wrongBtn.getAttribute('data-choice-val');
    console.log(`   Clicking wrong choice button with value: "${wrongVal}"...`);
    await wrongBtn.click();
    await page.waitForTimeout(200);

    const wrongFeedback = await page.textContent('#math-feedback');
    shipLane = await page.evaluate(() => window.app.gameEngine.state.playerLane);
    console.log(`   Feedback after wrong choice: "${wrongFeedback}"`);
    console.log(`   Ship playerLane after wrong choice: ${shipLane}`);
    if (!wrongFeedback.includes('JAMMED')) throw new Error(`Expected jam feedback on wrong answer, got "${wrongFeedback}"`);
    if (shipLane !== 2) throw new Error(`Ship moved on wrong answer! Expected lane 2, got ${shipLane}`);

    // 6. Submit Correct Answer in Multiple Choice Mode
    console.log('\n[TEST 6] Submitting Correct Answer via Multiple Choice Button...');
    const correctBtn = page.locator(`#multiple-choice-container .choice-btn[data-choice-val="${activeProblem.answer}"]`);
    console.log(`   Clicking correct choice button with value: "${activeProblem.answer}"...`);
    await correctBtn.click();
    await page.waitForTimeout(250);

    const correctFeedback = await page.textContent('#math-feedback');
    shipLane = await page.evaluate(() => window.app.gameEngine.state.playerLane);
    const newTargetX = await page.evaluate(() => window.app.gameEngine.state.playerTargetX);
    const lane0CenterX = await page.evaluate(() => window.app.gameEngine.state.getLaneCenterX(0));

    console.log(`   Feedback after correct choice: "${correctFeedback}"`);
    console.log(`   Ship playerLane after correct choice: ${shipLane}`);
    console.log(`   Ship targetX after correct choice: ${newTargetX}, Lane 0 Center X: ${lane0CenterX}`);

    if (!correctFeedback.includes('EXCELLENT')) throw new Error(`Expected excellent feedback, got "${correctFeedback}"`);
    if (shipLane !== 0) throw new Error(`Ship failed to move to Lane 0 after correct answer! Got ${shipLane}`);
    if (newTargetX !== lane0CenterX) throw new Error('Ship playerTargetX must be at Lane 0 center!');

    // 7. Verify Upgrade Drawer Multiple Choice Mode
    console.log('\n[TEST 7] Verifying Upgrade Drawer 5 Multiple Choice Options...');
    const isMiniNumpadVisible = await page.locator('#side-mini-numpad').isVisible();
    console.log(`   Side Mini Numpad isVisible: ${isMiniNumpadVisible}`);
    if (isMiniNumpadVisible) throw new Error('Side mini numpad rows must be completely hidden/invisible in Multiple Choice mode!');

    const upgChoiceCount = await page.locator('#side-upg-multiple-choice .upg-choice-btn').count();
    console.log(`   Upgrade Choice Buttons count: ${upgChoiceCount} (Expected 5)`);
    if (upgChoiceCount !== 5) {
      throw new Error(`Expected 5 upgrade choice buttons, got ${upgChoiceCount}`);
    }

    const upgProb = await page.evaluate(() => window.app.gameEngine.getActiveUpgradeProblem());
    console.log(`   Active Upgrade Problem: "${upgProb.question}", Answer: ${upgProb.answer}`);

    // Click the correct upgrade choice button
    const correctUpgBtn = page.locator(`#side-upg-multiple-choice .upg-choice-btn[data-upg-val="${upgProb.answer}"]`);
    console.log(`   Clicking correct upgrade choice button (${upgProb.answer})...`);
    await correctUpgBtn.click();
    await page.waitForTimeout(300);

    const updatedTier = await page.evaluate(() => window.app.gameEngine.state.inStageUpgradeTier);
    console.log(`   Ship Upgrade Tier after solve: Tier ${updatedTier}`);
    if (updatedTier !== 2) throw new Error(`Expected upgrade to Tier 2, got Tier ${updatedTier}`);

    console.log('\n===============================================================');
    console.log('✅ ALL MULTIPLE CHOICE & LANE LOCKING E2E TESTS PASSED WITH 100% SUCCESS!');
    console.log('===============================================================');
  } finally {
    await browser.close();
  }
}

runMultipleChoiceQC().catch((err) => {
  console.error('\n❌ MULTIPLE CHOICE E2E TEST FAILED:', err);
  process.exit(1);
});
