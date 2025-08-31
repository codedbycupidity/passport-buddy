#!/bin/bash

echo "🐳 Starting Passport Buddy with Docker Compose..."

# Remove version warning by updating docker-compose.yml
cd /Users/beck/github/mern\&flutter

# Check if containers are already running
echo "📊 Checking current container status..."
docker-compose ps

# Start only backend and mongo (frontend runs better locally for hot reload)
echo "🚀 Starting MongoDB and Backend with Docker..."
docker-compose up -d mongo backend

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check backend health
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️  Backend may still be starting up..."
fi

# Show logs
echo -e "\n📋 Container Status:"
docker-compose ps

echo -e "\n🔍 To view logs:"
echo "   docker-compose logs -f backend"
echo "   docker-compose logs -f mongo"

echo -e "\n🎯 Next steps:"
echo "1. Frontend: cd frontend && npm run dev"
echo "2. Access the app at http://localhost:5173"
echo "3. Backend API at http://localhost:3000"

echo -e "\n🛑 To stop: docker-compose down"