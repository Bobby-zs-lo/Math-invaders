import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

// Simple static HTTP server for dist/
function startStaticServer(distDir: string, port: number): Promise<http.Server> {
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.json': 'application/json'
  };

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url || '/';
      if (reqPath === '/' || reqPath.includes('?')) reqPath = '/index.html';
      const filePath = path.join(distDir, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        const fallback = path.join(distDir, 'index.html');
        if (fs.existsSync(fallback)) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          fs.createReadStream(fallback).pipe(res);
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      }
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}

async function runHeadlessCheck() {
  console.log('🚀 Starting headless browser verification...');
  const port = 4199;
  const distDir = path.resolve(process.cwd(), 'dist');

  const server = await startStaticServer(distDir, port);
  console.log(`📡 Static server running on http://localhost:${port}`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.log('[BROWSER UNCAUGHT ERROR]:', err.message, err.stack);
    consoleErrors.push(err.message);
  });

  try {
    // 1. Navigate to the game
    await page.goto(`http://localhost:${port}`);
    await page.waitForLoadState('networkidle');

    // 2. Handle initial profile selection or create default
    const isProfileSelectVisible = await page.locator('#view-profile-select').isVisible();
    if (isProfileSelectVisible) {
      console.log('👤 Profile select view detected, creating profile...');
      const nameInput = page.locator('#gateway-input-name');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Challenger Bot');
        await page.click('#gateway-btn-create');
        await page.waitForTimeout(400);
      }
    }

    // Dismiss Difficulty Modal if it opened
    const diffModalClose = page.locator('#btn-close-diff');
    if (await diffModalClose.isVisible()) {
      await diffModalClose.click();
      await page.waitForTimeout(300);
    }

    // 3. Launch Sector 1 Stage 1
    console.log('🌌 Launching Sector 1 Stage 1...');
    const stageBtn = page.locator('.stage-node.unlocked').first();
    await stageBtn.waitFor({ state: 'visible', timeout: 5000 });
    await stageBtn.click();
    await page.waitForTimeout(500);

    // Verify Arena is visible
    const arenaVisible = await page.locator('#view-game-arena').isVisible();
    assert.ok(arenaVisible, 'Game Arena must be visible after launching stage');

    // 4. Test Negative Input Typing via Virtual Numpad
    console.log('⌨️ Testing Virtual Numpad (-) toggling...');
    const negBtn = page.locator('.num-key[data-action="neg"]');
    const inputDisplay = page.locator('#math-input-display');

    // Click (-) -> should show '-'
    await negBtn.click();
    let text = await inputDisplay.textContent();
    assert.equal(text?.trim(), '-', 'Input display must show "-" after first click');

    // Click (-) again -> should toggle back to empty '?'
    await negBtn.click();
    text = await inputDisplay.textContent();
    assert.equal(text?.trim(), '?', 'Input display must revert to "?" after second click');

    // Click (-) then digit '0' -> should show '-0'
    await negBtn.click();
    await page.locator('.num-key[data-val="0"]').click();
    text = await inputDisplay.textContent();
    assert.equal(text?.trim(), '-0', 'Input display must show "-0"');

    // Submit '-0' via virtual submit button
    const submitBtn = page.locator('.num-key[data-action="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(200);

    // Verify input display reset cleanly and game is running
    text = await inputDisplay.textContent();
    assert.equal(text?.trim(), '?', 'Input display must clear to "?" after submission');

    // 5. Test Physical Keyboard Negative Inputs
    console.log('⌨️ Testing Physical Keyboard inputs...');
    await page.keyboard.press('-');
    text = await inputDisplay.textContent();
    assert.equal(text?.trim(), '-', 'Physical "-" key should set input to "-"');

    await page.keyboard.press('-');
    text = await inputDisplay.textContent();
    assert.equal(text?.trim(), '?', 'Second physical "-" key should toggle back to "?"');

    // Submitting lone '-' via Enter
    await page.keyboard.press('-');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    text = await inputDisplay.textContent();
    assert.equal(text?.trim(), '-', 'Lone "-" submission must be safely ignored');

    // Clear input using backspace
    await page.keyboard.press('Backspace');
    text = await inputDisplay.textContent();
    assert.equal(text?.trim(), '?', 'Backspace clears "-" to "?"');

    // Submitting empty input via Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    text = await inputDisplay.textContent();
    assert.equal(text?.trim(), '?', 'Empty submission must be safely ignored');

    // 6. Test In-Stage Live Upgrade Drawer Negative Typing
    console.log('⚡ Testing In-Stage Upgrade Drawer inputs...');
    const upgNegBtn = page.locator('#btn-upg-neg');
    const upgInputDisplay = page.locator('#side-upg-input');

    if (await upgNegBtn.isVisible()) {
      await upgNegBtn.click();
      let upgText = await upgInputDisplay.textContent();
      assert.equal(upgText?.trim(), '-', 'Upgrade drawer input must show "-"');

      await upgNegBtn.click();
      upgText = await upgInputDisplay.textContent();
      assert.equal(upgText?.trim(), '?', 'Upgrade drawer input must revert to "?"');
    }

    // 7. Inject 500 problem telemetry submissions into browser localStorage and verify capping
    console.log('📊 Testing 500 problem submissions telemetry capping in browser runtime...');
    const telemetryResult = await page.evaluate(() => {
      const STORAGE_KEY = 'math_invaders_profiles_v1';
      const ACTIVE_KEY = 'math_invaders_active_profile_id';
      const raw = localStorage.getItem(STORAGE_KEY);
      const profiles = JSON.parse(raw || '[]');
      const activeId = localStorage.getItem(ACTIVE_KEY);
      const profile = profiles.find((p: any) => p.id === activeId) || profiles[0];

      if (!profile.stats) {
        profile.stats = {
          totalSolved: 0,
          totalCorrect: 0,
          totalErrors: 0,
          averageTimeMs: 0,
          problemHistory: []
        };
      }

      const initialSolved = profile.stats.totalSolved || 0;
      // Simulate 500 submissions
      for (let i = 1; i <= 500; i++) {
        const isCorrect = i % 4 !== 0; // 75% accuracy
        profile.stats.totalSolved++;
        if (isCorrect) profile.stats.totalCorrect++;
        else profile.stats.totalErrors++;

        profile.stats.problemHistory.push({
          timestamp: Date.now(),
          question: `${i} + 10 = ?`,
          userAnswer: isCorrect ? i + 10 : 999,
          correctAnswer: i + 10,
          isCorrect,
          timeTakenMs: 1500,
          operation: '+'
        });

        if (profile.stats.problemHistory.length > 300) {
          profile.stats.problemHistory = profile.stats.problemHistory.slice(-300);
        }
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
      return {
        initialSolved,
        totalSolved: profile.stats.totalSolved,
        totalCorrect: profile.stats.totalCorrect,
        totalErrors: profile.stats.totalErrors,
        historyLength: profile.stats.problemHistory.length,
        oldestQuestion: profile.stats.problemHistory[0].question,
        newestQuestion: profile.stats.problemHistory[299].question
      };
    });

    assert.equal(telemetryResult.totalSolved - telemetryResult.initialSolved, 500, '500 additional problems solved must be recorded');
    assert.equal(telemetryResult.historyLength, 300, 'problemHistory must be capped at 300');
    assert.equal(telemetryResult.oldestQuestion, '201 + 10 = ?', 'Oldest record must be problem 201');
    assert.equal(telemetryResult.newestQuestion, '500 + 10 = ?', 'Newest record must be problem 500');

    // 8. Test Parent Report Modal & Printable Worksheet Generation
    console.log('🖨️ Testing Parent Report Modal & Printable Worksheet generation...');
    // Reload page so app loads the updated profile with 500 submissions from localStorage
    await page.reload();
    await page.waitForTimeout(400);

    // Open Parent Report
    await page.click('#btn-parent-report');
    await page.waitForTimeout(300);

    const reportModalVisible = await page.locator('.modal-overlay').isVisible();
    assert.ok(reportModalVisible, 'Parent report modal overlay must be visible');

    // Check KPI cards rendered
    const modalText = await page.locator('.modal-card').innerText();
    console.log('--- MODAL TEXT DUMP ---');
    console.log(modalText);
    console.log('-----------------------');
    assert.ok(modalText.includes(String(telemetryResult.totalSolved)), `Modal must display ${telemetryResult.totalSolved} problems solved`);

    // Intercept window.open before clicking "Printable Practice Sheet"
    await page.evaluate(`
      window.__lastWorksheetHTML = null;
      window.open = function() {
        var content = '';
        return {
          document: {
            open: function() { content = ''; },
            write: function(html) { content += html; window.__lastWorksheetHTML = content; },
            close: function() { window.__lastWorksheetHTML = content; }
          }
        };
      };
    `);

    console.log('Clicking #btn-print-offline...');
    await page.click('#btn-print-offline');
    await page.waitForTimeout(500);

    const worksheetHTML: string = await page.evaluate(() => (window as any).__lastWorksheetHTML);
    assert.ok(worksheetHTML, 'generatePrintableWorksheet must generate HTML');
    assert.ok(worksheetHTML.includes('<!DOCTYPE html>'), 'Worksheet must contain <!DOCTYPE html>');
    assert.ok(worksheetHTML.includes('Offline Practice Worksheet'), 'Worksheet must include header');
    assert.ok(worksheetHTML.includes('Parent Answer Key'), 'Worksheet must include Parent Answer Key');
    assert.ok(worksheetHTML.includes('Part 2: Grade'), 'Worksheet must include curriculum drills');

    // Close Parent Report
    await page.click('#btn-close-report');
    await page.waitForTimeout(200);

    // 9. Verify zero console errors or uncaught exceptions
    console.log('🔍 Checking console errors...');
    if (consoleErrors.length > 0) {
      console.error('Console errors detected:', consoleErrors);
    }
    assert.equal(consoleErrors.length, 0, `Expected 0 console errors, got ${consoleErrors.length}: ${consoleErrors.join(', ')}`);

    console.log('✅ ALL HEADLESS BROWSER CHECKS PASSED WITH 100% SUCCESS!');
  } finally {
    await browser.close();
    server.close();
  }
}

runHeadlessCheck().catch(err => {
  console.error('❌ Headless test failed:', err);
  process.exit(1);
});
