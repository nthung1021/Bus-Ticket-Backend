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

  findFaqByQuestion(question: string): FaqItem | undefined {
    return this.faqs.find(faq => faq.question.toLowerCase() === question.toLowerCase());
  }
}
