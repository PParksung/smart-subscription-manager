package com.smartsubscription.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.type.CollectionType;
import com.fasterxml.jackson.databind.type.TypeFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * JSON 파일 기반 데이터 저장 및 검색 서비스
 */
@Service
public class JsonFileService {
    
    private static final String DATA_DIR = "data";
    private static final String USERS_FILE = DATA_DIR + "/users.json";
    private static final String SUBSCRIPTIONS_FILE = DATA_DIR + "/subscriptions.json";
    
    private final ObjectMapper objectMapper;
    
    public JsonFileService() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.findAndRegisterModules(); // LocalDate 등 지원
        
        // 날짜 직렬화 설정: yyyy-MM-dd 형식으로 통일 (타임존 문제 방지)
        com.fasterxml.jackson.databind.SerializationFeature writeDatesAsTimestamps = 
            com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS;
        this.objectMapper.disable(writeDatesAsTimestamps);
        
        // data 디렉토리 생성
        try {
            Files.createDirectories(Paths.get(DATA_DIR));
        } catch (IOException e) {
            System.err.println("데이터 디렉토리 생성 실패: " + e.getMessage());
        }
    }
    
    /**
     * 사용자 목록 읽기
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> readUsers() {
        return readJsonFile(USERS_FILE, List.class);
    }
    
    /**
     * 사용자 목록 저장
     */
    public void saveUsers(List<Map<String, Object>> users) {
        writeJsonFile(USERS_FILE, users);
    }
    
    /**
     * 구독 목록 읽기
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> readSubscriptions() {
        return readJsonFile(SUBSCRIPTIONS_FILE, List.class);
    }
    
    /**
     * 구독 목록 저장
     */
    public void saveSubscriptions(List<Map<String, Object>> subscriptions) {
        writeJsonFile(SUBSCRIPTIONS_FILE, subscriptions);
    }
    
    /**
     * 특정 사용자의 구독 목록 읽기
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> readUserSubscriptions(Long userId) {
        List<Map<String, Object>> allSubscriptions = readSubscriptions();
        if (allSubscriptions == null) {
            return new ArrayList<>();
        }
        
        List<Map<String, Object>> userSubscriptions = new ArrayList<>();
        for (Map<String, Object> subscription : allSubscriptions) {
            Object userIdObj = subscription.get("userId");
            if (userIdObj != null) {
                // Long 또는 Integer로 변환하여 비교
                long subUserId = userIdObj instanceof Number 
                    ? ((Number) userIdObj).longValue() 
                    : Long.parseLong(userIdObj.toString());
                
                if (subUserId == userId) {
                    userSubscriptions.add(subscription);
                }
            }
        }
        return userSubscriptions;
    }
    
    /**
     * 특정 사용자의 구독 목록 저장
     */
    @SuppressWarnings("unchecked")
    public void saveUserSubscriptions(Long userId, List<Map<String, Object>> userSubscriptions) {
        List<Map<String, Object>> allSubscriptions = readSubscriptions();
        if (allSubscriptions == null) {
            allSubscriptions = new ArrayList<>();
        }
        
        // 기존 사용자 구독 제거
        allSubscriptions.removeIf(sub -> {
            Object userIdObj = sub.get("userId");
            if (userIdObj != null) {
                long subUserId = userIdObj instanceof Number 
                    ? ((Number) userIdObj).longValue() 
                    : Long.parseLong(userIdObj.toString());
                return subUserId == userId;
            }
            return false;
        });
        
        // 새 구독 목록 추가
        allSubscriptions.addAll(userSubscriptions);
        
        saveSubscriptions(allSubscriptions);
    }
    
    /**
     * JSON 파일 읽기
     */
    @SuppressWarnings("unchecked")
    private <T> T readJsonFile(String filePath, Class<T> valueType) {
        File file = new File(filePath);
        
        if (!file.exists()) {
            if (valueType == List.class) {
                return (T) new ArrayList<>();
            }
            return null;
        }
        
        try {
            if (valueType == List.class) {
                TypeFactory typeFactory = objectMapper.getTypeFactory();
                CollectionType listType = typeFactory.constructCollectionType(List.class, Map.class);
                return objectMapper.readValue(file, listType);
            }
            return objectMapper.readValue(file, valueType);
        } catch (IOException e) {
            System.err.println("JSON 파일 읽기 실패: " + filePath + " - " + e.getMessage());
            if (valueType == List.class) {
                return (T) new ArrayList<>();
            }
            return null;
        }
    }
    
    /**
     * JSON 파일 저장
     */
    private void writeJsonFile(String filePath, Object data) {
        try {
            File file = new File(filePath);
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(file, data);
        } catch (IOException e) {
            System.err.println("JSON 파일 저장 실패: " + filePath + " - " + e.getMessage());
            throw new RuntimeException("데이터 저장 실패", e);
        }
    }
}

