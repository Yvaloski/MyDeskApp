#!/bin/bash

# Exit on error
set -e

# Set environment to production
export NODE_ENV=production

echo "🚀 Starting application..."

# Install production dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing production dependencies..."
    npm install --omit=dev
fi

# Start the application
echo "🚀 Starting Node.js application..."
exec node app.js
