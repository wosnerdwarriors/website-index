#!/bin/bash

# Build script for WOS Nerds website

echo "Building WOS Nerds website..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Build Tailwind CSS
echo "Building Tailwind CSS..."
npx tailwindcss -i ./tailwind/input.css -o ./dist/css/tailwind.css

echo "Build completed successfully!"
echo "You can now run the website using a local server."
echo "To run a simple server: python -m http.server 8000"
echo "Then open http://localhost:8000 in your browser."