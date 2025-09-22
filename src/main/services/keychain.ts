import { safeStorage } from 'electron';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

const SECRETS_DIR = join(app.getPath('userData'), 'secrets');

// Ensure secrets directory exists
import { mkdirSync } from 'fs';
if (!existsSync(SECRETS_DIR)) {
  mkdirSync(SECRETS_DIR, { recursive: true });
}

export async function storeSecret(account: string, password: string): Promise<void> {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available on this system');
    }

    const encrypted = safeStorage.encryptString(password);
    const secretFile = join(SECRETS_DIR, `${account}.enc`);
    writeFileSync(secretFile, encrypted);
  } catch (error) {
    console.error('Failed to store secret:', error);
    throw new Error('Failed to store API key securely');
  }
}

export async function getSecret(account: string): Promise<string | null> {
  try {
    const secretFile = join(SECRETS_DIR, `${account}.enc`);
    if (!existsSync(secretFile)) {
      return null;
    }

    const encrypted = readFileSync(secretFile);
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('Encryption not available, cannot decrypt stored secret');
      return null;
    }

    return safeStorage.decryptString(encrypted);
  } catch (error) {
    console.error('Failed to retrieve secret:', error);
    return null;
  }
}

export async function deleteSecret(account: string): Promise<void> {
  try {
    const secretFile = join(SECRETS_DIR, `${account}.enc`);
    if (existsSync(secretFile)) {
      unlinkSync(secretFile);
    }
  } catch (error) {
    console.error('Failed to delete secret:', error);
    throw new Error('Failed to delete API key');
  }
}

export async function listSecrets(): Promise<string[]> {
  try {
    if (!existsSync(SECRETS_DIR)) {
      return [];
    }

    const files = readdirSync(SECRETS_DIR);
    return files
      .filter(file => file.endsWith('.enc'))
      .map(file => file.replace('.enc', ''));
  } catch (error) {
    console.error('Failed to list secrets:', error);
    return [];
  }
}