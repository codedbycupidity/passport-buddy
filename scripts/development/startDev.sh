#!/bin/bash

# Start development servers for the MERN stack

echo "🚀 Starting Passport Buddy Development Environment..."

# Kill any existing processes on ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   On macOS: brew services start mongodb-community"
    echo "   On Linux: sudo systemctl start mongod"
    exit 1
fi

echo "✅ MongoDB is running"

# Start backend
echo "🔧 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Backend is running on port 3000"
else
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend
echo "🎨 Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

echo "
✅ Development environment is ready!

🔗 Frontend: http://localhost:5173
🔗 Backend:  http://localhost:3000
🔗 GraphQL:  http://localhost:3000/graphql

Press Ctrl+C to stop all servers
"

# Keep script running and handle cleanup
trap "echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Wait for processes
wait