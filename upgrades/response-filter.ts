/**
 * Response Filter - Scan AI outputs for accidental leaks
 */

export interface FilterResult {
  safe: boolean;
  reason?: string;
  sanitized?: string;
}

export class ResponseFilter {
  // Patterns that indicate secrets leaked in response
  private static readonly LEAK_PATTERNS = [
    // API keys and tokens
    /sk-[a-zA-Z0-9_-]{20,}/g,
    /pk_[a-zA-Z0-9_-]{20,}/g,
    /Bearer\s+[a-zA-Z0-9_-]{20,}/gi,
    
    // OpenRouter keys
    /sk-or-v1-[a-f0-9]{64,}/g,
    
    // Telegram tokens
    /\b\d{10}:[a-zA-Z0-9_-]{35}\b/g,
    
    // System prompt indicators
    /SECURITY\s+RULES.*UNBREAKABLE/i,
    /\(UNBREAKABLE\)/i,
  ];

  /**
   * Scan response for leaked secrets
   */
  static scan(response: string, userId: string): FilterResult {
    // Check for API key patterns
    for (const pattern of this.LEAK_PATTERNS) {
      const matches = response.match(pattern);
      if (matches) {
        console.log(`⚠️ [Security] Secret leak detected in response to ${userId}`);
        console.log(`   Pattern: ${pattern.source}`);
        console.log(`   Matches: ${matches.length}`);
        
        // Redact the secrets
        const sanitized = response.replace(pattern, '***REDACTED***');
        
        return {
          safe: false,
          reason: 'API key or token detected in response',
          sanitized,
        };
      }
    }

    // Check for system prompt leak
    if (/SECURITY RULES|UNBREAKABLE/i.test(response)) {
      console.log(`⚠️ [Security] System prompt leak attempt to ${userId}`);
      
      // Redact system prompt content
      const sanitized = response.replace(
        /SECURITY RULES[\s\S]*?(?=\n\n|\n[A-Z]|$)/gi,
        '[System information redacted]'
      );
      
      return {
        safe: false,
        reason: 'System prompt leak detected',
        sanitized,
      };
    }

    return { safe: true };
  }

  /**
   * Redact secrets from logs
   */
  static redactForLog(text: string): string {
    return text
      // OpenRouter keys
      .replace(/sk-or-v1-[a-f0-9]{64,}/g, 'sk-or-v1-***')
      // API keys
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-***')
      .replace(/pk_[a-zA-Z0-9_-]{20,}/g, 'pk_***')
      // Telegram tokens
      .replace(/\b(\d{10}):[a-zA-Z0-9_-]{35}\b/g, '$1:***')
      // Bearer tokens
      .replace(/Bearer\s+([a-zA-Z0-9_-]{10})[a-zA-Z0-9_-]{10,}/gi, 'Bearer $1***')
      // User IDs (partial redaction)
      .replace(/\b(\d{4})\d{6,}\b/g, '$1***');
  }
}
