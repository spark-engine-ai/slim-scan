import * as keytar from 'keytar';

const SERVICE_NAME = 'SlimScan';

export async function storeSecret(account: string, password: string): Promise<void> {
  try {
    await keytar.setPassword(SERVICE_NAME, account, password);
  } catch (error) {
    console.error('Failed to store secret:', error);
    throw new Error('Failed to store API key securely');
  }
}

export async function getSecret(account: string): Promise<string | null> {
  try {
    return await keytar.getPassword(SERVICE_NAME, account);
  } catch (error) {
    console.error('Failed to retrieve secret:', error);
    return null;
  }
}

export async function deleteSecret(account: string): Promise<void> {
  try {
    await keytar.deletePassword(SERVICE_NAME, account);
  } catch (error) {
    console.error('Failed to delete secret:', error);
    throw new Error('Failed to delete API key');
  }
}

export async function listSecrets(): Promise<string[]> {
  try {
    const credentials = await keytar.findCredentials(SERVICE_NAME);
    return credentials.map(cred => cred.account);
  } catch (error) {
    console.error('Failed to list secrets:', error);
    return [];
  }
}