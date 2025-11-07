package com.smartsubscription.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * 뉴스 API 프록시 컨트롤러
 * NewsAPI를 호출하여 카테고리별 뉴스를 가져오고 CORS 문제를 해결
 */
@RestController
@RequestMapping("/news")
@CrossOrigin(origins = {"http://localhost:8000", "http://localhost:8081", "http://127.0.0.1:5500"}, 
             allowedHeaders = "*", 
             allowCredentials = "true")
public class NewsController {
    
    private final RestTemplate restTemplate;
    private static final String NEWS_API_KEY = "6f39a58963e14a8d9c67f47c8a07d8d7";
    private static final String NEWS_API_BASE_URL = "https://newsapi.org/v2/everything";
    
    public NewsController() {
        this.restTemplate = new RestTemplate();
    }
    
    /**
     * 카테고리별 뉴스 조회
     * NewsAPI를 호출하여 실제 뉴스 데이터를 가져옴
     * @param category 구독 카테고리 (entertainment, music, productivity 등)
     * @param pageSize 반환할 뉴스 개수 (기본 5개)
     */
    @GetMapping
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> getNewsByCategory(
            @RequestParam(required = false, defaultValue = "technology") String category,
            @RequestParam(required = false, defaultValue = "5") int pageSize) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 카테고리별 검색 키워드 매핑
            String searchQuery = mapCategoryToSearchQuery(category);
            
            // NewsAPI 호출 - 한국어 뉴스만 가져오기
            String url = String.format("%s?q=%s&pageSize=%d&apiKey=%s&sortBy=publishedAt&language=ko", 
                NEWS_API_BASE_URL, 
                java.net.URLEncoder.encode(searchQuery, "UTF-8"), 
                pageSize, 
                NEWS_API_KEY);
            
            Map<String, Object> apiResponse = restTemplate.getForObject(url, Map.class);
            
