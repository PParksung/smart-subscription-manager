#!/usr/bin/env python3
"""
프론트엔드 정적 파일 서버
Spring Boot 백엔드가 별도로 실행되어야 함
"""

import http.server
import socketserver
import os

class StaticFileHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='frontend', **kwargs)
    
    def do_GET(self):
        # 실제 경로를 지원하기 위해 모든 경로를 index.html로 리다이렉트 (SPA)
        # 파일이 실제로 존재하면 그대로 서빙, 없으면 index.html로
        path = self.path.split('?')[0]  # 쿼리 파라미터 제거
        
        # 정적 파일들 (CSS, JS, 이미지 등)은 그대로 서빙
        if path.endswith(('.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.json', '.woff', '.woff2', '.ttf', '.eot')):
            super().do_GET()
            return
        
        # 루트 경로나 실제 파일이 아닌 경로는 모두 index.html로
        if path == '/' or not '.' in path.split('/')[-1]:
            self.path = '/index.html'
        
        super().do_GET()

def main():
    PORT = 8000
    
    if not os.path.exists('frontend'):
        print("오류: frontend 디렉토리를 찾을 수 없습니다.")
        return
    
    with socketserver.TCPServer(("", PORT), StaticFileHandler) as httpd:
        print(f"프론트엔드 서버가 시작되었습니다!")
        print(f"서버 주소: http://localhost:{PORT}")
        print("백엔드 API: http://localhost:8081/api")
        print("종료하려면 Ctrl+C를 누르세요.")
        print("-" * 50)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n서버가 종료되었습니다.")

if __name__ == "__main__":
    main()
