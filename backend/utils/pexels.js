const axios = require('axios');

/**
 * Fetch a relevant image from Pexels API based on search query
 * @param {string} query - Search term for image
 * @returns {string|null} - URL of the image or null if not found
 */
const getImageFromPexels = async (query) => {
  try {
    // You'll need to sign up for a free Pexels API key at https://www.pexels.com/api/
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    
    if (!PEXELS_API_KEY) {
      console.warn('PEXELS_API_KEY not found in environment variables');
      return null;
    }
    
    const response = await axios.get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    });
    
    if (response.data && response.data.photos && response.data.photos.length > 0) {
      return response.data.photos[0].src.medium;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching image from Pexels:', error.message);
    return null;
  }
};

module.exports = { getImageFromPexels }; 