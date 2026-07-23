(function() {
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.id = 'darkModeToggle';
  toggleBtn.style.position = 'fixed';
  toggleBtn.style.bottom = '20px';
  toggleBtn.style.right = '20px';
  toggleBtn.style.zIndex = '1000';
  toggleBtn.style.background = '#222';
  toggleBtn.style.color = '#fff';
  toggleBtn.style.border = '1px solid #52525b';
  toggleBtn.style.padding = '10px 16px';
  toggleBtn.style.borderRadius = '8px';
  toggleBtn.style.cursor = 'pointer';
  toggleBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  toggleBtn.style.fontWeight = '700';

  function setDarkMode(on) {
    document.body.classList.toggle('dark', on);
    localStorage.setItem('darkMode', on ? 'on' : 'off');
    toggleBtn.textContent = on ? '\u2600 Light mode' : '\u263E Dark mode';
    toggleBtn.setAttribute('aria-label', on ? 'Switch to light mode' : 'Switch to dark mode');
    toggleBtn.setAttribute('aria-pressed', String(on));
  }

  toggleBtn.addEventListener('click', () => {
    setDarkMode(!document.body.classList.contains('dark'));
  });

  setDarkMode(localStorage.getItem('darkMode') === 'on');
  document.body.appendChild(toggleBtn);
})();
