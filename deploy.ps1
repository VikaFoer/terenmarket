# SmartMarket Deployment Script for Windows
# Usage: .\deploy.ps1 [production|staging]

param(
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

$ServerUser = "tecsa"
$ServerHost = "web41"
$ServerPath = "/home/tecsa/tecsamarket.com.ua/www"
$LocalPath = Get-Location

Write-Host "🚀 Starting deployment to $Environment..." -ForegroundColor Yellow
Write-Host "📦 Server: ${ServerUser}@${ServerHost}" -ForegroundColor Yellow
Write-Host "📁 Path: $ServerPath" -ForegroundColor Yellow
Write-Host ""

# Step 1: Build frontend
Write-Host "📦 Step 1: Building frontend..." -ForegroundColor Yellow
Set-Location client
npm install
$env:CI = "false"
$env:GENERATE_SOURCEMAP = "false"
npm run build
Set-Location ..

# Step 2: Create deployment package
Write-Host "📦 Step 2: Creating deployment package..." -ForegroundColor Yellow
$TempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
$DeployDir = Join-Path $TempDir "smartmarket"
New-Item -ItemType Directory -Path $DeployDir -Force | Out-Null

# Copy files (excluding unnecessary ones)
Write-Host "Copying files..."
robocopy . $DeployDir /E /XD node_modules .git .cache .vscode .idea client\src client\public client\node_modules server\node_modules server\uploads /XF *.log *.backup *.tmp *.old *.md .env* /NP /NFL /NDL

# Step 3: Upload to server (requires SSH/SCP)
Write-Host "📤 Step 3: Uploading to server..." -ForegroundColor Yellow
Write-Host "Note: You need to manually upload files or use SCP/WinSCP" -ForegroundColor Red
Write-Host ""
Write-Host "Manual upload command:" -ForegroundColor Cyan
Write-Host "scp -r `"$DeployDir\*`" ${ServerUser}@${ServerHost}:${ServerPath}/" -ForegroundColor Green

# Step 4: Instructions
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload files to server using SCP or FTP" -ForegroundColor White
Write-Host "2. SSH to server: ssh ${ServerUser}@${ServerHost}" -ForegroundColor White
Write-Host "3. Install dependencies: cd $ServerPath/server && npm install --production" -ForegroundColor White
Write-Host "4. Check .env file" -ForegroundColor White
Write-Host "5. Restart application" -ForegroundColor White

# Cleanup
Remove-Item -Recurse -Force $TempDir

Write-Host ""
Write-Host "✅ Deployment package created!" -ForegroundColor Green

