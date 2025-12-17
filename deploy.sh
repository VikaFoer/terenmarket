#!/bin/bash

# SmartMarket Deployment Script
# Usage: ./deploy.sh [production|staging]

set -e  # Exit on error

ENVIRONMENT=${1:-production}
SERVER_USER="tecsa"
SERVER_HOST="web41"
SERVER_PATH="/home/tecsa/tecsamarket.com.ua/www"
LOCAL_PATH="."

echo "🚀 Starting deployment to $ENVIRONMENT..."
echo "📦 Server: $SERVER_USER@$SERVER_HOST"
echo "📁 Path: $SERVER_PATH"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build frontend
echo -e "${YELLOW}📦 Step 1: Building frontend...${NC}"
cd client
npm install
CI=false GENERATE_SOURCEMAP=false npm run build
cd ..

# Step 2: Create deployment package (excluding unnecessary files)
echo -e "${YELLOW}📦 Step 2: Creating deployment package...${NC}"
TEMP_DIR=$(mktemp -d)
DEPLOY_DIR="$TEMP_DIR/smartmarket"

mkdir -p "$DEPLOY_DIR"

# Copy necessary files
echo "Copying files..."
rsync -av --progress \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.gitignore' \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  --exclude='*.backup' \
  --exclude='*.tmp' \
  --exclude='*.old' \
  --exclude='.cache' \
  --exclude='.vscode' \
  --exclude='.idea' \
  --exclude='client/src' \
  --exclude='client/public' \
  --exclude='client/node_modules' \
  --exclude='server/node_modules' \
  --exclude='server/database.sqlite' \
  --exclude='server/uploads' \
  --exclude='*.md' \
  --exclude='!README.md' \
  --exclude='.env*' \
  --exclude='!.env.example' \
  "$LOCAL_PATH/" "$DEPLOY_DIR/"

# Step 3: Upload to server
echo -e "${YELLOW}📤 Step 3: Uploading to server...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" "mkdir -p $SERVER_PATH/backup && mkdir -p $SERVER_PATH"

# Backup existing deployment
echo "Creating backup..."
ssh "$SERVER_USER@$SERVER_HOST" "cd $SERVER_PATH && [ -d server ] && tar -czf backup/backup-\$(date +%Y%m%d-%H%M%S).tar.gz . || true"

# Upload new files
rsync -av --progress --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  "$DEPLOY_DIR/" "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"

# Step 4: Install dependencies on server
echo -e "${YELLOW}📦 Step 4: Installing dependencies on server...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/tecsa/tecsamarket.com.ua/www
echo "Installing server dependencies..."
cd server && npm install --production
echo "Installing client dependencies..."
cd ../client && npm install --production
ENDSSH

# Step 5: Restart application
echo -e "${YELLOW}🔄 Step 5: Restarting application...${NC}"
ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/tecsa/tecsamarket.com.ua/www
# Restart PM2 or your process manager
# pm2 restart smartmarket || pm2 start server/index.js --name smartmarket
# Or if using systemd:
# sudo systemctl restart smartmarket
# Or manual restart:
echo "Please restart your application manually"
ENDSSH

# Cleanup
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo "Next steps:"
echo "1. SSH to server: ssh $SERVER_USER@$SERVER_HOST"
echo "2. Check .env file: cd $SERVER_PATH/server && cat .env"
echo "3. Restart application"
echo "4. Check logs"

