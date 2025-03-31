/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './**/*.html',
    './**/*.js',
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
  plugins: [],
}