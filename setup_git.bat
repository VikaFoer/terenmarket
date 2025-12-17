@echo off
chcp 65001 >nul
cd /d "D:\SmartMarket – копія (2)"

echo Initializing git repository...
git init

echo Adding remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/VikaFoer/terenmarket.git

echo Adding all files...
git add .

echo Creating commit...
git commit -m "Initial commit: SmartMarket project"

echo Checking current branch...
git branch -M main 2>nul || git branch -M master

echo Pushing to GitHub...
git push -u origin main --force
if errorlevel 1 (
    git push -u origin master --force
)

echo Done!
pause

