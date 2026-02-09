/**
 * Image Handler - Process and analyze images with vision models
 */

import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const IMAGE_DIR = join(homedir(), '.openclaw', 'images');

export interface ImageAnalysis {
  description: string;
  provider: string;
  model: string;
  cost: number;
  error?: string;
}

/**
 * Download image from URL and save locally
 */
export async function downloadImage(url: string, fileId: string): Promise<string> {
  await mkdir(IMAGE_DIR, { recursive: true });
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  const filePath = join(IMAGE_DIR, `${fileId}.jpg`);
  await writeFile(filePath, Buffer.from(buffer));
  
  return filePath;
}

/**
 * Convert image file to base64 data URL
 */
export async function imageToBase64(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const base64 = buffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Analyze image with vision model via OpenRouter
 */
export async function analyzeImage(
  imagePath: string,
  prompt: string,
  apiKey: string
): Promise<ImageAnalysis> {
  try {
    // Convert image to base64
    const imageData = await imageToBase64(imagePath);
    
    // Use Claude 3.5 Sonnet for vision (best quality)
    const model = 'anthropic/claude-3.5-sonnet';
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/andysheldon-creator/openclaw',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt || 'Describe this image in detail.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract response
    const description = data.choices?.[0]?.message?.content || 'No description available';
    
    // Calculate cost (Claude 3.5 Sonnet vision pricing)
    // Input: $3 per million tokens, Output: $15 per million tokens
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 };
    const inputCost = (usage.prompt_tokens / 1_000_000) * 3;
    const outputCost = (usage.completion_tokens / 1_000_000) * 15;
    const totalCost = inputCost + outputCost;
    
    return {
      description,
      provider: 'openrouter',
      model,
      cost: totalCost,
    };
    
  } catch (error: any) {
    console.error('[Image] Analysis error:', error);
    return {
      description: '',
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      cost: 0,
      error: error.message || 'Failed to analyze image',
    };
  }
}

/**
 * Clean up image file
 */
export async function cleanupImage(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    // Ignore cleanup errors
    console.error('[Image] Cleanup failed:', error);
  }
}

/**
 * Get image file size in MB
 */
export async function getImageSize(filePath: string): Promise<number> {
  try {
    const buffer = await readFile(filePath);
    return buffer.length / (1024 * 1024); // Convert to MB
  } catch {
    return 0;
  }
}
