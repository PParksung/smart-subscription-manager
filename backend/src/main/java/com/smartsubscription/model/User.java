package com.smartsubscription.model;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 사용자 모델 (JSON 파일 기반)
 * JPA 어노테이션 제거 - JSON 파일만 사용
 */
public class User {
    
    private Long id;
    private String name;
    private String email;
    private String password;
    private String phoneNumber;
    private Boolean notificationEnabled = true;
    private Boolean emailNotification = false;
    private Boolean pushNotification = true;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // 기본 생성자
    public User() {}
    
    // 생성자
    public User(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPassword() {
        return password;
    }
    
    public void setPassword(String password) {
        this.password = password;
    }
    
    public String getPhoneNumber() {
        return phoneNumber;
    }
    
    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }
    
    public Boolean getNotificationEnabled() {
        return notificationEnabled;
    }
    
    public void setNotificationEnabled(Boolean notificationEnabled) {
        this.notificationEnabled = notificationEnabled;
    }
    
    public Boolean getEmailNotification() {
        return emailNotification;
    }
    
    public void setEmailNotification(Boolean emailNotification) {
        this.emailNotification = emailNotification;
    }
    
    public Boolean getPushNotification() {
        return pushNotification;
    }
    
    public void setPushNotification(Boolean pushNotification) {
        this.pushNotification = pushNotification;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
