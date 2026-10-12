import { getLanguage } from '../i18n/translations.ts';
import type { Language } from '../i18n/translations.ts';

export function convertMathToSpokenText(question: string, lang: Language): string {
  let text = question.trim();
  // Strip trailing '='
  text = text.replace(/=\s*$/, '').trim();

  if (lang === 'da') {
    // Danish conversions
    text = text.replace(/^Find\s*x\s*:\s*/i, 'Find x. ');
    text = text.replace(/^Løs\s*for\s*x\s*:\s*/i, 'Find x. ');
    text = text.replace(/√(\d+)/g, 'kvadratroden af $1');
    text = text.replace(/(\d+)\^2/g, '$1 i anden');
    text = text.replace(/(\d+)\^3/g, '$1 i tredje');
    text = text.replace(/1\/2\s*af\s*/g, 'en halv af ');
    text = text.replace(/1\/4\s*af\s*/g, 'en fjerdedel af ');
    text = text.replace(/(\d+)%\s*af\s*/g, '$1 procent af ');
    text = text.replace(/(\d+)x/g, '$1 x');
    text = text.replace(/\+/g, ' plus ');
    text = text.replace(/-(?!\d)/g, ' minus ');
    text = text.replace(/(^|\s)-(\d+)/g, '$1minus $2');
    text = text.replace(/[×*]/g, ' gange ');
    text = text.replace(/[÷/:]/g, ' divideret med ');
    text = text.replace(/\s+/g, ' ').trim();
    return `${text}?`;
  } else {
    // English conversions
    text = text.replace(/^Find\s*x\s*:\s*/i, 'Solve for x. ');
    text = text.replace(/^Solve\s*for\s*x\s*:\s*/i, 'Solve for x. ');
    text = text.replace(/√(\d+)/g, 'square root of $1');
    text = text.replace(/(\d+)\^2/g, '$1 squared');
    text = text.replace(/(\d+)\^3/g, '$1 cubed');
    text = text.replace(/1\/2\s*of\s*/g, 'one half of ');
    text = text.replace(/1\/4\s*of\s*/g, 'one fourth of ');
    text = text.replace(/(\d+)%\s*of\s*/g, '$1 percent of ');
    text = text.replace(/(\d+)x/g, '$1 x');
    text = text.replace(/\+/g, ' plus ');
    text = text.replace(/-(?!\d)/g, ' minus ');
    text = text.replace(/(^|\s)-(\d+)/g, '$1minus $2');
    text = text.replace(/[×*]/g, ' times ');
    text = text.replace(/[÷/:]/g, ' divided by ');
    text = text.replace(/\s+/g, ' ').trim();
    return `What is ${text}?`;
  }
}

export class SpeechEngine {
  private enabled: boolean = true;
  private voices: SpeechSynthesisVoice[] = [];
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('math_invaders_speech_enabled');
      this.enabled = saved === null ? true : saved === 'true';
    } else {
      this.enabled = true;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.updateVoices();
      }
    }
  }

  private updateVoices(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('math_invaders_speech_enabled', String(val));
    }
    if (!val) {
      this.cancel();
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public cancel(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private getBestVoice(lang: Language): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      this.updateVoices();
    }
    if (!this.voices || this.voices.length === 0) return null;

    const targetPrefix = lang === 'da' ? 'da' : 'en';
    // 1. Try exact language match
    const exact = this.voices.find(v => v.lang.toLowerCase().startsWith(targetPrefix));
    if (exact) return exact;

    return null;
  }

  public speak(
    text: string,
    options: {
      lang?: Language;
      priority?: boolean;
      rate?: number;
      pitch?: number;
    } = {}
  ): void {
    if (!this.enabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const lang = options.lang || getLanguage();
    const priority = options.priority ?? false;
    const rate = options.rate ?? (lang === 'da' ? 0.95 : 1.0);
    const pitch = options.pitch ?? 1.0;

    // Avoid duplicate immediate spam within 300ms
    const now = Date.now();
    if (text === this.lastSpokenText && now - this.lastSpokenTime < 300 && !priority) {
      return;
    }
    this.lastSpokenText = text;
    this.lastSpokenTime = now;

    if (priority) {
      this.cancel();
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'da' ? 'da-DK' : 'en-US';
      utterance.rate = rate;
      utterance.pitch = pitch;

      const voice = this.getBestVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Graceful fallback if browser speech synthesis is restricted
    }
  }

  /**
   * Reads out the active math question in clear spoken language
   */
  public speakProblem(question: string): void {
    if (!this.enabled || !question) return;
    const lang = getLanguage();
    const spoken = convertMathToSpokenText(question, lang);
    this.speak(spoken, { lang, priority: true });
  }

  /**
   * Reads out the chosen number or entered answer
   */
  public speakSelection(val: number): void {
    if (!this.enabled) return;
    const lang = getLanguage();
    const text = String(val);
    this.speak(text, { lang, priority: true, rate: 1.1 });
  }

  /**
   * Reads out the result of an answer submission: answer + whether it was correct or wrong!
   */
  public speakFeedback(val: number, isCorrect: boolean): void {
    if (!this.enabled) return;
    const lang = getLanguage();
    let text = '';
    if (lang === 'da') {
      if (isCorrect) {
        text = `${val}. Rigtigt!`;
      } else {
        text = `${val}. Forkert, prøv igen!`;
      }
    } else {
      if (isCorrect) {
        text = `${val}. Correct! Well done!`;
      } else {
        text = `${val}. Incorrect, try again!`;
      }
    }

    this.speak(text, { lang, priority: true, rate: 1.05 });
  }

  /**
   * Test phrase for verifying voice preview in settings
   */
  public speakTest(): void {
    const lang = getLanguage();
    const phrase = lang === 'da'
      ? 'Math Invaders! Hvad er fire plus fem? Svar: ni. Rigtigt!'
      : 'Math Invaders! What is four plus five? Answer: nine. Correct!';
    this.speak(phrase, { lang, priority: true });
  }
}

export const speechEngine = new SpeechEngine();
