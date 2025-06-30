/**
 * Google Auth Handler
 * 
 * This script handles the Google OAuth login flow by directly linking to the backend API
 */

document.addEventListener('DOMContentLoaded', function() {
  // Find Google sign-in button
  const googleButton = document.querySelector('a[href="/auth/google"]');
  
  if (googleButton) {
    // Replace the default link behavior with direct backend URL
    googleButton.addEventListener('click', function(event) {
      event.preventDefault();
      
      // Show loading state
      googleButton.innerHTML = '<div class="flex items-center"><svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading...</div>';
      googleButton.disabled = true;
      
      // Backend API URL with return URL to frontend
      const apiUrl = 'http://localhost:3000/auth/google';
      const frontendUrl = window.location.origin; // Gets http://localhost:4000
      const fullUrl = `${apiUrl}?frontend_url=${encodeURIComponent(frontendUrl)}`;
      
      // Redirect to backend OAuth endpoint
      window.location.href = fullUrl;
    });
  }
}); 