@echo off
chcp 65001 >nul
title smash!!!
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [錯誤] 找不到 Node.js，請先安裝：https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo 第一次執行，正在安裝套件...
  call npm install
)
echo 正在啟動遊戲，瀏覽器會自動開啟（關閉此視窗即可結束遊戲）
call npm run dev -- --open
pause
