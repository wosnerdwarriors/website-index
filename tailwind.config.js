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
    // Dynamically generated color classes for navbar
    'bg-blue-500', 'hover:bg-blue-600', 'text-blue-800',
    'bg-green-500', 'hover:bg-green-600', 'text-green-800',
    'bg-yellow-500', 'hover:bg-yellow-600', 'text-yellow-800',
    'bg-purple-500', 'hover:bg-purple-600', 'text-purple-800',
    'bg-red-500', 'hover:bg-red-600', 'text-red-800',
    'bg-indigo-500', 'hover:bg-indigo-600', 'text-indigo-800',
    'bg-pink-500', 'hover:bg-pink-600', 'text-pink-800',
    'bg-teal-500', 'hover:bg-teal-600', 'text-teal-800',
    'bg-teal-600', 'hover:bg-teal-700', 'text-teal-900',
    'bg-cyan-500', 'hover:bg-cyan-600', 'text-cyan-800',
    'bg-cyan-600', 'hover:bg-cyan-700',
    'bg-gray-500', 'hover:bg-gray-600', 'text-gray-800',
    'bg-gray-600', 'hover:bg-gray-700',
  ],
  plugins: [],
}