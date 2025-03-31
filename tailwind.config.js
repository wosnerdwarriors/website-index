/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './navbar.html',
    './js/*.js',
    './dist/*.js',
    './*/index.html',
    './*/*.js',
    './*/*/*.js',
    './*/*/*.html',
  ],
  theme: {
    extend: {
      colors: {
        'wos-gray': '#e8e8e8',
        'wos-light': '#f0f0f0',
        'wos-dark': '#333',
        'wos-hover': '#d0d0d0',
      },
    },
  },
  safelist: [
    // Navbar color variants used dynamically in JS
    'bg-slate-600', 'hover:bg-slate-700',
    'bg-emerald-600', 'hover:bg-emerald-700',
    'bg-amber-600', 'hover:bg-amber-700',
    'bg-indigo-600', 'hover:bg-indigo-700',
    'bg-rose-600', 'hover:bg-rose-700',
    'bg-teal-700', 'hover:bg-teal-800',
    'bg-zinc-700', 'hover:bg-zinc-800'
  ],

  plugins: [],
}