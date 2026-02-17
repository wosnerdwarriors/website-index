// Dark mode toggle script
(function() {
  // No floating button needed, we use the sidebar one

  function setDarkMode(on) {
    const iconContainer = document.getElementById('theme-icon-container');
    if (on) {
      document.body.classList.add('dark');
      localStorage.setItem('darkMode', 'on');
      if (iconContainer) iconContainer.innerText = '☀️';
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('darkMode', 'off');
      if (iconContainer) iconContainer.innerText = '🌙';
    }
  }

  // Handle sidebar toggle click with delegation to be safe
  document.addEventListener('click', function(e) {
    const toggleBtn = e.target.closest('#sidebar-dark-mode-toggle');
    if (toggleBtn) {
      e.preventDefault();
      setDarkMode(!document.body.classList.contains('dark'));
    }
  });

  // Re-check icon state more frequently to fix visibility bugs
  setInterval(() => {
    const isDark = document.body.classList.contains('dark');
    const iconContainer = document.getElementById('theme-icon-container');
    if (iconContainer) {
      iconContainer.innerText = isDark ? '☀️' : '🌙';
    }
  }, 1000);

  // On load, check localStorage
  if (localStorage.getItem('darkMode') === 'on') {
    setDarkMode(true);
  }
})();
