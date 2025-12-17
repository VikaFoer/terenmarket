# Setup Git repository and push to GitHub
$repoPath = "D:\SmartMarket – копія (2)"
Set-Location $repoPath

# Initialize git if not already initialized
if (-not (Test-Path ".git")) {
    git init
}

# Add remote if not exists
$remoteUrl = "https://github.com/VikaFoer/terenmarket.git"
$existingRemote = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    git remote add origin $remoteUrl
    Write-Host "Added remote origin: $remoteUrl"
} else {
    git remote set-url origin $remoteUrl
    Write-Host "Updated remote origin: $remoteUrl"
}

# Add all files
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    git commit -m "Initial commit: SmartMarket project"
    Write-Host "Created initial commit"
} else {
    Write-Host "No changes to commit"
}

# Push to GitHub
Write-Host "Pushing to GitHub..."
git push -u origin main --force
if ($LASTEXITCODE -ne 0) {
    git push -u origin master --force
}

Write-Host "Done!"

