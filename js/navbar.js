(function() {
  // Function to load external HTML
  function loadHTML(file, callback) {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        callback(xhr.responseText);
      }
    };
    xhr.open("GET", file, true);
    xhr.send();
  }

  // Inject navbar container at the start of the body
  const body = document.body;
  const navbarDiv = document.createElement('div');
  navbarDiv.id = 'wosnerds-navbar';
  body.insertBefore(navbarDiv, body.firstChild);

  // Load the HTML content
  loadHTML("/navbar.html", function(data) {
    document.getElementById('wosnerds-navbar').innerHTML = data;
    
    // Set up mobile menu toggle functionality after navbar is loaded
    setupMobileMenu();
  });

  // Function to set up mobile menu toggle
  function setupMobileMenu() {
    const toggleButton = document.getElementById('mobile-menu-toggle');
    const navbar = document.getElementById('wosnerds-navbar-container');
    const overlay = document.getElementById('mobile-menu-overlay');

    if (toggleButton && navbar && overlay) {
      // Toggle menu when hamburger button is clicked
      toggleButton.addEventListener('click', function() {
        toggleMobileMenu();
      });

      // Close menu when overlay is clicked
      overlay.addEventListener('click', function() {
        closeMobileMenu();
      });

      // Close menu when clicking a link (on mobile only)
      const navLinks = navbar.querySelectorAll('a');
      navLinks.forEach(link => {
        link.addEventListener('click', function() {
          if (window.innerWidth < 768) { // Only on mobile
            closeMobileMenu();
          }
        });
      });
    }
  }

  function toggleMobileMenu() {
    const navbar = document.getElementById('wosnerds-navbar-container');
    const overlay = document.getElementById('mobile-menu-overlay');
    
    if (navbar.classList.contains('-translate-x-full')) {
      // Open menu
      navbar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    } else {
      // Close menu
      closeMobileMenu();
    }
  }

  function closeMobileMenu() {
    const navbar = document.getElementById('wosnerds-navbar-container');
    const overlay = document.getElementById('mobile-menu-overlay');
    
    navbar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
    document.body.style.overflow = ''; // Re-enable scrolling
  }

  // Handle window resize
  window.addEventListener('resize', function() {
    if (window.innerWidth >= 768) {
      document.body.style.overflow = ''; // Ensure scrolling is enabled on desktop
    }
  });
})();