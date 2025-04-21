/**
 * Common loading script for WOS Nerds pages
 * 
 * This script should be included in each page to load Tailwind CSS and set up the navbar.
 * Usage:
 * 1. Add this to the head of your HTML: <script src="/js/load-base.js"></script>
 * 2. The script will automatically add Tailwind CSS and set up the navbar
 */

(function() {
  // Create and inject Tailwind CSS link
  const tailwindLink = document.createElement('link');
  tailwindLink.rel = 'stylesheet';
  tailwindLink.href = '/dist/css/tailwind.css';
  document.head.appendChild(tailwindLink);
  
  // Create and inject mobile enhancement script
  const mobileScript = document.createElement('script');
  mobileScript.src = '/js/small-screen.js';
  mobileScript.defer = true;
  document.head.appendChild(mobileScript);
  
  // Create and inject navbar script
  const navbarScript = document.createElement('script');
  navbarScript.src = '/js/navbar.js';
  navbarScript.defer = true;
  document.head.appendChild(navbarScript);
  
  // Add container and footer when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Check if not already wrapped
    if (!document.querySelector('.md\\:ml-64')) {
      // Get all content except scripts
      const originalBody = document.body.innerHTML;
      
      // Create new structure with wrapper and footer
      const newContent = `
        <div class="md:ml-64 p-4 transition-all duration-300 min-h-screen flex flex-col">
          <div class="original-content flex-grow">
            ${originalBody}
          </div>
          <footer class="mt-auto py-4 text-center text-gray-600 border-t">
            <p>All data is free to copy and use. See <a href="https://github.com/wosnerdwarriors" target="_blank" class="text-blue-600 hover:underline">https://github.com/wosnerdwarriors</a> for source code</p>
          </footer>
        </div>
      `;
      
      document.body.innerHTML = newContent;
    }
  });
})();