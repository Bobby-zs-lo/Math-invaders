import { chromium } from 'playwright';

async function testModalCloseBug() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('http://localhost:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // 1. Create first profile "Pilot1"
  await page.fill('#gateway-input-name', 'Pilot1');
  await page.click('#gateway-btn-create');
  await page.waitForTimeout(300);

  // Close difficulty modal
  if (await page.isVisible('#btn-close-diff')) {
    await page.click('#btn-close-diff');
    await page.waitForTimeout(200);
  }

  // 2. Open switch profile modal
  console.log('Opening switch profile modal...');
  await page.click('#btn-switch-profile');
  await page.waitForTimeout(300);

  const isModalOpen1 = await page.isVisible('.modal-overlay');
  console.log('Profile modal is open:', isModalOpen1);

  // 3. Click LAUNCH 🚀 on Pilot1 in the modal
  console.log('Clicking LAUNCH on Pilot1...');
  await page.click('.modal-body .btn-launch-prof');
  await page.waitForTimeout(400);

  // Check if .modal-overlay is still visible in #modals-root!
  const isModalStillOpen = await page.isVisible('.modal-overlay');
  console.log('Is modal overlay STILL VISIBLE after clicking LAUNCH?', isModalStillOpen);

  const modalsRootContent = await page.evaluate(() => document.getElementById('modals-root')?.innerHTML);
  console.log('modalsRoot HTML length:', modalsRootContent?.length);

  await browser.close();
  if (isModalStillOpen) {
    console.log('BUG CONFIRMED: Modal overlay remains trapped on screen because closeModal() was not invoked on profile launch!');
    process.exit(101);
  } else {
    console.log('No bug: Modal closed properly.');
  }
}

testModalCloseBug().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
