#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment..."

# Install production dependencies
echo "📦 Installing production dependencies..."
npm install --production

# Build the frontend if it exists
if [ -d "client" ]; then
    echo "🔨 Setting up Angular CLI and building frontend..."
    cd client
    
    # Install Angular CLI globally
    echo "📦 Installing Angular CLI..."
    npm install -g @angular/cli@latest
    
    # Install dependencies with legacy peer deps
    echo "📦 Installing frontend dependencies..."
    npm install --legacy-peer-deps
    
    # Install Angular build tools
    echo "🔨 Installing Angular build tools..."
    npm install @angular-devkit/build-angular --save-dev
    
    # Build Angular app
    echo "🔨 Building Angular application..."
    npm run build -- --configuration production --output-hashing=all
    
    cd ..
    
    # Ensure the target directory exists
    mkdir -p client/dist/mydeskapp-client
    
    # Move built files to the expected location
    if [ -d "client/dist/mydeskapp-client" ]; then
        echo "📂 Moving frontend files..."
        # Copy all files from the Angular dist directory
        cp -r client/dist/mydeskapp-client/* client/dist/
        # Remove the now empty directory
        rm -rf client/dist/mydeskapp-client
    fi
fi

echo "✅ Build completed successfully!"

# Start the application
echo "🚀 Starting application..."
exec npm start