            if (apiResponse != null && "ok".equals(apiResponse.get("status"))) {
                // NewsAPI 응답 데이터 가공
                Object articlesObj = apiResponse.get("articles");
                java.util.List<Map<String, Object>> articles = new java.util.ArrayList<>();
                
                if (articlesObj instanceof java.util.List) {
                    java.util.List<Object> articleList = (java.util.List<Object>) articlesObj;
                    for (Object articleObj : articleList) {
                        if (articleObj instanceof Map) {
                            Map<String, Object> article = (Map<String, Object>) articleObj;
                            
                            // 한국어 기사만 필터링 (제목이나 설명에 한글이 포함되어 있는지 확인)
                            String title = String.valueOf(article.getOrDefault("title", ""));
                            String description = String.valueOf(article.getOrDefault("description", ""));
                            
                            // 한글이 포함되어 있는지 확인 (유니코드 범위: 한글 완성형)
                            boolean isKorean = containsKorean(title) || containsKorean(description);
                            
                            if (isKorean) {
                                Map<String, Object> processedArticle = new HashMap<>();
                                
                                processedArticle.put("title", title);
                                processedArticle.put("description", description);
                                processedArticle.put("url", article.get("url"));
                                processedArticle.put("publishedAt", article.get("publishedAt"));
                                
                                Object sourceObj = article.get("source");
                                if (sourceObj instanceof Map) {
                                    Map<String, Object> source = (Map<String, Object>) sourceObj;
                                    processedArticle.put("source", Map.of("name", source.getOrDefault("name", "Unknown")));
                                } else {
                                    processedArticle.put("source", Map.of("name", "Unknown"));
                                }
                                
                                articles.add(processedArticle);
                            }
                        }
                    }
                }
                
                // articles가 비어있으면 폴백 데이터 사용
                if (articles.isEmpty()) {
                    // 로그 출력 최소화 (디버그 모드에서만)
                    // System.out.println("NewsAPI 응답은 성공했지만 기사가 없습니다. 폴백 데이터 사용.");
                    response.put("success", true);
                    response.put("category", category);
                    response.put("articles", getDummyNewsData(category, pageSize));
                    response.put("source", "fallback");
                } else {
                    response.put("success", true);
                    response.put("category", category);
                    response.put("articles", articles);
                    response.put("source", "newsapi");
                    response.put("totalResults", apiResponse.get("totalResults"));
                }
                
                return ResponseEntity.ok(response);
            } else {
                // 응답 상태가 "ok"가 아닌 경우 (예: rate limit, API key 문제 등)
                String status = apiResponse != null ? String.valueOf(apiResponse.get("status")) : "null";
                String message = apiResponse != null ? String.valueOf(apiResponse.getOrDefault("message", "Unknown error")) : "API 응답이 null입니다.";
                System.err.println("NewsAPI 응답 오류 - status: " + status + ", message: " + message);
                throw new Exception("NewsAPI 응답 오류: " + message);
            }
            
        } catch (Exception e) {
            // API 호출 실패 시 더미 데이터 반환
            System.err.println("NewsAPI 호출 실패: " + e.getMessage());
            e.printStackTrace();
            
            // 폴백 데이터 반환
            java.util.List<Map<String, Object>> fallbackArticles = getDummyNewsData(category, pageSize);
            System.out.println("폴백 데이터 반환: " + fallbackArticles.size() + "개 기사");
            
            response.put("success", true);
            response.put("category", category);
            response.put("articles", fallbackArticles);
            response.put("source", "fallback");
            
            return ResponseEntity.ok(response);
        }
    }
    
    /**
     * 문자열에 한글이 포함되어 있는지 확인
     */
    private boolean containsKorean(String text) {
        if (text == null || text.isEmpty()) {
            return false;
        }
        // 한글 유니코드 범위: AC00(가) ~ D7A3(힣)
        return text.chars().anyMatch(ch -> ch >= 0xAC00 && ch <= 0xD7A3);
    }
    
    /**
     * 카테고리를 검색 키워드로 매핑
     * 구독 서비스와 직접 관련된 키워드로 검색하여 관련 기사만 가져옴
     * 한국어와 영어 키워드를 혼합하여 더 많은 한국어 뉴스를 찾음
     */
    private String mapCategoryToSearchQuery(String category) {
        Map<String, String> categoryMap = new HashMap<>();
        // 한국어와 영어 키워드를 혼합하여 더 많은 한국어 뉴스를 찾음
        categoryMap.put("entertainment", "넷플릭스 OR Netflix OR 디즈니 OR Disney OR 디즈니플러스 OR 왓챠 OR 웨이브 OR OTT OR 스트리밍");
        categoryMap.put("music", "스포티파이 OR Spotify OR 애플뮤직 OR Apple Music OR 멜론 OR 음악스트리밍");
        categoryMap.put("productivity", "마이크로소프트 OR Microsoft OR 오피스 OR Office OR 노션 OR Notion OR 생산성도구");
        categoryMap.put("cloud", "구글드라이브 OR Google Drive OR 드롭박스 OR Dropbox OR 원드라이브 OR 클라우드");
        categoryMap.put("fitness", "피트니스 OR fitness OR 헬스 OR health OR 운동 OR workout");
        categoryMap.put("education", "온라인교육 OR online education OR 학습플랫폼 OR 교육서비스");
        categoryMap.put("gaming", "게임패스 OR Game Pass OR 게이밍 OR gaming OR 게임서비스");
        categoryMap.put("shopping", "아마존 OR Amazon OR 이커머스 OR e-commerce OR 쇼핑서비스");
        categoryMap.put("news", "뉴스서비스 OR news service OR 뉴스구독 OR 미디어");
        categoryMap.put("ai", "챗GPT OR ChatGPT OR AI OR 인공지능 OR 클로드 OR Claude");
        categoryMap.put("development", "개발도구 OR development tools OR 코딩 OR programming OR 깃허브 OR GitHub");
        
        // 기본값: 구독 서비스 관련 일반 키워드
        return categoryMap.getOrDefault(category.toLowerCase(), "구독서비스 OR subscription service OR 구독경제");
    }
    
    /**
     * 더미 뉴스 데이터 생성 (테스트용)
     * 실제로는 NewsAPI에서 받아온 데이터를 반환
     */
    private java.util.List<Map<String, Object>> getDummyNewsData(String category, int pageSize) {
        java.util.List<Map<String, Object>> articles = new java.util.ArrayList<>();
        
        String[][] newsData = getNewsDataByCategory(category);
        int count = Math.min(pageSize, newsData.length);
        
        for (int i = 0; i < count; i++) {
            Map<String, Object> article = new HashMap<>();
            article.put("title", newsData[i][0]);
            article.put("description", newsData[i][1]);
            article.put("url", newsData[i][2]);
            article.put("publishedAt", java.time.LocalDateTime.now().minusHours(i).toString());
            article.put("source", Map.of("name", newsData[i][3]));
            articles.add(article);
        }
        
        return articles;
    }
    
    /**
     * 카테고리별 뉴스 데이터
     */
    private String[][] getNewsDataByCategory(String category) {
        String categoryLower = category.toLowerCase();
        
        if (categoryLower.contains("entertainment")) {
            return new String[][] {
                {"Netflix, 올해 가격 인상 계획 발표", "넷플릭스가 2025년 프리미엄 플랜 가격 인상을 검토 중이라고 발표했습니다.", "https://example.com/news1", "테크뉴스"},
                {"디즈니 플러스, 새로운 콘텐츠 라인업 공개", "디즈니 플러스가 올해 하반기 새로운 오리지널 시리즈를 공개합니다.", "https://example.com/news2", "엔터테인먼트뉴스"},
                {"스트리밍 서비스 경쟁 심화", "OTT 시장에서 경쟁이 치열해지면서 각 서비스의 가격 정책 변화가 예상됩니다.", "https://example.com/news3", "비즈니스뉴스"}
            };
        } else if (categoryLower.contains("music")) {
            return new String[][] {
                {"Spotify, 새로운 음악 추천 기능 출시", "스포티파이가 AI 기반 개인화 음악 추천 기능을 강화했습니다.", "https://example.com/news4", "테크뉴스"},
                {"Apple Music, 고음질 스트리밍 확대", "애플 뮤직이 무손실 오디오 서비스를 전면 확대합니다.", "https://example.com/news5", "애플뉴스"}
            };
        } else if (categoryLower.contains("productivity")) {
            return new String[][] {
                {"Microsoft 365, 새로운 AI 기능 추가", "마이크로소프트 365에 코파일럿 기능이 통합되어 생산성이 향상됩니다.", "https://example.com/news6", "테크뉴스"},
                {"노션, 협업 기능 대폭 개선", "노션이 팀 협업을 위한 새로운 기능들을 추가했습니다.", "https://example.com/news7", "비즈니스뉴스"}
            };
        } else if (categoryLower.contains("cloud")) {
            return new String[][] {
                {"구글 드라이브, 저장 용량 요금제 변경", "구글 드라이브의 저장 용량 요금제가 새로운 구조로 변경됩니다.", "https://example.com/news8", "테크뉴스"},
                {"드롭박스, 보안 기능 강화", "드롭박스가 엔터프라이즈 보안 기능을 강화했습니다.", "https://example.com/news9", "보안뉴스"}
            };
        } else if (categoryLower.contains("ai")) {
            return new String[][] {
                {"ChatGPT, 새로운 기능 업데이트", "OpenAI가 ChatGPT에 새로운 멀티모달 기능을 추가했습니다.", "https://example.com/news10", "AI뉴스"},
                {"클로드 AI, 기업용 플랜 출시", "Anthropic이 클로드 AI의 기업용 플랜을 공식 출시했습니다.", "https://example.com/news11", "비즈니스뉴스"}
            };
        }
        
        // 기본 뉴스
        return new String[][] {
            {"구독 서비스 시장 성장", "구독 경제 시장이 지속적으로 성장하고 있습니다.", "https://example.com/news12", "경제뉴스"},
            {"디지털 서비스 트렌드", "소비자들의 디지털 서비스 구독 패턴이 변화하고 있습니다.", "https://example.com/news13", "트렌드뉴스"}
        };
    }
}

