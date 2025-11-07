# 스마트 구독 관리 금융앱

## 프로젝트 개요
사용자의 구독 서비스를 통합 관리하고 불필요한 지출을 예방할 수 있는 스마트 구독 관리 금융앱입니다.

## 주요 기능
- 구독 내역 자동 인식
- 구독 현황 통합 대시보드
- 무료 체험 종료 및 결제 예정 알림
- 간편 구독 해지 지원
- 사용자 맞춤형 구독 추천 및 최적화
- **드래그 앤 드롭으로 구독 목록 정렬**
- **구독 카테고리별 관련 뉴스 조회** (NewsAPI 연동)

## 기술 스택
- **프론트엔드**: HTML5, CSS3, JavaScript (반응형 웹)
- **백엔드**: Java Spring Boot (REST API)
- **데이터 저장**: JSON 파일 기반
- **세션 관리**: HttpSession
- **개발 도구**: IntelliJ IDEA, Git/GitHub

## 구현된 기술 요소

### 필수 기술
✅ **HTML, CSS, 반응형 웹 구현**

### 선택 기술 (5개 포함)
✅ **(2) 웹 스토리지 활용** - localStorage, sessionStorage  
✅ **(3) HTML Graphics 활용** - Canvas 직접 사용 (도넛 차트, 선 차트)  
✅ **(4) Spring Boot JSON 파일 기반** - data/users.json, data/subscriptions.json  
✅ **(5) Session 기반** - HttpSession을 이용한 사용자 인증 및 데이터 관리  
✅ **(6) Drag and Drop API + Ajax** - 구독 목록 드래그 앤 드롭 정렬 및 순서 저장

## 프로젝트 구조
```
TP/
├── frontend/              # 웹 프론트엔드
│   ├── css/              # 스타일시트
│   ├── js/               # JavaScript 파일
│   │   ├── api.js        # API 호출 관리
│   │   ├── auth.js       # 인증 (Session 연동)
│   │   ├── app.js        # 메인 앱 로직 및 라우팅
│   │   ├── subscription.js # 구독 관리
│   │   ├── calendar.js   # 달력 기능
│   │   ├── news.js       # 뉴스 기능
│   │   ├── analytics.js  # 분석 기능
│   │   ├── drag-drop.js  # Drag & Drop 기능
│   │   └── canvas-chart.js # Canvas 직접 사용 차트
│   └── index.html        # 메인 페이지 (SPA)
├── backend/               # Spring Boot 백엔드
│   ├── src/main/java/com/smartsubscription/
│   │   ├── controller/   # REST API 컨트롤러
│   │   │   ├── AuthController.java
│   │   │   ├── SubscriptionController.java
│   │   │   ├── NewsController.java
│   │   │   └── ExchangeRateController.java
│   │   ├── service/      # JSON 파일 서비스
│   │   ├── model/        # 데이터 모델
│   │   └── config/       # 설정 (CORS 등)
│   ├── data/             # JSON 데이터 저장소
│   │   ├── users.json
│   │   └── subscriptions.json
│   └── pom.xml           # Maven 의존성 설정
└── start_server.py       # 프론트엔드 개발 서버
```

## 설치 및 실행 방법

### 1. 백엔드 실행 (Spring Boot)
```bash
cd backend
mvn spring-boot:run
```
또는 IntelliJ IDEA에서 `SmartSubscriptionApplication.java` 실행

백엔드 API: `http://localhost:8081/api`

### 2. 프론트엔드 실행
```bash
# 프로젝트 루트 디렉토리에서
python3 start_server.py
```

프론트엔드: `http://localhost:8000`

### 3. 접속
1. 브라우저에서 `http://localhost:8000` 접속
2. 회원가입 또는 로그인
3. 구독 추가 및 관리 시작

## API 엔드포인트

### 인증
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/session` - 세션 확인

### 구독 관리
- `GET /api/subscriptions` - 구독 목록 조회
- `POST /api/subscriptions` - 구독 추가
- `PUT /api/subscriptions/{id}` - 구독 수정
- `DELETE /api/subscriptions/{id}` - 구독 삭제
- `PUT /api/subscriptions/order` - 구독 순서 업데이트 (Drag & Drop)

### 뉴스
- `GET /api/news?category={category}&pageSize={size}` - 카테고리별 뉴스 조회 (NewsAPI 연동)

### 환율
- `GET /api/exchange-rates` - 실시간 환율 정보 조회 (외부 API 연동)

## 주요 기능 상세

### 1. 구독 현황 대시보드
- 활성 구독 수, 월간 총 지출, 다가오는 결제 현황 표시
- 최근 구독 내역 미리보기
- 환율 정보 실시간 표시 (외부 API 연동)

### 2. 구독 목록 관리
- 전체 구독 목록 조회
- 카테고리별 필터링 및 검색
- **드래그 앤 드롭으로 순서 변경** (Ajax로 자동 저장)

### 3. 결제 일정 달력
- 월별 달력으로 결제 예정일 시각화
- 7일 이내 결제 항목 강조 표시
- 결제일 클릭 시 상세 정보 표시

### 4. 지출 분석 및 리포트
- 카테고리별 지출 도넛 차트 (Chart.js + Canvas 직접 사용)
- 월별 지출 추이 선 차트
- 절약 기회 제안
- 구독 기간 분석

### 5. 구독 관련 뉴스
- 구독 카테고리별 관련 뉴스 자동 조회
- 한국어 뉴스 필터링
- NewsAPI를 통한 실시간 뉴스 제공
- 구독 서비스 관련 최신 정보 제공

## 테스트 계정

프로젝트에는 기본 테스트 계정이 포함되어 있습니다:

### 계정 1
- **이메일**: `test@example.com`
- **비밀번호**: `test1234`
- **이름**: 테스트 사용자

### 계정 2
- **이메일**: `hong@example.com`
- **비밀번호**: `password123`
- **이름**: 홍길동

또는 직접 회원가입을 통해 새 계정을 만들 수 있습니다.

## 개발자
- **이름**: 박성민
