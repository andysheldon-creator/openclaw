/**
 * Smart Message Chunking (from Goda's Claude Telegram Relay)
 * Splits long messages at natural boundaries for Telegram
 */

export interface ChunkOptions {
  maxLength?: number;
  platform?: 'telegram' | 'discord' | 'slack' | 'whatsapp';
}

const PLATFORM_LIMITS = {
  telegram: 4096,
  discord: 2000,
  slack: 4000,
  whatsapp: 4096,
};

/**
 * Split message at natural boundaries (paragraph > line > word > hard)
 */
export function chunkMessage(text: string, options: ChunkOptions = {}): string[] {
  const platform = options.platform || 'telegram';
  const maxLength = options.maxLength || PLATFORM_LIMITS[platform] || 4000;
  
  // Safety margin (avoid hitting exact limit)
  const safeLimit = maxLength - 100;
  
  if (text.length <= safeLimit) {
    return [text];
  }
  
  const chunks: string[] = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= safeLimit) {
      chunks.push(remaining);
      break;
    }
    
    // Try to split at natural boundaries
    let splitIndex = findSplitIndex(remaining, safeLimit);
    
    chunks.push(remaining.substring(0, splitIndex).trim());
    remaining = remaining.substring(splitIndex).trim();
  }
  
  return chunks;
}

/**
 * Find best split index (paragraph > line > word > hard cut)
 */
function findSplitIndex(text: string, maxLength: number): number {
  // 1. Try paragraph boundary (\n\n)
  let splitIndex = text.lastIndexOf('\n\n', maxLength);
  if (splitIndex > maxLength * 0.5) { // At least 50% through
    return splitIndex + 2; // Include the \n\n
  }
  
  // 2. Try line boundary (\n)
  splitIndex = text.lastIndexOf('\n', maxLength);
  if (splitIndex > maxLength * 0.5) {
    return splitIndex + 1; // Include the \n
  }
  
  // 3. Try sentence boundary (. ! ?)
  const sentenceEndings = ['. ', '! ', '? '];
  let bestSentenceIndex = -1;
  
  for (const ending of sentenceEndings) {
    const idx = text.lastIndexOf(ending, maxLength);
    if (idx > bestSentenceIndex) {
      bestSentenceIndex = idx;
    }
  }
  
  if (bestSentenceIndex > maxLength * 0.5) {
    return bestSentenceIndex + 2; // Include '. '
  }
  
  // 4. Try word boundary (space)
  splitIndex = text.lastIndexOf(' ', maxLength);
  if (splitIndex > maxLength * 0.3) { // At least 30% through
    return splitIndex + 1; // Include the space
  }
  
  // 5. Hard cut (avoid splitting UTF-8 characters)
  return maxLength;
}

/**
 * Format chunks with continuation indicators
 */
export function formatChunks(chunks: string[], options: { numbered?: boolean; continuationMarker?: string } = {}): string[] {
  if (chunks.length === 1) {
    return chunks;
  }
  
  const { numbered = true, continuationMarker = '...' } = options;
  
  return chunks.map((chunk, index) => {
    let formatted = chunk;
    
    // Add continuation marker
    if (index < chunks.length - 1 && !chunk.endsWith(continuationMarker)) {
      formatted += ` ${continuationMarker}`;
    }
    
    // Add numbering
    if (numbered && chunks.length > 2) {
      formatted = `[${index + 1}/${chunks.length}] ${formatted}`;
    }
    
    return formatted;
  });
}

/**
 * Split markdown safely (preserve code blocks, formatting)
 */
export function chunkMarkdown(text: string, options: ChunkOptions = {}): string[] {
  const platform = options.platform || 'telegram';
  const maxLength = options.maxLength || PLATFORM_LIMITS[platform] || 4000;
  const safeLimit = maxLength - 100;
  
  if (text.length <= safeLimit) {
    return [text];
  }
  
  // Check for code blocks
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks: Array<{ start: number; end: number; content: string }> = [];
  
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    codeBlocks.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0]
    });
  }
  
  // If no code blocks, use standard chunking
  if (codeBlocks.length === 0) {
    return chunkMessage(text, options);
  }
  
  // Split preserving code blocks
  const chunks: string[] = [];
  let currentPos = 0;
  let currentChunk = '';
  
  for (const block of codeBlocks) {
    // Add text before code block
    const beforeBlock = text.substring(currentPos, block.start);
    
    if (currentChunk.length + beforeBlock.length > safeLimit) {
      // Chunk the text before
      const textChunks = chunkMessage(currentChunk + beforeBlock, options);
      chunks.push(...textChunks.slice(0, -1));
      currentChunk = textChunks[textChunks.length - 1];
    } else {
      currentChunk += beforeBlock;
    }
    
    // Handle code block
    if (currentChunk.length + block.content.length > safeLimit) {
      // Push current chunk
      if (currentChunk.trim()) {
        chunks.push(currentChunk);
      }
      
      // Code block too large - split it
      if (block.content.length > safeLimit) {
        const codeChunks = splitCodeBlock(block.content, safeLimit);
        chunks.push(...codeChunks);
        currentChunk = '';
      } else {
        currentChunk = block.content;
      }
    } else {
      currentChunk += block.content;
    }
    
    currentPos = block.end;
  }
  
  // Add remaining text
  const remaining = text.substring(currentPos);
  if (remaining) {
    if (currentChunk.length + remaining.length > safeLimit) {
      chunks.push(currentChunk);
      chunks.push(...chunkMessage(remaining, options));
    } else {
      currentChunk += remaining;
      chunks.push(currentChunk);
    }
  } else if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Split a code block into multiple blocks
 */
function splitCodeBlock(codeBlock: string, maxLength: number): string[] {
  const langMatch = codeBlock.match(/^```(\w+)/);
  const lang = langMatch ? langMatch[1] : '';
  
  const code = codeBlock.replace(/^```\w*\n/, '').replace(/\n```$/, '');
  const lines = code.split('\n');
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxLength - 20) { // Reserve for ``` markers
      chunks.push('```' + lang + '\n' + currentChunk + '```');
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push('```' + lang + '\n' + currentChunk + '```');
  }
  
  return chunks;
}

// CLI test
if (require.main === module) {
  const testText = `
This is a test message that is very long and needs to be split.

Here's a paragraph with multiple sentences. This should stay together if possible. But if it's too long, it will split at sentence boundaries.

Here's a code block:
\`\`\`typescript
function example() {
  console.log("This should stay intact");
  return true;
}
\`\`\`

And here's more text after the code block.
`.trim();
  
  console.log('=== Standard Chunking ===');
  const standardChunks = chunkMessage(testText, { maxLength: 200 });
  standardChunks.forEach((chunk, i) => {
    console.log(`\n--- Chunk ${i + 1} (${chunk.length} chars) ---`);
    console.log(chunk);
  });
  
  console.log('\n\n=== Markdown Chunking ===');
  const markdownChunks = chunkMarkdown(testText, { maxLength: 200 });
  markdownChunks.forEach((chunk, i) => {
    console.log(`\n--- Chunk ${i + 1} (${chunk.length} chars) ---`);
    console.log(chunk);
  });
  
  console.log('\n\n=== Formatted Chunks ===');
  const formatted = formatChunks(standardChunks, { numbered: true });
  formatted.forEach(chunk => console.log(chunk + '\n'));
}
