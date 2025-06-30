const { google } = require('googleapis');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../config/config.env') });

// Google OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

/**
 * Get Google OAuth URL
 * @param {string} redirectUri - Optional redirect URI to override the default
 * @param {string} state - Optional state parameter for security
 * @returns {string} The OAuth URL for redirecting the user
 */
exports.getAuthUrl = (redirectUri = null, state = null) => {
  // Create a new instance with the correct configuration
  // This avoids modifying the global oauth2Client
  const authClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri || process.env.GOOGLE_CALLBACK_URL
  );
  
  // Build the OAuth URL
  const options = {
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent' // Always show the consent screen
  };
  
  // Add state if provided
  if (state) {
    options.state = state;
  }
  
  return authClient.generateAuthUrl(options);
};

/**
 * Exchange code for tokens
 * @param {string} code - The authorization code
 * @returns {Object} The token data
 */
exports.exchangeCodeForTokens = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
};

/**
 * Get user info from Google
 * @param {string} accessToken - The access token
 * @returns {Object} User information
 */
exports.getUserInfo = async (accessToken) => {
  try {
    // Set the credentials
    oauth2Client.setCredentials({ access_token: accessToken });
    
    // Create the people API client
    const people = google.people({ version: 'v1', auth: oauth2Client });
    
    // Get user information
    const { data } = await people.people.get({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,photos'
    });
    
    // Extract relevant user information
    const userInfo = {
      id: data.resourceName.split('/')[1],
      name: data.names ? data.names[0].displayName : null,
      email: data.emailAddresses ? data.emailAddresses[0].value : null,
      picture: data.photos ? data.photos[0].url : null
    };
    
    return userInfo;
  } catch (error) {
    console.error('Error getting user info:', error);
    throw error;
  }
}; 