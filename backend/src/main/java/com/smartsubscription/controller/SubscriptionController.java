package com.smartsubscription.controller;

import com.smartsubscription.service.JsonFileService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 구독 관리 REST API 컨트롤러
 */
@RestController
@RequestMapping("/subscriptions")
@CrossOrigin(origins = {"http://localhost:8000", "http://localhost:8081", "http://127.0.0.1:5500"}, 
             allowedHeaders = "*", 
             allowCredentials = "true")
public class SubscriptionController {
    
    private final JsonFileService jsonFileService;
    
    public SubscriptionController(JsonFileService jsonFileService) {
        this.jsonFileService = jsonFileService;
    }
    
    /**
     * 세션에서 사용자 ID 가져오기
     */
    private Long getUserId(HttpSession session) {
        Object userIdObj = session.getAttribute("userId");
        if (userIdObj == null) {
            return null;
        }
        
        if (userIdObj instanceof Number) {
            return ((Number) userIdObj).longValue();
        }
        return Long.parseLong(userIdObj.toString());
    }
    
    /**
     * 인증 확인
     */
    private ResponseEntity<Map<String, Object>> checkAuth(HttpSession session) {
        if (session == null) {
            System.out.println("세션이 null입니다.");
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "로그인이 필요합니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        Long userId = getUserId(session);
        System.out.println("인증 확인 - 세션 ID: " + session.getId() + ", userId: " + userId);
        if (userId == null) {
            System.out.println("세션에 userId가 없습니다. 세션 속성: " + session.getAttributeNames());
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "로그인이 필요합니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        return null;
    }
    
    /**
     * 구독 목록 조회
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getSubscriptions(HttpSession session) {
        ResponseEntity<Map<String, Object>> authCheck = checkAuth(session);
        if (authCheck != null) {
            System.out.println("구독 조회 실패: 인증되지 않음. 세션 ID: " + (session != null ? session.getId() : "null"));
            return authCheck;
        }
        
        Long userId = getUserId(session);
        List<Map<String, Object>> subscriptions = jsonFileService.readUserSubscriptions(userId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("subscriptions", subscriptions);
        response.put("count", subscriptions.size());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * 구독 추가
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> addSubscription(@RequestBody Map<String, Object> request,
                                                               HttpSession session) {
        ResponseEntity<Map<String, Object>> authCheck = checkAuth(session);
        if (authCheck != null) {
            return authCheck;
        }
        
        Long userId = getUserId(session);
        
        try {
            // 필수 필드 검증
            String name = (String) request.get("name");
            if (name == null || name.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "서비스명을 입력해주세요.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 새 구독 생성
            Long subscriptionId = System.currentTimeMillis();
            Map<String, Object> newSubscription = new HashMap<>(request);
            newSubscription.put("id", subscriptionId);
            newSubscription.put("userId", userId);
            newSubscription.put("createdAt", java.time.LocalDateTime.now().toString());
            
            // 기본값 설정
            if (!newSubscription.containsKey("status")) {
                newSubscription.put("status", "active");
            }
            if (!newSubscription.containsKey("currency")) {
                newSubscription.put("currency", "KRW");
            }
            
            // 기존 구독 목록 가져오기
            List<Map<String, Object>> userSubscriptions = jsonFileService.readUserSubscriptions(userId);
            if (userSubscriptions == null) {
                userSubscriptions = new ArrayList<>();
            }
            
            // 새 구독 추가
            userSubscriptions.add(newSubscription);
            jsonFileService.saveUserSubscriptions(userId, userSubscriptions);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "구독이 추가되었습니다.");
            response.put("subscription", newSubscription);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "구독 추가 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 구독 수정
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateSubscription(@PathVariable("id") Long subscriptionId,
                                                                  @RequestBody Map<String, Object> request,
                                                                  HttpSession session) {
        ResponseEntity<Map<String, Object>> authCheck = checkAuth(session);
        if (authCheck != null) {
            return authCheck;
        }
        
        Long userId = getUserId(session);
        
        try {
            List<Map<String, Object>> userSubscriptions = jsonFileService.readUserSubscriptions(userId);
            if (userSubscriptions == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "구독을 찾을 수 없습니다.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            // 구독 찾기
            Map<String, Object> foundSubscription = null;
            int index = -1;
            for (int i = 0; i < userSubscriptions.size(); i++) {
                Map<String, Object> sub = userSubscriptions.get(i);
                Object idObj = sub.get("id");
                long subId = idObj instanceof Number 
                    ? ((Number) idObj).longValue() 
                    : Long.parseLong(idObj.toString());
                
                if (subId == subscriptionId) {
                    foundSubscription = sub;
                    index = i;
                    break;
                }
            }
            
            if (foundSubscription == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "구독을 찾을 수 없습니다.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            // 업데이트
            foundSubscription.putAll(request);
            foundSubscription.put("updatedAt", java.time.LocalDateTime.now().toString());
            foundSubscription.put("id", subscriptionId); // ID는 변경하지 않음
            foundSubscription.put("userId", userId); // userId는 변경하지 않음
            
            userSubscriptions.set(index, foundSubscription);
            jsonFileService.saveUserSubscriptions(userId, userSubscriptions);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "구독이 수정되었습니다.");
            response.put("subscription", foundSubscription);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "구독 수정 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 구독 삭제 (취소)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteSubscription(@PathVariable("id") Long subscriptionId,
                                                                  HttpSession session) {
        ResponseEntity<Map<String, Object>> authCheck = checkAuth(session);
        if (authCheck != null) {
            return authCheck;
        }
        
        Long userId = getUserId(session);
        
        try {
            List<Map<String, Object>> userSubscriptions = jsonFileService.readUserSubscriptions(userId);
            if (userSubscriptions == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "구독을 찾을 수 없습니다.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            // 구독 찾기 및 삭제
            boolean removed = userSubscriptions.removeIf(sub -> {
                Object idObj = sub.get("id");
                long subId = idObj instanceof Number 
                    ? ((Number) idObj).longValue() 
                    : Long.parseLong(idObj.toString());
                return subId == subscriptionId;
            });
            
            if (!removed) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "구독을 찾을 수 없습니다.");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            // 또는 상태만 변경 (취소 처리)
            // Map<String, Object> foundSubscription = ...;
            // foundSubscription.put("status", "cancelled");
            // foundSubscription.put("updatedAt", java.time.LocalDateTime.now().toString());
            
            jsonFileService.saveUserSubscriptions(userId, userSubscriptions);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "구독이 삭제되었습니다.");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "구독 삭제 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 특정 구독 조회
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getSubscription(@PathVariable("id") Long subscriptionId,
                                                               HttpSession session) {
        ResponseEntity<Map<String, Object>> authCheck = checkAuth(session);
        if (authCheck != null) {
            return authCheck;
        }
        
        Long userId = getUserId(session);
        
        List<Map<String, Object>> userSubscriptions = jsonFileService.readUserSubscriptions(userId);
        if (userSubscriptions == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "구독을 찾을 수 없습니다.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        
        Map<String, Object> foundSubscription = null;
        for (Map<String, Object> sub : userSubscriptions) {
            Object idObj = sub.get("id");
            long subId = idObj instanceof Number 
                ? ((Number) idObj).longValue() 
                : Long.parseLong(idObj.toString());
            
            if (subId == subscriptionId) {
                foundSubscription = sub;
                break;
            }
        }
        
        if (foundSubscription == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "구독을 찾을 수 없습니다.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("subscription", foundSubscription);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * 구독 순서 업데이트 (Drag & Drop)
     */
    @PutMapping("/order")
    public ResponseEntity<Map<String, Object>> updateSubscriptionOrder(@RequestBody Map<String, Object> request,
                                                                        HttpSession session) {
        ResponseEntity<Map<String, Object>> authCheck = checkAuth(session);
        if (authCheck != null) {
            return authCheck;
        }
        
        Long userId = getUserId(session);
        
        try {
            @SuppressWarnings("unchecked")
            List<Object> orderedIdsObj = (List<Object>) request.get("orderedIds");
            if (orderedIdsObj == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "순서 정보가 필요합니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // ID를 Long으로 변환
            List<Long> orderedIds = new ArrayList<>();
            for (Object idObj : orderedIdsObj) {
                if (idObj instanceof Number) {
                    orderedIds.add(((Number) idObj).longValue());
                } else {
                    orderedIds.add(Long.parseLong(idObj.toString()));
                }
            }
            
            // 현재 구독 목록 가져오기
            List<Map<String, Object>> userSubscriptions = jsonFileService.readUserSubscriptions(userId);
            if (userSubscriptions == null) {
                userSubscriptions = new ArrayList<>();
            }
            
            // 순서대로 정렬된 새 리스트 생성
            List<Map<String, Object>> orderedSubscriptions = new ArrayList<>();
            for (Long id : orderedIds) {
                userSubscriptions.stream()
                    .filter(sub -> {
                        Object subIdObj = sub.get("id");
                        long subId = subIdObj instanceof Number 
                            ? ((Number) subIdObj).longValue() 
                            : Long.parseLong(subIdObj.toString());
                        return subId == id;
                    })
                    .findFirst()
                    .ifPresent(orderedSubscriptions::add);
            }
            
            // 순서가 지정되지 않은 나머지 구독 추가
            for (Map<String, Object> sub : userSubscriptions) {
                Object subIdObj = sub.get("id");
                long subId = subIdObj instanceof Number 
                    ? ((Number) subIdObj).longValue() 
                    : Long.parseLong(subIdObj.toString());
                
                if (!orderedIds.contains(subId)) {
                    orderedSubscriptions.add(sub);
                }
            }
            
            // 순서 정보를 각 구독에 저장 (선택사항)
            for (int i = 0; i < orderedSubscriptions.size(); i++) {
                orderedSubscriptions.get(i).put("displayOrder", i);
            }
            
            // 저장
            jsonFileService.saveUserSubscriptions(userId, orderedSubscriptions);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "구독 순서가 업데이트되었습니다.");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "순서 업데이트 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

