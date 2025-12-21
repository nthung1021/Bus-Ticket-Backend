/**
 * Basic profanity filter utility for content moderation
 * This is a simple implementation - in production, consider using a more robust service
 */
export class ProfanityFilter {
  private static readonly PROFANE_WORDS = [
    // Basic list - can be expanded or loaded from external source
    'damn', 'hell', 'shit', 'fuck', 'bitch', 'asshole', 'bastard', 'crap',
    // Add more words as needed - this is a minimal implementation
    // Consider using a more comprehensive library like 'bad-words' npm package
  ];

  private static readonly REPLACEMENT_CHAR = '*';

  /**
   * Check if text contains profanity
   */
  static containsProfanity(text?: string | null): boolean {
  if (typeof text !== 'string' || text.trim() === '') {
    return false;
  }

  const lowerText = text.toLowerCase();
  return this.PROFANE_WORDS.some(word =>
    lowerText.includes(word.toLowerCase())
  );
}


  /**
   * Filter profanity from text by replacing with asterisks
   */
  static filterProfanity(text: string): string {
    if (!text) return text;

    let filteredText = text;
    
    this.PROFANE_WORDS.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const replacement = this.REPLACEMENT_CHAR.repeat(word.length);
      filteredText = filteredText.replace(regex, replacement);
    });

    return filteredText;
  }

  /**
   * Get profanity analysis
   */
  static analyzeProfanity(text: string): {
    hasProfanity: boolean;
    filteredText: string;
    originalText: string;
  } {
    const hasProfanity = this.containsProfanity(text);
    const filteredText = this.filterProfanity(text);

    return {
      hasProfanity,
      filteredText,
      originalText: text,
    };
  }

  /**
   * Validate text for profanity and throw error if found (strict mode)
   */
  static validateText(text: string, fieldName: string = 'text'): void {
    if (this.containsProfanity(text)) {
      throw new Error(`${fieldName} contains inappropriate content`);
    }
  }
}