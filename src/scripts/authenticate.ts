import { DeviceCodeCredential } from '@azure/identity';
import { clientId, scopes } from '../lib/config.js';
import { getTokenStorageStatus, writeAccessToken } from '../lib/auth.js';

async function authenticate() {
  try {
    const credential = new DeviceCodeCredential({
      clientId,
      userPromptCallback: (info) => {
        console.log(`\n${info.message}`);
      }
    });

    console.log('Starting authentication...');
    console.log('You will see a URL and code to enter shortly...');

    const tokenResponse = await credential.getToken(scopes);
    const accessToken = tokenResponse.token;
    await writeAccessToken(accessToken);

    const storageStatus = await getTokenStorageStatus();
    console.log('\nAuthentication successful!');
    console.log(`Access token stored via: ${storageStatus.storageMode}`);
  } catch (error) {
    console.error('Authentication error:', (error as Error).message || error);
  }
}

authenticate();
