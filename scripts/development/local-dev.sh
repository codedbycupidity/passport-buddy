#!/bin/bash

echo "🚀 Starting Local Development (using Docker MongoDB only)..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if MongoDB container is running
if docker ps | grep -q "mernflutter-mongo-1"; then
    echo -e "${GREEN}✅ MongoDB container is running${NC}"
else
    echo -e "${YELLOW}⚠️  Starting MongoDB container...${NC}"
    cd /Users/beck/github/mern\&flutter
    docker-compose up -d mongo
    sleep 3
fi

# Create .env files if they don't exist
if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}📝 Creating backend .env file...${NC}"
    cat > backend/.env << EOF
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://root:changeme@localhost:27017/passport_buddy?authSource=admin
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7
API_HOST=localhost
CLIENT_URL=http://localhost:5173

# Email Configuration
EMAIL_PROVIDER=resend
RESEND_API_KEY=${RESEND_API_KEY:-re_dummy_key}
SENDER_EMAIL=onboarding@resend.dev
SENDER_NAME=Passport Buddy

# Storage Configuration
STORAGE_TYPE=local
UPLOAD_DIR=./uploads
DO_SPACES_KEY=your-do-spaces-key
DO_SPACES_SECRET=your-do-spaces-secret
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_BUCKET=passport-buddy
DO_SPACES_REGION=nyc3
EOF
fi

if [ ! -f frontend/.env ]; then
    echo -e "${YELLOW}📝 Creating frontend .env file...${NC}"
    cat > frontend/.env << EOF
VITE_API_URL=http://localhost:3000
VITE_AUTH_TOKEN_KEY=passport_buddy_token
VITE_AUTH_USER_KEY=passport_buddy_user
EOF
fi

# Kill any existing processes
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start backend
echo -e "${GREEN}🔧 Starting backend server...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready!${NC}"
        break
    fi
    sleep 1
done

# Start frontend
echo -e "${GREEN}🎨 Starting frontend server...${NC}"
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo -e "
${GREEN}✅ Development environment is ready!${NC}

🔗 Frontend: http://localhost:5173
🔗 Backend:  http://localhost:3000
🔗 MongoDB:  mongodb://localhost:27017 (via Docker)

${YELLOW}Press Ctrl+C to stop all servers${NC}
"

# Trap Ctrl+C and cleanup
trap "echo -e '\n${RED}🛑 Stopping servers...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Keep running
wait