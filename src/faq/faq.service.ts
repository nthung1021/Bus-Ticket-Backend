import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface FaqItem {
  question: string;
  answer: string;
}

@Injectable()
export class FaqService {
  // Candidate paths to support both dev (ts-node) and production (dist)
  private readonly faqFilePath = path.join(__dirname, '../../data/faq.json');
  private faqs: FaqItem[] = [];
  // Actual path used for reads/writes (determined at runtime)
  private resolvedFaqPath: string | null = null;

  constructor() {
    this.loadFaqs();
  }

  private loadFaqs() {
    const candidates = [
      // When running ts-node / from src
      path.join(__dirname, '../../data/faq.json'),
      // When running from project root
      path.join(process.cwd(), 'data', 'faq.json'),
      // When running after build (dist)
      path.join(process.cwd(), 'dist', 'data', 'faq.json'),
    ];

    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
      // No file found — initialize empty and leave resolvedFaqPath null
      // This avoids throwing during app bootstrap; callers can still add FAQs later
      this.faqs = [];
      // Optional: log a console warning so the operator notices
      // (Avoid importing Logger to keep this class simple)
      // eslint-disable-next-line no-console
      console.warn(`FAQ file not found in any of: ${candidates.join(', ')}`);
      return;
    }

    try {
      const data = fs.readFileSync(found, 'utf-8');
      this.faqs = JSON.parse(data);
      this.resolvedFaqPath = found;
    } catch (error) {
      this.faqs = [];
      // eslint-disable-next-line no-console
      console.error(`Failed to load FAQ file at ${found}: ${(error as Error).message}`);
    }
  }

  getAllFaqs(): FaqItem[] {
    return this.faqs;
  }


  getFaqByIndex(index: number): FaqItem | undefined {
    if (isNaN(index) || index < 0 || index >= this.faqs.length) {
      throw new Error('FAQ index out of range');
    }
    return this.faqs[index];
  }

  addFaq(faq: FaqItem): FaqItem[] {
    if (!faq || !faq.question || !faq.answer) {
      throw new Error('Invalid FAQ data');
    }
    this.faqs.push(faq);
    this.saveFaqs();
    return this.faqs;
  }

  updateFaq(index: number, faq: FaqItem): FaqItem[] {
    if (isNaN(index) || index < 0 || index >= this.faqs.length) {
      throw new Error('FAQ index out of range');
    }
    if (!faq || !faq.question || !faq.answer) {
      throw new Error('Invalid FAQ data');
    }
    this.faqs[index] = faq;
    this.saveFaqs();
    return this.faqs;
  }

  deleteFaq(index: number): FaqItem[] {
    if (isNaN(index) || index < 0 || index >= this.faqs.length) {
      throw new Error('FAQ index out of range');
    }
    this.faqs.splice(index, 1);
    this.saveFaqs();
    return this.faqs;
  }

  private saveFaqs() {
    try {
      // prefer the resolved path if available, otherwise write to project data directory
      const target = this.resolvedFaqPath || path.join(process.cwd(), 'data', 'faq.json');
      // ensure directory exists
      const dir = path.dirname(target);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(target, JSON.stringify(this.faqs, null, 4), 'utf-8');
      // update resolved path for subsequent operations
      this.resolvedFaqPath = target;
    } catch (error) {
      throw new Error('Failed to save FAQ data: ' + (error as Error).message || String(error));
    }
  }

  findFaqByQuestion(question: string): FaqItem | undefined {
    return this.faqs.find(faq => faq.question.toLowerCase() === question.toLowerCase());
  }
}
