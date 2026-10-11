import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Kid-Friendly Typography & Numerical Legibility Verification', () => {
  const rootDir = path.resolve(__dirname, '..');
  const indexHtmlPath = path.join(rootDir, 'index.html');
  const mainCssPath = path.join(rootDir, 'src', 'styles', 'main.css');
  const rendererPath = path.join(rootDir, 'src', 'engine', 'Renderer.ts');
  const parentReportPath = path.join(rootDir, 'src', 'ui', 'ParentReportModal.ts');
  const upgradeModalPath = path.join(rootDir, 'src', 'ui', 'UpgradeStationModal.ts');

  it('1. index.html imports Lexend font family from Google Fonts', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');
    assert.ok(html.includes('family=Lexend'), 'index.html must include Google Fonts link for Lexend');
    assert.ok(html.includes('family=Fredoka'), 'index.html must also preserve Fredoka');
  });

  it('2. main.css defines --font-numbers with Lexend as priority font', () => {
    const css = fs.readFileSync(mainCssPath, 'utf8');
    assert.match(css, /--font-numbers:\s*['"]Lexend['"]/, 'CSS root must define --font-numbers with Lexend');
  });

  it('3. Combat equations and input displays use --font-numbers and tabular-nums', () => {
    const css = fs.readFileSync(mainCssPath, 'utf8');
    assert.match(css, /\.equation-text\s*\{[^}]*var\(--font-numbers\)/, '.equation-text must use var(--font-numbers)');
    assert.match(css, /\.input-display\s*\{[^}]*var\(--font-numbers\)/, '.input-display must use var(--font-numbers)');
    assert.match(css, /\.equation-text\s*\{[^}]*tabular-nums/, '.equation-text must have tabular-nums');
    assert.match(css, /\.input-display\s*\{[^}]*tabular-nums/, '.input-display must have tabular-nums');
  });

  it('4. Multiple-choice buttons and numpad keys use --font-numbers', () => {
    const css = fs.readFileSync(mainCssPath, 'utf8');
    assert.match(css, /\.choice-btn\s*\{[^}]*var\(--font-numbers\)/, '.choice-btn must use var(--font-numbers)');
    assert.match(css, /\.choice-btn \.choice-num\s*\{[^}]*var\(--font-numbers\)/, '.choice-btn .choice-num must use var(--font-numbers)');
    assert.match(css, /\.num-key\s*\{[^}]*var\(--font-numbers\)/, '.num-key must use var(--font-numbers)');
    assert.match(css, /\.mini-key\s*\{[^}]*var\(--font-numbers\)/, '.mini-key must use var(--font-numbers)');
    assert.match(css, /\.upg-choice-btn\s*\{[^}]*var\(--font-numbers\)/, '.upg-choice-btn must use var(--font-numbers)');
  });

  it('5. Upgrade drawer equations and star map stage numbers use --font-numbers', () => {
    const css = fs.readFileSync(mainCssPath, 'utf8');
    assert.match(css, /\.upg-math-row\s*\{[^}]*var\(--font-numbers\)/, '.upg-math-row must use var(--font-numbers)');
    assert.match(css, /\.stage-node \.node-num\s*\{[^}]*var\(--font-numbers\)/, '.stage-node .node-num must use var(--font-numbers)');
  });

  it('6. Renderer.ts renders floating damage text with Lexend', () => {
    const code = fs.readFileSync(rendererPath, 'utf8');
    assert.ok(code.includes('Lexend'), 'Renderer.ts must use Lexend for floating damage numbers on canvas');
  });

  it('7. Modals use legible font-numbers for equations and KPIs', () => {
    const parentCode = fs.readFileSync(parentReportPath, 'utf8');
    assert.ok(parentCode.includes('var(--font-numbers)'), 'ParentReportModal must use var(--font-numbers) for KPI cards / equations');

    const upgradeCode = fs.readFileSync(upgradeModalPath, 'utf8');
    assert.ok(upgradeCode.includes('var(--font-numbers)'), 'UpgradeStationModal must use var(--font-numbers) for challenge equation');
  });
});
