import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException } from '@nestjs/common';
import { FaqService, type FaqItem } from './faq.service';

@Controller('faqs')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  getAllFaqs(): FaqItem[] {
    return this.faqService.getAllFaqs();
  }

  @Get(':index')
  getFaq(@Param('index') index: number): FaqItem {
    const faq = this.faqService.getFaqByIndex(index);
    if (!faq) throw new NotFoundException('FAQ not found');
    return faq;
  }

  @Post()
  addFaq(@Body() faq: FaqItem): FaqItem[] {
    return this.faqService.addFaq(faq);
  }

  @Put(':index')
  updateFaq(@Param('index') index: number, @Body() faq: FaqItem): FaqItem[] {
    return this.faqService.updateFaq(index, faq);
  }

  @Delete(':index')
  deleteFaq(@Param('index') index: number): FaqItem[] {
    return this.faqService.deleteFaq(index);
  }
}
