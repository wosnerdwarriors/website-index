// Dark mode toggle script
(function() {
  const toggleBtn = document.createElement('button');
  toggleBtn.innerText = '🌙 Dark Mode';
  toggleBtn.id = 'darkModeToggle';
  toggleBtn.style.position = 'fixed';
  toggleBtn.style.bottom = '20px';
  toggleBtn.style.right = '20px';
  toggleBtn.style.zIndex = '1000';
  toggleBtn.style.background = '#222';
  toggleBtn.style.color = '#fff';
  toggleBtn.style.border = 'none';
  toggleBtn.style.padding = '10px 16px';
  toggleBtn.style.borderRadius = '8px';
  toggleBtn.style.cursor = 'pointer';
  toggleBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';

  function setDarkMode(on) {
    if (on) {
      document.body.classList.add('dark');
      localStorage.setItem('darkMode', 'on');
      toggleBtn.innerText = '☀️ Light Mode';
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('darkMode', 'off');
      toggleBtn.innerText = '🌙 Dark Mode';
    }
  }

  toggleBtn.onclick = function() {
    setDarkMode(!document.body.classList.contains('dark'));
  };

  // On load, check localStorage
  if (localStorage.getItem('darkMode') === 'on') {
    setDarkMode(true);
  }

  document.body.appendChild(toggleBtn);
})();
