#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment..."

# Install production dependencies
echo "📦 Installing production dependencies..."
npm install --production

# Build the frontend if it exists
if [ -d "client" ]; then
    echo "🔨 Building frontend..."
    cd client
    npm install
    npm run build
    cd ..
    
    # Create the target directory if it doesn't exist
    mkdir -p client/dist/mydeskapp-client
    
    # Move the built files to the expected location
    if [ -d "client/dist/mydeskapp-client" ]; then
        echo "📂 Moving frontend files..."
        cp -r client/dist/mydeskapp-client/* client/dist/
        rm -rf client/dist/mydeskapp-client
    fi
fi

echo "✅ Build completed successfully!"

# Start the application
echo "🚀 Starting application..."
npm start
