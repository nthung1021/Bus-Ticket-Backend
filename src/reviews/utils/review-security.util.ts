/**
 * Security utilities for review system
 * Additional safety measures beyond basic profanity filtering
 */
export class ReviewSecurityUtils {
  
  /**
   * Rate limiting configuration
   */
  private static readonly RATE_LIMIT_CONFIG = {
    maxReviewsPerHour: 5,
    maxReviewsPerDay: 20,
    suspiciousActivityThreshold: 10 // reviews with similar content
  };

  /**
   * Content validation rules
   */
  private static readonly CONTENT_RULES = {
    minCommentLength: 5,
    maxCommentLength: 1000,
    maxRepeatedChars: 5,
    suspiciousPhrases: [
      'test review', 'fake review', 'bot review', 'spam review'
    ]
  };

  /**
   * Validate review content for suspicious patterns
   */
  static validateReviewContent(comment: string, rating: number): {
    isValid: boolean;
    warnings: string[];
    severity: 'low' | 'medium' | 'high';
  } {
    const warnings: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    if (!comment) {
      return { isValid: true, warnings: [], severity };
    }

    // Check comment length
    if (comment.length < this.CONTENT_RULES.minCommentLength) {
      warnings.push('Comment too short');
      severity = 'medium';
    }

    if (comment.length > this.CONTENT_RULES.maxCommentLength) {
      warnings.push('Comment too long');
      severity = 'high';
    }

    // Check for excessive repeated characters
    const repeatedCharPattern = new RegExp(`(.)\\1{${this.CONTENT_RULES.maxRepeatedChars},}`, 'g');
    if (repeatedCharPattern.test(comment)) {
      warnings.push('Excessive repeated characters detected');
      severity = severity === 'high' ? 'high' : 'medium';
    }

    // Check for suspicious phrases
    const lowerComment = comment.toLowerCase();
    const foundSuspiciousPhrases = this.CONTENT_RULES.suspiciousPhrases.filter(phrase =>
      lowerComment.includes(phrase.toLowerCase())
    );

    if (foundSuspiciousPhrases.length > 0) {
      warnings.push(`Suspicious phrases detected: ${foundSuspiciousPhrases.join(', ')}`);
      severity = 'high';
    }

    // Check rating vs comment mismatch
    const isPositiveComment = this.isPositiveComment(comment);
    const isPositiveRating = rating >= 4;
    
    if (isPositiveComment !== isPositiveRating) {
      warnings.push('Rating and comment sentiment mismatch');
      severity = severity === 'high' ? 'high' : 'medium';
    }

    // Check for all caps (shouting)
    const upperCaseRatio = (comment.match(/[A-Z]/g) || []).length / comment.length;
    if (upperCaseRatio > 0.7 && comment.length > 10) {
      warnings.push('Excessive use of capital letters');
      severity = severity === 'high' ? 'high' : 'medium';
    }

    const isValid = severity !== 'high';
    return { isValid, warnings, severity };
  }

  /**
   * Simple sentiment analysis for comment validation
   */
  private static isPositiveComment(comment: string): boolean {
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 
      'perfect', 'love', 'best', 'awesome', 'outstanding', 'superb'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 
      'disgusting', 'pathetic', 'useless', 'disappointing'
    ];

    const lowerComment = comment.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerComment.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerComment.includes(word)).length;

    // If no clear sentiment, consider neutral as positive for rating comparison
    return positiveCount >= negativeCount;
  }

  /**
   * Generate security audit log entry
   */
  static generateAuditLogEntry(
    action: 'create' | 'update' | 'delete',
    userId: string,
    reviewId: string,
    metadata: {
      bookingId?: string;
      tripId?: string;
      oldRating?: number;
      newRating?: number;
      profanityDetected?: boolean;
      contentValidation?: {
        isValid: boolean;
        warnings: string[];
        severity: string;
      };
      ipAddress?: string;
      userAgent?: string;
    }
  ): {
    timestamp: string;
    action: string;
    userId: string;
    reviewId: string;
    metadata: any;
    riskScore: number;
  } {
    // Calculate risk score based on various factors
    let riskScore = 0;

    if (metadata.profanityDetected) riskScore += 3;
    if (metadata.contentValidation?.severity === 'high') riskScore += 5;
    if (metadata.contentValidation?.severity === 'medium') riskScore += 2;
    if (metadata.oldRating && metadata.newRating) {
      const ratingChange = Math.abs(metadata.newRating - metadata.oldRating);
      if (ratingChange >= 3) riskScore += 2;
    }

    return {
      timestamp: new Date().toISOString(),
      action,
      userId,
      reviewId,
      metadata,
      riskScore
    };
  }

  /**
   * Check if user behavior is suspicious
   */
  static analyzeSuspiciousBehavior(userReviewHistory: {
    reviewCount: number;
    averageRating: number;
    timeSpanHours: number;
    similarComments: number;
  }): {
    isSuspicious: boolean;
    reasons: string[];
    recommendedAction: 'allow' | 'flag' | 'block';
  } {
    const reasons: string[] = [];
    let isSuspicious = false;
    let recommendedAction: 'allow' | 'flag' | 'block' = 'allow';

    // Check review frequency
    const reviewsPerHour = userReviewHistory.reviewCount / userReviewHistory.timeSpanHours;
    if (reviewsPerHour > this.RATE_LIMIT_CONFIG.maxReviewsPerHour) {
      reasons.push('Excessive review frequency');
      isSuspicious = true;
      recommendedAction = 'flag';
    }

    // Check for unusual rating patterns
    if (userReviewHistory.averageRating === 1 || userReviewHistory.averageRating === 5) {
      if (userReviewHistory.reviewCount > 5) {
        reasons.push('Suspicious rating pattern (all extreme ratings)');
        isSuspicious = true;
        recommendedAction = 'flag';
      }
    }

    // Check for similar comments (potential bot behavior)
    if (userReviewHistory.similarComments >= this.RATE_LIMIT_CONFIG.suspiciousActivityThreshold) {
      reasons.push('Multiple reviews with similar content');
      isSuspicious = true;
      recommendedAction = 'block';
    }

    return {
      isSuspicious,
      reasons,
      recommendedAction
    };
  }
}