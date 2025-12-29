import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface FaqItem {
  question: string;
  answer: string;
}

@Injectable()
export class FaqService {
  private readonly faqFilePath = path.join(__dirname, '../../data/faq.json');
  private faqs: FaqItem[] = [];

  constructor() {
    this.loadFaqs();
  }

  private loadFaqs() {
    try {
      const data = fs.readFileSync(this.faqFilePath, 'utf-8');
      this.faqs = JSON.parse(data);
    } catch (error) {
      this.faqs = [];
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
      fs.writeFileSync(this.faqFilePath, JSON.stringify(this.faqs, null, 4), 'utf-8');
    } catch (error) {
      throw new Error('Failed to save FAQ data: ' + (error?.message || error));
    }
  }

  findFaqByQuestion(question: string): FaqItem | undefined {
    return this.faqs.find(faq => faq.question.toLowerCase() === question.toLowerCase());
  }
}
