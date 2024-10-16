#!/usr/bin/env python3
# this is not needed for the project. This just serves as a local web server for testing

import argparse
import os
from flask import Flask, send_from_directory, abort

app = Flask(__name__)

# Whitelisted extensions
WHITELISTED_EXTENSIONS = {'html', 'json', 'js', 'png', 'css', 'md','ico'}

# Root directory for serving files (subdirectories)
ROOT_DIR = os.getcwd()

def is_allowed_file(filename):
    # Check if the file has an allowed extension
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in WHITELISTED_EXTENSIONS

@app.route('/<path:filename>')
def serve_file(filename):
    # Prevent path traversal by ensuring the requested file is within the ROOT_DIR
    secure_path = os.path.abspath(os.path.join(ROOT_DIR, filename))

    # Ensure the requested path is within the root directory (prevents path traversal)
    if not secure_path.startswith(os.path.abspath(ROOT_DIR)):
        abort(403)  # Forbidden

    # If it's a directory, check for index.html or index.htm
    if os.path.isdir(secure_path):
        for index_file in ['index.html', 'index.htm']:
            index_path = os.path.join(secure_path, index_file)
            if os.path.exists(index_path):
                return send_from_directory(secure_path, index_file)
        # If no index file is found, return 404
        abort(404)

    # Check if the path is a file and the extension is allowed
    if os.path.isfile(secure_path) and is_allowed_file(filename):
        dirname = os.path.dirname(filename)
        basename = os.path.basename(filename)
        return send_from_directory(os.path.join(ROOT_DIR, dirname), basename)
    else:
        # Return a 404 if the file doesn't exist or the extension is not allowed
        abort(404)

@app.route('/')
def index():
    # Serve the index.html file from the root directory
    return send_from_directory(ROOT_DIR, 'index.html')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Run the Flask server.")
    parser.add_argument('-p', '--port', type=int, default=7500, help='Port to run the server on')
    args = parser.parse_args()

    app.run(debug=True, port=args.port)
