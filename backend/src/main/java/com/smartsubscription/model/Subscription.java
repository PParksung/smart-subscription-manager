package com.smartsubscription.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 구독 모델 (JSON 파일 기반)
 * JPA 어노테이션 제거 - JSON 파일만 사용
 */
public class Subscription {
    
    private Long id;
    private String name;
    private String description;
    private SubscriptionCategory category;
    private BigDecimal amount;
    private String currency = "KRW";
    private BillingCycle billingCycle;
    private LocalDate nextPaymentDate;
    private LocalDate lastPaymentDate;
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;
    private String serviceIcon;
    private String serviceColor;
    private String cancellationUrl;
    private Boolean autoDetected = false;
    private LocalDate pausedUntil;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // 기본 생성자
    public Subscription() {}
    
    // 생성자
    public Subscription(String name, SubscriptionCategory category, BigDecimal amount, 
                       BillingCycle billingCycle, LocalDate nextPaymentDate) {
        this.name = name;
        this.category = category;
        this.amount = amount;
        this.billingCycle = billingCycle;
        this.nextPaymentDate = nextPaymentDate;
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
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public SubscriptionCategory getCategory() {
        return category;
    }
    
    public void setCategory(SubscriptionCategory category) {
        this.category = category;
    }
    
    public BigDecimal getAmount() {
        return amount;
    }
    
    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
    
    public String getCurrency() {
        return currency;
    }
    
    public void setCurrency(String currency) {
        this.currency = currency;
    }
    
    public BillingCycle getBillingCycle() {
        return billingCycle;
    }
    
    public void setBillingCycle(BillingCycle billingCycle) {
        this.billingCycle = billingCycle;
    }
    
    public LocalDate getNextPaymentDate() {
        return nextPaymentDate;
    }
    
    public void setNextPaymentDate(LocalDate nextPaymentDate) {
        this.nextPaymentDate = nextPaymentDate;
    }
    
    public LocalDate getLastPaymentDate() {
        return lastPaymentDate;
    }
    
    public void setLastPaymentDate(LocalDate lastPaymentDate) {
        this.lastPaymentDate = lastPaymentDate;
    }
    
    public SubscriptionStatus getStatus() {
        return status;
    }
    
    public void setStatus(SubscriptionStatus status) {
        this.status = status;
    }
    
    public String getServiceIcon() {
        return serviceIcon;
    }
    
    public void setServiceIcon(String serviceIcon) {
        this.serviceIcon = serviceIcon;
    }
    
    public String getServiceColor() {
        return serviceColor;
    }
    
    public void setServiceColor(String serviceColor) {
        this.serviceColor = serviceColor;
    }
    
    public String getCancellationUrl() {
        return cancellationUrl;
    }
    
    public void setCancellationUrl(String cancellationUrl) {
        this.cancellationUrl = cancellationUrl;
    }
    
    public Boolean getAutoDetected() {
        return autoDetected;
    }
    
    public void setAutoDetected(Boolean autoDetected) {
        this.autoDetected = autoDetected;
    }
    
    public LocalDate getPausedUntil() {
        return pausedUntil;
    }
    
    public void setPausedUntil(LocalDate pausedUntil) {
        this.pausedUntil = pausedUntil;
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
