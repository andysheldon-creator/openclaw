/**
 * Input Sanitizer - Detect and block prompt injection attacks
 */

export interface SanitizationResult {
  clean: string;
  violations: string[];
  blocked: boolean;
}

export class InputSanitizer {
  // Patterns that indicate prompt injection attacks (not legitimate code discussion)
  private static readonly ATTACK_PATTERNS = [
    // Direct manipulation attempts
    /ignore\s+(all\s+)?previous\s+instructions?/gi,
    /forget\s+(everything|all\s+previous)/gi,
    /you\s+are\s+now\s+(a|an)\s+/gi,
    /act\s+as\s+(if\s+)?you\s+(are|were)/gi,
    /pretend\s+(to\s+be|you\s+are)/gi,
    
    // Fake intent tag injection (users shouldn't create these)
    /\[REMEMBER:\s*[^\]]*\b(admin|root|sudo|override|bypass)\b/gi,
    /\[GOAL:\s*[^\]]*\b(reveal|show|expose|leak|bypass)\b/gi,
    
    // Secret extraction attempts (targeting the bot itself)
    /\b(reveal|show|expose|leak|tell\s+me)\s+(your|the)?\s*(api\s+key|token|secret|password|credential)/gi,
    /what\s+is\s+your\s+(api\s+key|token|secret)/gi,
    
    // System prompt extraction
    /\b(show|reveal|print|display|tell)\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instruction|rule)/gi,
    /what\s+(are\s+)?your\s+(security\s+)?(rule|instruction|constraint)/gi,
    
    // Code execution targeting the bot process (not code examples)
    /process\.env\.(OPENROUTER|TELEGRAM|CLAUDE|API)/gi,
    /\beval\s*\(\s*(process|require|global)/gi,
  ];

  /**
   * Sanitize user input and detect attacks
   */
  static sanitize(input: string): SanitizationResult {
    const violations: string[] = [];
    let clean = input;

    // Check for attack patterns
    for (const pattern of this.ATTACK_PATTERNS) {
      if (pattern.test(input)) {
        violations.push(`Attack pattern detected: ${pattern.source.substring(0, 50)}...`);
      }
    }

    // Remove fake intent tags (only bot should create these)
    const fakeIntentPattern = /\[(REMEMBER|GOAL|DONE):[^\]]+\]/g;
    const matches = input.match(fakeIntentPattern);
    if (matches && matches.length > 0) {
      // Allow educational discussion like "The [REMEMBER:] tag works by..."
      // Block if multiple tags or suspicious keywords
      const suspicious = matches.some(m => 
        /admin|override|bypass|root|sudo/i.test(m)
      );
      if (suspicious || matches.length > 2) {
        violations.push(`Fake intent tags detected: ${matches.join(', ')}`);
        clean = input.replace(fakeIntentPattern, '[REDACTED]');
      }
    }

    // Length limit (prevent context exhaustion)
    if (input.length > 8000) {
      violations.push(`Message too long: ${input.length} chars (max 8000)`);
      clean = input.substring(0, 8000) + '\n\n[Message truncated for safety]';
    }

    // Determine if this should be blocked
    const blocked = this.isHighRisk(violations);

    return { clean, violations, blocked };
  }

  /**
   * Determine if violations warrant blocking
   */
  private static isHighRisk(violations: string[]): boolean {
    // Block if 2+ violations
    if (violations.length >= 2) return true;

    // Block if single critical violation
    return violations.some(v => 
      v.includes('admin') || 
      v.includes('reveal') ||
      v.includes('process.env') ||
      v.includes('system prompt') ||
      v.includes('security rule') ||
      v.includes('forget') ||
      v.includes('ignore') ||
      v.includes('Attack pattern')
    );
  }

  /**
   * Log security event
   */
  static logSecurityEvent(userId: string, violations: string[], blocked: boolean): void {
    if (violations.length > 0) {
      console.log(`🛡️ [Security] User ${userId}: ${violations.length} violation(s)`);
      violations.forEach(v => console.log(`   - ${v}`));
      if (blocked) {
        console.log(`   ⛔ Request BLOCKED`);
      }
    }
  }
}
