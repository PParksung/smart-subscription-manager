@echo off
echo 스마트 구독 관리 앱을 시작합니다...
echo.

REM Python이 설치되어 있는지 확인
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 오류: Python이 설치되어 있지 않습니다.
    echo Python 3.7 이상을 설치해주세요.
    pause
    exit /b 1
)

REM 서버 시작
python start_server.py

pause
