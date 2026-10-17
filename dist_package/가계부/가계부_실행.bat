@echo off
chcp 65001 >nul
title 가계부 실행기
cd /d "%~dp0"
start "" "가계부.exe"
exit
