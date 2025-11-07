package com.smartsubscription.controller;

import com.smartsubscription.service.JsonFileService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 인증 관련 REST API 컨트롤러
 * Session 기반 인증 사용
 */
@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = {"http://localhost:8000", "http://localhost:8081", "http://127.0.0.1:5500"}, 
             allowedHeaders = "*", 
             allowCredentials = "true")
public class AuthController {
    
    private final JsonFileService jsonFileService;
    
    public AuthController(JsonFileService jsonFileService) {
        this.jsonFileService = jsonFileService;
    }
    
    /**
     * 회원가입
     */
    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signup(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String name = (String) request.get("name");
            String email = (String) request.get("email");
            String password = (String) request.get("password");
            
            // 유효성 검사
            if (name == null || name.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "이름을 입력해주세요.");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (email == null || email.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "이메일을 입력해주세요.");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (password == null || password.length() < 8) {
                response.put("success", false);
                response.put("message", "비밀번호는 최소 8자 이상이어야 합니다.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 기존 사용자 확인
            List<Map<String, Object>> users = jsonFileService.readUsers();
            if (users == null) {
                users = new ArrayList<>();
            }
            
            // 이메일 중복 확인
            for (Map<String, Object> user : users) {
                if (email.equals(user.get("email"))) {
                    response.put("success", false);
                    response.put("message", "이미 사용 중인 이메일입니다.");
                    return ResponseEntity.badRequest().body(response);
                }
            }
            
            // 새 사용자 생성
            Long userId = System.currentTimeMillis(); // 간단한 ID 생성
            Map<String, Object> newUser = new HashMap<>();
            newUser.put("id", userId);
            newUser.put("name", name);
            newUser.put("email", email);
            newUser.put("password", password); // 실제로는 암호화해야 함
            newUser.put("createdAt", java.time.LocalDateTime.now().toString());
            
            users.add(newUser);
            jsonFileService.saveUsers(users);
            
            response.put("success", true);
            response.put("message", "회원가입이 완료되었습니다.");
            response.put("user", Map.of(
                "id", userId,
                "name", name,
                "email", email
            ));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "회원가입 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 로그인
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, Object> request, 
                                                      HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String email = (String) request.get("email");
            String password = (String) request.get("password");
            
            // 유효성 검사
            if (email == null || email.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "이메일을 입력해주세요.");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (password == null || password.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "비밀번호를 입력해주세요.");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 사용자 찾기
            List<Map<String, Object>> users = jsonFileService.readUsers();
            if (users == null) {
                response.put("success", false);
                response.put("message", "이메일 또는 비밀번호가 올바르지 않습니다.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            Map<String, Object> foundUser = null;
            for (Map<String, Object> user : users) {
                if (email.equals(user.get("email")) && password.equals(user.get("password"))) {
                    foundUser = user;
                    break;
                }
            }
            
            if (foundUser == null) {
                response.put("success", false);
                response.put("message", "이메일 또는 비밀번호가 올바르지 않습니다.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Session에 사용자 정보 저장
            Long userId = ((Number) foundUser.get("id")).longValue();
            session.setAttribute("userId", userId);
            session.setAttribute("userEmail", foundUser.get("email"));
            session.setAttribute("userName", foundUser.get("name"));
            
            System.out.println("로그인 성공 - userId: " + userId + ", 세션 ID: " + session.getId());
            System.out.println("세션 속성 확인: userId=" + session.getAttribute("userId"));
            
            response.put("success", true);
            response.put("message", "로그인되었습니다.");
            response.put("user", Map.of(
                "id", userId,
                "name", foundUser.get("name"),
                "email", foundUser.get("email")
            ));
            response.put("sessionId", session.getId());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "로그인 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 로그아웃
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        session.invalidate();
        
        response.put("success", true);
        response.put("message", "로그아웃되었습니다.");
        return ResponseEntity.ok(response);
    }
    
    /**
     * 현재 세션 정보 확인
     */
    @GetMapping("/session")
    public ResponseEntity<Map<String, Object>> getSession(HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        if (session == null) {
            System.out.println("세션 체크: 세션이 null입니다.");
            response.put("authenticated", false);
            return ResponseEntity.ok(response);
        }
        
        Object userId = session.getAttribute("userId");
        System.out.println("세션 체크 - 세션 ID: " + session.getId() + ", userId: " + userId);
        
        if (userId == null) {
            System.out.println("세션에 userId가 없습니다.");
            response.put("authenticated", false);
            return ResponseEntity.ok(response);
        }
        
        response.put("authenticated", true);
        response.put("userId", userId);
        response.put("userEmail", session.getAttribute("userEmail"));
        response.put("userName", session.getAttribute("userName"));
        response.put("sessionId", session.getId());
        
        System.out.println("세션 확인 성공 - userId: " + userId);
        
        return ResponseEntity.ok(response);
    }
}

