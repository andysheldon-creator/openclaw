/**
 * Inspect Claude.ai DOM to find new selectors
 */

import puppeteer from 'puppeteer';

const SESSION_TOKEN = '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';

(async () => {
  console.log('🌐 Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: true, // Must run headless (no display)
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set session cookie
  console.log('🍪 Setting session cookie...');
  await page.setCookie({
    name: 'sessionKey',
    value: SESSION_TOKEN,
    domain: '.claude.ai',
    path: '/',
    httpOnly: true,
    secure: true,
  });

  // Navigate to new chat
  console.log('📡 Navigating to claude.ai/new...');
  await page.goto('https://claude.ai/new', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  // Wait a bit for page to fully load
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n=== INSPECTING DOM ===\n');

  // Method 1: Find all contenteditable elements
  const contentEditables = await page.evaluate(() => {
    const elements = document.querySelectorAll('[contenteditable]');
    return Array.from(elements).map(el => ({
      tag: el.tagName,
      contenteditable: el.getAttribute('contenteditable'),
      classes: el.className,
      id: el.id,
      placeholder: el.getAttribute('placeholder'),
      ariaLabel: el.getAttribute('aria-label'),
      outerHTML: el.outerHTML.substring(0, 200)
    }));
  });

  console.log('📝 Contenteditable elements found:', contentEditables.length);
  contentEditables.forEach((el, i) => {
    console.log(`\n[${i + 1}]`, JSON.stringify(el, null, 2));
  });

  // Method 2: Find textareas
  const textareas = await page.evaluate(() => {
    const elements = document.querySelectorAll('textarea');
    return Array.from(elements).map(el => ({
      tag: el.tagName,
      classes: el.className,
      id: el.id,
      placeholder: el.getAttribute('placeholder'),
      ariaLabel: el.getAttribute('aria-label'),
      name: el.name
    }));
  });

  console.log('\n📝 Textarea elements found:', textareas.length);
  textareas.forEach((el, i) => {
    console.log(`\n[${i + 1}]`, JSON.stringify(el, null, 2));
  });

  // Method 3: Find elements with specific aria-labels
  const inputElements = await page.evaluate(() => {
    const selectors = [
      '[role="textbox"]',
      '[data-test-id*="input"]',
      '[data-test-id*="chat"]',
      '[data-testid*="input"]',
      '[data-testid*="chat"]',
      'input[type="text"]',
      '.ProseMirror',
      '[aria-label*="message" i]',
      '[aria-label*="chat" i]',
      '[aria-label*="type" i]'
    ];

    const results = {};
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          results[selector] = Array.from(elements).map(el => ({
            tag: el.tagName,
            classes: el.className,
            id: el.id,
            ariaLabel: el.getAttribute('aria-label')
          }));
        }
      } catch (e) {
        // Ignore invalid selectors
      }
    });
    return results;
  });

  console.log('\n🔍 Elements by common selectors:');
  Object.entries(inputElements).forEach(([selector, elements]) => {
    if (elements.length > 0) {
      console.log(`\n${selector}:`, JSON.stringify(elements, null, 2));
    }
  });

  // Method 4: Get page HTML and save it
  const html = await page.content();
  const fs = await import('fs/promises');
  await fs.writeFile('./claude-page-source.html', html);
  console.log('\n💾 Full page HTML saved to: ./claude-page-source.html');

  console.log('\n✅ Inspection complete!');
  
  await browser.close();
  console.log('\n✅ Done!');
})();
