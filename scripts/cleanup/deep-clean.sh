#!/bin/bash

# Deep Clean Script for Passport Buddy
# This script removes empty files, system files, and build artifacts

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
REMOVED_COUNT=0

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo -e "${GREEN}🧹 Passport Buddy Deep Clean Script${NC}"
echo "===================================="

# Function to safely remove files
safe_remove() {
    local file="$1"
    if [ -f "$file" ]; then
        rm -f "$file"
        ((REMOVED_COUNT++))
        log_success "Removed: $file"
    else
        log_warning "Not found: $file"
    fi
}

# Function to safely remove directories
safe_rmdir() {
    local dir="$1"
    if [ -d "$dir" ]; then
        if [ -z "$(ls -A "$dir")" ]; then
            rmdir "$dir"
            ((REMOVED_COUNT++))
            log_success "Removed empty directory: $dir"
        else
            log_warning "Directory not empty: $dir"
        fi
    else
        log_warning "Directory not found: $dir"
    fi
}

# 1. Remove empty files
log_info "Removing empty files..."

# Frontend empty files
safe_remove "frontend/src/stores/usePostStore.ts"
safe_remove "frontend/src/utils/validation.ts"
safe_remove "frontend/src/components/ui/Button.tsx"
safe_remove "frontend/src/components/layout/AuthLayout.tsx"
safe_remove "frontend/src/components/layout/MainLayout.tsx"
safe_remove "frontend/src/components/profile/ProfileHeader.tsx"
safe_remove "frontend/src/hooks/useAuth.ts"
safe_remove "frontend/src/hooks/useInfiniteScroll.ts"
safe_remove "frontend/src/api/axios.ts"
safe_remove "frontend/src/pages/LoginPage.tsx"
safe_remove "frontend/src/pages/ProfilePage.tsx"
safe_remove "frontend/src/pages/NotFoundPage.tsx"
safe_remove "frontend/src/pages/HomePage.tsx"

# Backend empty files
safe_remove "backend/docker-healthcheck.js"
safe_remove "backend/src/utils/redis.ts"
safe_remove "backend/src/utils/logger.ts"
safe_remove "backend/src/utils/apiError.ts"
safe_remove "backend/src/models/Comment.ts"
safe_remove "backend/src/controllers/auth.controller.ts"
safe_remove "backend/src/controllers/feed.controller.ts"

# 2. Remove .DS_Store files
log_info "Removing .DS_Store files..."
DS_STORE_COUNT=$(find . -name ".DS_Store" -type f | wc -l)
if [ $DS_STORE_COUNT -gt 0 ]; then
    find . -name ".DS_Store" -type f -delete
    ((REMOVED_COUNT+=DS_STORE_COUNT))
    log_success "Removed $DS_STORE_COUNT .DS_Store files"
fi

# 3. Remove log files
log_info "Removing log files..."
safe_remove "frontend/frontend.log"
safe_remove "backend/backend.log"

# 4. Remove backup files
log_info "Removing backup files..."
safe_remove "backend/.env.backup"

# 5. Ask about build directories
echo -e "\n${YELLOW}Build directories found:${NC}"
echo "  - frontend/dist/"
echo "  - shared/dist/"
echo "  - mobile/build/"
read -p "Remove build directories? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "frontend/dist" ]; then
        rm -rf "frontend/dist"
        ((REMOVED_COUNT++))
        log_success "Removed frontend/dist/"
    fi
    if [ -d "shared/dist" ]; then
        rm -rf "shared/dist"
        ((REMOVED_COUNT++))
        log_success "Removed shared/dist/"
    fi
    if [ -d "mobile/build" ]; then
        rm -rf "mobile/build"
        ((REMOVED_COUNT++))
        log_success "Removed mobile/build/"
    fi
fi

# 6. Remove empty directories
log_info "Removing empty directories..."
safe_rmdir "frontend/src/components/notifications"

# 7. Update .gitignore to ensure these are ignored
log_info "Checking .gitignore..."
if ! grep -q "\.DS_Store" .gitignore; then
    echo ".DS_Store" >> .gitignore
    log_warning "Added .DS_Store to .gitignore"
fi

# Summary
echo -e "\n${GREEN}✅ Cleanup Complete!${NC}"
echo "===================="
echo -e "Removed ${GREEN}$REMOVED_COUNT${NC} files/directories"

# Optional: Show remaining project size
echo -e "\n${BLUE}Project Statistics:${NC}"
echo -n "Files (excluding node_modules): "
find . -name "node_modules" -prune -o -type f -print | wc -l
echo -n "Total size (excluding node_modules): "
du -sh --exclude=node_modules . 2>/dev/null || du -sh . 2>/dev/null

echo -e "\n${YELLOW}Tip:${NC} Run 'git status' to see what will be removed from git"
echo -e "${YELLOW}Tip:${NC} Add these patterns to .gitignore if not already present"