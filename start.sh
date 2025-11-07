#!/bin/bash

echo "스마트 구독 관리 앱을 시작합니다..."
echo

# Python이 설치되어 있는지 확인
if ! command -v python3 &> /dev/null; then
    echo "오류: Python3가 설치되어 있지 않습니다."
    echo "Python 3.7 이상을 설치해주세요."
    exit 1
fi

# 실행 권한 부여
chmod +x start_server.py

# 서버 시작
python3 start_server.py
