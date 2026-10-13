import type { PlayerProfile } from '../models/Profile.ts';
import { getDefaultMathSettingsForGrade, getActiveProfile } from '../models/Profile.ts';
import { MathEngine } from '../math/MathEngine.ts';
import { t, getLanguage } from '../i18n/translations.ts';

export class ParentReportModal {
  private container: HTMLElement;
  private profile: PlayerProfile;
  private mathEngine: MathEngine;

  constructor(container: HTMLElement, profile: PlayerProfile) {
    this.container = container;
    this.profile = profile;
    const settings = profile.mathSettings || getDefaultMathSettingsForGrade(profile.gradeLevel || 2);
    this.mathEngine = new MathEngine(settings);
  }

  public updateProfile(newProfile: PlayerProfile): void {
    this.profile = newProfile;
    const settings = newProfile.mathSettings || getDefaultMathSettingsForGrade(newProfile.gradeLevel || 2);
    this.mathEngine = new MathEngine(settings);
  }

  public show(): void {
    const active = getActiveProfile();
    if (active && active.id === this.profile.id) {
      this.profile = active;
    }
    const isDa = getLanguage() === 'da';
    const stats = this.profile.stats || {
      totalSolved: 0,
      totalCorrect: 0,
      totalErrors: 0,
      averageTimeMs: 0,
      problemHistory: []
    };
    const history = stats.problemHistory || [];

    // Accurate lifetime totals
    const total = stats.totalSolved || history.length;
    const correctCount = stats.totalCorrect || history.filter(h => h.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // Response speed in seconds
    const avgSec = total > 0
      ? ((stats.averageTimeMs || 0) / 1000).toFixed(1)
      : '0.0';

    // Missed trouble spots (up to 10 recent mistakes)
    const missed = history.filter(h => !h.isCorrect).slice(-10);

    // Operations breakdown dictionary
    const opStats: Record<string, { total: number; correct: number }> = {};
    for (const h of history) {
      const op = h.operation || 'other';
      if (!opStats[op]) opStats[op] = { total: 0, correct: 0 };
      opStats[op].total++;
      if (h.isCorrect) opStats[op].correct++;
    }

    const opNames: Record<string, string> = isDa ? {
      '+': 'Addition (+)',
      '-': 'Subtraktion (-)',
      '*': 'Multiplikation (×)',
      '/': 'Division (:)',
      'x': 'Ligninger (Find x)',
      'multi_step': 'Regnehierarki & flere led',
      'fractions': 'Brøker & procenter',
      'exponents': 'Potenser & kvadratrødder',
      'algebra': 'Lineære ligninger',
      'quadratics': 'Andengradsligninger',
      'upgrade': 'Skibs-opgradering'
    } : {
      '+': 'Addition (+)',
      '-': 'Subtraction (-)',
      '*': 'Multiplication (×)',
      '/': 'Division (÷)',
      'x': 'Pre-Algebra (Find x)',
      'multi_step': 'Order of Operations',
      'fractions': 'Fractions & Decimals',
      'exponents': 'Exponents & Roots',
      'algebra': 'Linear Equations',
      'quadratics': 'Quadratics & Advanced',
      'upgrade': 'Ship Overcharge Bonus'
    };

    this.container.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card" style="max-width: 650px;">
          <div class="modal-header">
            <span class="modal-title">${t('parentReportTitle', { name: this.profile.name })}</span>
            <button class="modal-close-btn" id="btn-close-report">✕</button>
          </div>
          <div class="modal-body">
            <!-- Summary KPI Cards -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
              <div style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 10px; text-align: center; border: 1px solid rgba(0, 243, 255, 0.3);">
                <div style="font-size: 0.75rem; color: #8ea1c0;">${t('kpiSolved')}</div>
                <div style="font-family: var(--font-numbers); font-size: 1.4rem; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums;">${total}</div>
              </div>
              <div style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 10px; text-align: center; border: 1px solid rgba(0, 255, 102, 0.3);">
                <div style="font-size: 0.75rem; color: #8ea1c0;">${t('kpiAccuracy')}</div>
                <div style="font-family: var(--font-numbers); font-size: 1.4rem; font-weight: 800; color: #00ff66; font-variant-numeric: tabular-nums;">
                  ${total > 0 ? `${accuracy}%` : '--'}
                </div>
              </div>
              <div style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 10px; text-align: center; border: 1px solid rgba(255, 230, 0, 0.3);">
                <div style="font-size: 0.75rem; color: #8ea1c0;">${t('kpiAvgSpeed')}</div>
                <div style="font-family: var(--font-numbers); font-size: 1.4rem; font-weight: 800; color: #ffe600; font-variant-numeric: tabular-nums;">
                  ${total > 0 ? `${avgSec}s` : '--'}
                </div>
              </div>
            </div>

            <!-- Operations Breakdown -->
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border-radius: 10px;">
              <h4 style="font-family: 'Orbitron', sans-serif; font-size: 0.8rem; color: #00f3ff; margin-bottom: 8px;">
                ${t('masteryTitle')}
              </h4>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${Object.keys(opStats).length === 0 ? `<div style="font-size: 0.8rem; color: #8ea1c0;">${t('noProblemsSolvedYet')}</div>` : ''}
                ${Object.entries(opStats).map(([op, s]) => {
                  const pct = Math.round((s.correct / s.total) * 100);
                  return `
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 2px;">
                        <span>${opNames[op] || op}</span>
                        <span style="font-weight: 700; color: ${pct >= 80 ? '#00ff66' : '#ffe600'}">${pct}% (${s.correct}/${s.total})</span>
                      </div>
                      <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${pct}%; background: ${pct >= 80 ? '#00ff66' : '#ffe600'};"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Missed Problems / Trouble Spots -->
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border-radius: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="font-family: 'Orbitron', sans-serif; font-size: 0.8rem; color: #ff3344; margin: 0;">
                  ${t('troubleSpotsTitle', { count: missed.length })}
                </h4>
                <button id="btn-print-offline" style="
                  background: linear-gradient(135deg, #00f3ff 0%, #0088ff 100%);
                  color: #030816; border: none; padding: 5px 12px; border-radius: 6px;
                  font-family: 'Orbitron', sans-serif; font-size: 0.72rem; font-weight: 700;
                  cursor: pointer; display: flex; align-items: center; gap: 4px;
                ">
                  ${t('printWorksheetBtn')}
                </button>
              </div>

              ${missed.length === 0 ? `<div style="font-size: 0.8rem; color: #00ff66;">${t('noTroubleSpots')}</div>` : `
                <div style="display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto;">
                  ${missed.map(m => `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; background: rgba(255,51,68,0.1); padding: 6px 10px; border-radius: 6px; border-left: 3px solid #ff3344;">
                      <span style="font-family: var(--font-numbers); font-size: 0.95rem; font-weight: 700;">${m.question}</span>
                      <span>${t('answerWas', { user: `<b style="color: #ff3344;">${m.userAnswer}</b>`, correct: `<b style="color: #00ff66;">${m.correctAnswer}</b>` })}</span>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(missed);
  }

  private bindEvents(missedProblems: any[]): void {
    this.container.querySelector('#btn-close-report')?.addEventListener('click', () => {
      this.close();
    });

    this.container.querySelector('#btn-print-offline')?.addEventListener('click', () => {
      this.generatePrintableWorksheet(missedProblems);
    });
  }

  public generatePrintableWorksheet(missedProblems: any[]): void {
    const isDa = getLanguage() === 'da';
    const bonusProblems: { question: string; answer: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const prob = this.mathEngine.generateProblemForLane(i % 5);
      bonusProblems.push({ question: prob.question, answer: prob.answer });
    }

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) {
      alert(t('allowPopupsAlert'));
      return;
    }

    const dateStr = new Date().toLocaleDateString();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="${isDa ? 'da' : 'en'}">
      <head>
        <title>${t('printWorksheetTitle', { name: this.profile.name })}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111;
            padding: 30px;
            max-width: 720px;
            margin: 0 auto;
          }
          h1 { margin-bottom: 4px; font-size: 22px; color: #003366; }
          .meta { color: #555; font-size: 14px; margin-bottom: 24px; border-bottom: 2px solid #ccc; padding-bottom: 8px; }
          .section-title { font-size: 15px; font-weight: bold; margin: 20px 0 10px 0; color: #222; text-transform: uppercase; }
          .problem-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          .problem-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 18px;
            font-weight: bold;
          }
          .answer-box {
            width: 70px;
            height: 32px;
            border: 2px dashed #999;
            border-radius: 4px;
          }
          .answer-key {
            margin-top: 40px;
            border-top: 2px dashed #aaa;
            padding-top: 14px;
            font-size: 12px;
            color: #666;
          }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <h1>🚀 Math Invaders — ${isDa ? 'Matematik Træningsark' : 'Practice Sheet'}</h1>
          <button onclick="window.print()" style="padding: 6px 16px; font-size: 14px; cursor: pointer;">
            🖨️ ${isDa ? 'Udskriv ark' : 'Print Sheet'}
          </button>
        </div>
        <div class="meta">
          <b>${isDa ? 'Pilot' : 'Pilot'}:</b> ${this.profile.name} &nbsp;|&nbsp;
          <b>${isDa ? 'Klassetrin' : 'Grade'}:</b> ${isDa ? `${this.profile.gradeLevel}. klasse` : `Grade ${this.profile.gradeLevel}`} &nbsp;|&nbsp;
          <b>${isDa ? 'Dato' : 'Date'}:</b> ${dateStr}
        </div>

        ${missedProblems.length > 0 ? `
          <div class="section-title">🎯 ${isDa ? 'Fokusområder (Opgaver til gen-træning)' : 'Trouble Spots (Problems to Re-practice)'}</div>
          <div class="problem-grid">
            ${missedProblems.map((m, idx) => `
              <div class="problem-card">
                <span>${idx + 1}. &nbsp; ${m.question.replace('=', '').trim()} = </span>
                <div class="answer-box"></div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="section-title">⭐ ${isDa ? 'Ekstra opgaver til klassetrinnet' : 'Grade Level Practice Equations'}</div>
        <div class="problem-grid">
          ${bonusProblems.map((b, idx) => `
            <div class="problem-card">
              <span>${idx + 1 + missedProblems.length}. &nbsp; ${b.question.replace('=', '').trim()} = </span>
              <div class="answer-box"></div>
            </div>
          `).join('')}
        </div>

        <div class="answer-key">
          <b>${isDa ? 'Facitliste til forældre' : 'Answer Key for Parents'}:</b>
          ${missedProblems.map((m, idx) => `[${idx + 1}: ${m.correctAnswer}]`).join(' ')}
          ${bonusProblems.map((b, idx) => `[${idx + 1 + missedProblems.length}: ${b.answer}]`).join(' ')}
        </div>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  }

  public close(): void {
    this.container.innerHTML = '';
  }
}
