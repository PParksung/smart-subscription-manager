package com.smartsubscription.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * 환율 API 프록시 컨트롤러
 * 외부 환율 API를 호출하여 CORS 문제를 해결
 */
@RestController
@RequestMapping("/exchange-rates")
@CrossOrigin(origins = {"http://localhost:8000", "http://localhost:8081", "http://127.0.0.1:5500"}, 
             allowedHeaders = "*", 
             allowCredentials = "true")
public class ExchangeRateController {
    
    private final RestTemplate restTemplate;
    
    public ExchangeRateController() {
        this.restTemplate = new RestTemplate();
    }
    
    /**
     * 환율 정보 조회
     * USD를 base로 하여 1 USD = X KRW 형식으로 반환
     */
    @GetMapping
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> getExchangeRates() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // ExchangeRate-API 호출 (USD base)
            String url = "https://api.exchangerate-api.com/v4/latest/USD";
            Map<String, Object> apiResponse = restTemplate.getForObject(url, Map.class);
            
            if (apiResponse == null) {
                throw new Exception("API 응답이 null입니다.");
            }
            
            // 응답 데이터 가공
            Object ratesObj = apiResponse.get("rates");
            Map<String, Object> rates = null;
            if (ratesObj instanceof Map) {
                rates = (Map<String, Object>) ratesObj;
            }
            
            Map<String, Double> processedRates = new HashMap<>();
            processedRates.put("USD", 1.0);
            processedRates.put("KRW", rates != null && rates.containsKey("KRW") ? 
                getDoubleValue(rates.get("KRW"), 1350.0) : 1350.0);
            processedRates.put("EUR", rates != null && rates.containsKey("EUR") ? 
                getDoubleValue(rates.get("EUR"), 0.92) : 0.92);
            processedRates.put("JPY", rates != null && rates.containsKey("JPY") ? 
                getDoubleValue(rates.get("JPY"), 150.0) : 150.0);
            processedRates.put("CNY", rates != null && rates.containsKey("CNY") ? 
                getDoubleValue(rates.get("CNY"), 7.2) : 7.2);
            
            response.put("success", true);
            response.put("base", "USD");
            response.put("date", apiResponse.get("date"));
            response.put("rates", processedRates);
            response.put("source", "external_api");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            // 폴백 데이터 반환
            Map<String, Double> fallbackRates = new HashMap<>();
            fallbackRates.put("USD", 1.0);
            fallbackRates.put("KRW", 1350.0);
            fallbackRates.put("EUR", 0.92);
            fallbackRates.put("JPY", 150.0);
            fallbackRates.put("CNY", 7.2);
            
            response.put("success", true);
            response.put("base", "USD");
            response.put("date", java.time.LocalDate.now().toString());
            response.put("rates", fallbackRates);
            response.put("source", "fallback");
            
            return ResponseEntity.ok(response);
        }
    }
    
    /**
     * Object를 Double로 안전하게 변환
     */
    private Double getDoubleValue(Object value, Double defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}

