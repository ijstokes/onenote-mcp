import { DeviceCodeCredential } from '@azure/identity';
import { clientId, scopes, tokenFilePath } from './lib/config.js';
import { writeAccessToken } from './lib/auth.js';

async function authenticate() {
  try {
    // Use device code flow
    const credential = new DeviceCodeCredential({
      clientId: clientId,
      userPromptCallback: (info) => {
        // This will show the URL and code to the user
        console.log('\n' + info.message);
      }
    });

    // Get an access token using device code flow
    console.log('Starting authentication...');
    console.log('You will see a URL and code to enter shortly...');
    
    const tokenResponse = await credential.getToken(scopes);
    
    // Save the token for future use
    const accessToken = tokenResponse.token;
    writeAccessToken(accessToken);
    
    console.log('\nAuthentication successful!');
    console.log('Access token saved to:', tokenFilePath);
    
  } catch (error) {
    console.error('Authentication error:', error);
  }
}

// Run the authentication
authenticate(); 