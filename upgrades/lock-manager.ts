/**
 * Lock File Pattern (from Goda's Claude Telegram Relay)
 * Prevents duplicate gateway instances
 */

import { readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCK_FILE = process.env.OPENCLAW_LOCK_FILE || join(
  process.env.OPENCLAW_STATE_DIR || join(process.env.HOME || '~', '.openclaw'),
  'gateway.lock'
);

export interface LockInfo {
  pid: number;
  startedAt: string;
  host: string;
}

/**
 * Acquire lock file. Returns true if successful, false if another instance running.
 */
export async function acquireLock(): Promise<boolean> {
  try {
    // Check for existing lock
    const existingLock = await readFile(LOCK_FILE, 'utf-8').catch(() => null);
    
    if (existingLock) {
      try {
        const lockInfo: LockInfo = JSON.parse(existingLock);
        
        // Check if process still running
        try {
          process.kill(lockInfo.pid, 0); // Signal 0 = check if exists (doesn't kill)
          console.log(`[Lock] Another instance running (PID: ${lockInfo.pid}, started: ${lockInfo.startedAt})`);
          return false;
        } catch {
          console.log(`[Lock] Stale lock found (PID: ${lockInfo.pid}), taking over...`);
        }
      } catch (e) {
        console.log('[Lock] Invalid lock file format, taking over...');
      }
    }
    
    // Write new lock
    const lockInfo: LockInfo = {
      pid: process.pid,
      startedAt: new Date().toISOString(),
      host: (await import('os')).hostname()
    };
    
    await writeFile(LOCK_FILE, JSON.stringify(lockInfo, null, 2));
    console.log(`[Lock] Acquired lock (PID: ${process.pid})`);
    return true;
    
  } catch (error) {
    console.error('[Lock] Error acquiring lock:', error);
    return false;
  }
}

/**
 * Release lock file
 */
export async function releaseLock(): Promise<void> {
  try {
    await unlink(LOCK_FILE);
    console.log('[Lock] Released lock');
  } catch (error) {
    // Ignore errors (file might not exist)
  }
}

/**
 * Get current lock info
 */
export async function getLockInfo(): Promise<LockInfo | null> {
  try {
    const content = await readFile(LOCK_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Setup cleanup handlers
 */
export function setupLockCleanup(): void {
  // Cleanup on exit
  process.on('exit', () => {
    try {
      const fs = require('fs');
      fs.unlinkSync(LOCK_FILE);
    } catch {}
  });
  
  process.on('SIGINT', async () => {
    await releaseLock();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await releaseLock();
    process.exit(0);
  });
  
  process.on('uncaughtException', async (error) => {
    console.error('[Lock] Uncaught exception:', error);
    await releaseLock();
    process.exit(1);
  });
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'acquire':
      acquireLock().then(success => {
        process.exit(success ? 0 : 1);
      });
      break;
      
    case 'release':
      releaseLock().then(() => process.exit(0));
      break;
      
    case 'status':
      getLockInfo().then(info => {
        if (info) {
          console.log('Lock held by:');
          console.log(`  PID: ${info.pid}`);
          console.log(`  Host: ${info.host}`);
          console.log(`  Started: ${info.startedAt}`);
          
          try {
            process.kill(info.pid, 0);
            console.log('  Status: RUNNING ✓');
            process.exit(0);
          } catch {
            console.log('  Status: STALE (process not found)');
            process.exit(1);
          }
        } else {
          console.log('No lock file found');
          process.exit(1);
        }
      });
      break;
      
    default:
      console.log('Usage: tsx lock-manager.ts <acquire|release|status>');
      process.exit(1);
  }
}
