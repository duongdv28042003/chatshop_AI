@echo off
chcp 65001 >nul
title Cloudflare Tunnel - Public Internet
echo ========================================================
echo        KHOI DONG CLOUDFLARE TUNNEL (PUBLIC RA INTERNET)
echo ========================================================
echo.
echo [1] Kiem tra port 3000 (Next.js Storefront & Dashboard)...
echo [2] Dang tao duong link HTTPS truc tiep ra Internet...
echo.
tools\cloudflared.exe tunnel --url http://localhost:3000
pause

