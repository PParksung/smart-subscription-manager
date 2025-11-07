package com.smartsubscription;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 스마트 구독 관리 금융앱 메인 애플리케이션
 * 
 * @author 홍길동
 * @version 1.0.0
 */
@SpringBootApplication
@EnableScheduling
public class SmartSubscriptionApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartSubscriptionApplication.class, args);
    }
}
