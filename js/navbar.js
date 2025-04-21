(function() {
  // Navigation menu data structure
  const navMenuData = {
    tools: [
      { name: "Rally Tracker", url: "/rallytracker", color: "slate" },
      { name: "Research Calc", url: "/researchtree", color: "emerald" },
      { name: "Troop Stats", url: "/troop-stats", color: "amber" },
      { name: "Calendar", url: "/calendar", color: "indigo" },
      { name: "SVS History", url: "/svs-history", color: "rose" },
      { name: "Alliance RSS Calc", url: "/alliancerss", color: "teal" },
      { name: "Formation Builder", url: "/formationbuilder", color: "zinc" },
      { name: "Layout Planner", url: "/layout-planner", color: "slate" },
      { name: "Videos", url: "/videos", color: "purple" }
    ],
    external: [
      { name: "Google Drive", url: "https://drive.google.com/drive/folders/1rTwI6mXDYvFZHo8MhWQciCcNPprTmfFe?usp=sharing", color: "zinc" },
      { name: "YouTube", url: "https://www.youtube.com/@WosNerds", color: "zinc" },
      { name: "Discord", url: "https://discord.gg/dMYY8bcPXp", color: "zinc" },
      { name: "Github Source Code", url: "https://github.com/wosnerdwarriors", color: "zinc" }
    ],
    dataCollection: [
      { name: "SvS Match Results", url: "https://forms.gle/BBnuL5V8LJ12mB9S7", color: "teal" },
      { name: "State Age", url: "https://forms.gle/zeZJY8PBRHWsem2u7", color: "teal" }
    ]
  };

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

  // Get navbar URL from config
  async function getNavbarUrl() {
    const configResponse = await fetch('/config.json');
    const config = await configResponse.json();
    return config.dataSources.navbar.url;
  }

  // Load the navbar content
  getNavbarUrl().then(navbarUrl => {
    loadHTML(navbarUrl, function(data) {
      document.getElementById('wosnerds-navbar').innerHTML = data;
      
      // Add close button for mobile
      addCloseButton();
      
      // Generate the dynamic navbar
      generateNavbar();
      
      // Set up mobile menu toggle functionality after navbar is loaded
      setupMobileMenu();
    });
  });

  // Function to generate the navbar items
  function generateNavbar() {
    const navbarLinks = document.getElementById('navbar-links');
    if (!navbarLinks) return;
    
    // Add more space between items on mobile
    if (window.innerWidth < 768) {
      navbarLinks.classList.replace('space-y-3', 'space-y-4');
    }

    // Generate tools section
    navMenuData.tools.forEach(item => {
      const li = createNavItem(item.name, item.url, item.color);
      navbarLinks.appendChild(li);
    });

    // Generate external links section
    const externalHeader = createSectionHeader("External Links");
    navbarLinks.appendChild(externalHeader);
    
    navMenuData.external.forEach(item => {
      const li = createNavItem(item.name, item.url, item.color, true);
      navbarLinks.appendChild(li);
    });

    // Generate data collection section
    const dataHeader = createSectionHeader("Data Collection");
    navbarLinks.appendChild(dataHeader);
    
    navMenuData.dataCollection.forEach(item => {
      const li = createNavItem(item.name, item.url, item.color, true);
      navbarLinks.appendChild(li);
    });
  }

  // Helper function to create a navigation item
  function createNavItem(name, url, color, isExternal = false) {
    const li = document.createElement('li');
    li.className = 'flex justify-center';
    
    const a = document.createElement('a');
    a.href = url;
    
    // Base classes that don't change
    const baseClasses = "text-white my-1 py-2 px-4 rounded-lg w-[90%] text-center no-underline block shadow-md";
    
    // Color mapping for background
    const colorClasses = {
      slate: "bg-slate-600 hover:bg-slate-700",
      emerald: "bg-emerald-600 hover:bg-emerald-700",
      amber: "bg-amber-600 hover:bg-amber-700",
      indigo: "bg-indigo-600 hover:bg-indigo-700",
      rose: "bg-rose-600 hover:bg-rose-700",
      teal: "bg-teal-700 hover:bg-teal-800",
      zinc: "bg-zinc-700 hover:bg-zinc-800",
      purple: "bg-purple-600 hover:bg-purple-700"
    };
        
    // Combine classes safely, with fallback to blue if color not found
    a.className = `${baseClasses} ${colorClasses[color] || 'bg-blue-500 hover:bg-blue-600'}`;
    a.textContent = name;
    
    if (isExternal) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    
    li.appendChild(a);
    return li;
  }

  // Create section header
  function createSectionHeader(title) {
    const li = document.createElement('li');
    li.className = 'mt-6 mb-2';
    
    const h5 = document.createElement('h5');
    h5.className = 'text-center font-semibold text-gray-700 bg-gray-200 py-1 rounded';
    h5.textContent = title;
    
    li.appendChild(h5);
    return li;
  }
  
  // Add close button for mobile view
  function addCloseButton() {
    const navbar = document.getElementById('wosnerds-navbar-container');
    if (!navbar) return;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'absolute top-2 right-2 p-1 rounded-full bg-gray-300 text-gray-700 hover:bg-gray-400 md:hidden';
    closeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span class="sr-only">Close Menu</span>
    `;
    
    // Add click event
    closeButton.addEventListener('click', closeMobileMenu);
    
    // Add to navbar
    navbar.appendChild(closeButton);
  }

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
