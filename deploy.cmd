@echo off

:: 1. Install production dependencies
call npm install --production

:: 2. Build the application (if needed)
call npm run build

:: 3. Start the application
call npm start
