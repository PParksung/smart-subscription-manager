package com.smartsubscription.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * 프론트엔드 디버깅 로그를 서버 터미널에 출력하는 컨트롤러
 */
@RestController
@RequestMapping("/api/debug")
@CrossOrigin(origins = {"http://localhost:8000", "http://localhost:8081", "http://127.0.0.1:5500"}, 
             allowedHeaders = "*", 
             allowCredentials = "true")
public class DebugController {
    
    /**
     * 프론트엔드에서 디버그 로그를 받아 서버 터미널에 출력
     */
    @PostMapping("/log")
    public ResponseEntity<Map<String, Object>> log(@RequestBody Map<String, Object> request) {
        String level = (String) request.getOrDefault("level", "INFO");
        String message = (String) request.getOrDefault("message", "");
        Object data = request.get("data");
        
        // 타임스탬프 생성
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        
        // 서버 터미널에 출력
        System.out.println("=".repeat(80));
        System.out.println("[" + timestamp + "] [FRONTEND] [" + level + "] " + message);
        
        if (data != null) {
            System.out.println("데이터:");
            if (data instanceof Map) {
                ((Map<?, ?>) data).forEach((key, value) -> {
                    System.out.println("  " + key + ": " + value);
                });
            } else if (data instanceof String) {
                System.out.println("  " + data);
            } else {
                System.out.println("  " + data.toString());
            }
        }
        System.out.println("=".repeat(80));
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "로그가 서버에 기록되었습니다.");
        
        return ResponseEntity.ok(response);
    }
}

