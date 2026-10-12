import assert from 'node:assert';
import { convertMathToSpokenText, SpeechEngine, speechEngine } from '../src/engine/SpeechEngine.ts';
import { getDefaultMathSettingsForGrade, loadProfiles } from '../src/models/Profile.ts';

console.log('--- RUNNING SPEECH ENGINE & MATH SPOKEN TEXT UNIT TESTS ---');

// 1. Danish Math Question Translation
console.log('Testing Danish spoken math conversion:');
const daAdd = convertMathToSpokenText('4 + 5 =', 'da');
assert.strictEqual(daAdd, '4 plus 5?', `Expected "4 plus 5?", got "${daAdd}"`);

const daSub = convertMathToSpokenText('12 - 7 =', 'da');
assert.strictEqual(daSub, '12 minus 7?', `Expected "12 minus 7?", got "${daSub}"`);

const daMul = convertMathToSpokenText('6 × 8 =', 'da');
assert.strictEqual(daMul, '6 gange 8?', `Expected "6 gange 8?", got "${daMul}"`);

const daDiv = convertMathToSpokenText('24 ÷ 4 =', 'da');
assert.strictEqual(daDiv, '24 divideret med 4?', `Expected "24 divideret med 4?", got "${daDiv}"`);

const daFraction = convertMathToSpokenText('1/2 af 16 =', 'da');
assert.strictEqual(daFraction, 'en halv af 16?', `Expected "en halv af 16?", got "${daFraction}"`);

const daPercent = convertMathToSpokenText('25% af 80 =', 'da');
assert.strictEqual(daPercent, '25 procent af 80?', `Expected "25 procent af 80?", got "${daPercent}"`);

const daAlgebra = convertMathToSpokenText('Find x: 3x + 5 = 20', 'da');
assert(daAlgebra.includes('Find x.') && daAlgebra.includes('3 x plus 5'), `Expected algebra transcription, got "${daAlgebra}"`);

console.log('  ✓ Danish conversions passed.');

// 2. English Math Question Translation
console.log('Testing English spoken math conversion:');
const enAdd = convertMathToSpokenText('4 + 5 =', 'en');
assert.strictEqual(enAdd, 'What is 4 plus 5?', `Expected "What is 4 plus 5?", got "${enAdd}"`);

const enMul = convertMathToSpokenText('7 * 8 =', 'en');
assert.strictEqual(enMul, 'What is 7 times 8?', `Expected "What is 7 times 8?", got "${enMul}"`);

const enDiv = convertMathToSpokenText('30 / 5 =', 'en');
assert.strictEqual(enDiv, 'What is 30 divided by 5?', `Expected "What is 30 divided by 5?", got "${enDiv}"`);

console.log('  ✓ English conversions passed.');

// 3. SpeechEngine Instance & Headless Resilience
console.log('Testing SpeechEngine headless behavior:');
const engine = new SpeechEngine();
assert.strictEqual(engine.isEnabled(), true, 'SpeechEngine should be enabled by default');

engine.setEnabled(false);
assert.strictEqual(engine.isEnabled(), false, 'setEnabled(false) should update status');

const toggled = engine.toggle();
assert.strictEqual(toggled, true, 'toggle() should switch to true');
assert.strictEqual(engine.isEnabled(), true, 'isEnabled() should be true after toggle');

// Safely execute methods without window.speechSynthesis in Node environment
assert.doesNotThrow(() => {
  engine.speakProblem('4 + 5 =');
  engine.speakSelection(9);
  engine.speakFeedback(9, true);
  engine.speakFeedback(7, false);
  engine.speakTest();
  engine.cancel();
}, 'SpeechEngine calls must safely handle non-browser / headless environments');

console.log('  ✓ SpeechEngine headless resilience passed.');

// 4. Profile Model Speech Settings Default
console.log('Testing Profile model speechEnabled default:');
for (let g = 1; g <= 10; g++) {
  const settings = getDefaultMathSettingsForGrade(g);
  assert.strictEqual(settings.speechEnabled, true, `Grade ${g} must have speechEnabled === true by default`);
}
console.log('  ✓ Profile settings default passed across all 10 grades.');

console.log('All Speech Engine unit tests passed successfully! 🎉');
