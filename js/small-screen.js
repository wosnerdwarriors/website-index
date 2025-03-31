/**
 * Mobile Enhancement Script
 * 
 * Instead of showing a warning for mobile devices, this script
 * now enhances the mobile experience with additional functionality.
 */

document.addEventListener('DOMContentLoaded', function() {
  // Function to determine if we're on a mobile device
  function isMobileDevice() {
    return window.innerWidth < 768;
  }

  // Add mobile-specific enhancements
  function enhanceMobileExperience() {
    if (isMobileDevice()) {
      // Add 'mobile' class to body for potential CSS targeting
      document.body.classList.add('mobile-device');
      
      // Ensure proper viewport scaling
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
      
      // Add double-tap detection to prevent accidental zooming
      let lastTap = 0;
      document.addEventListener('touchend', function(event) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
          event.preventDefault();
        }
        lastTap = currentTime;
      });

      // Make tables more mobile friendly by adding horizontal scroll wrapper
      const tables = document.querySelectorAll('table:not(.mobile-enhanced)');
      tables.forEach(table => {
        if (!table.parentElement.classList.contains('overflow-x-auto')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'overflow-x-auto w-full';
          table.parentNode.insertBefore(wrapper, table);
          wrapper.appendChild(table);
        }
        table.classList.add('mobile-enhanced');
      });
    }
  }

  // Run enhancements on page load
  enhanceMobileExperience();

  // Re-run on resize (with debounce)
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(enhanceMobileExperience, 250);
  });
});