package com.smartsubscription.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 거래 내역 모델 (JSON 파일 기반)
 * JPA 어노테이션 제거 - JSON 파일만 사용
 */
public class Transaction {
    
    private Long id;
    private BigDecimal amount;
    private String currency = "KRW";
    private LocalDateTime transactionDate;
    private String description;
    private String merchantName;
    private TransactionType transactionType;
    private Boolean isSubscription = false;
    private Long subscriptionId;
    private LocalDateTime createdAt;
    
    // 기본 생성자
    public Transaction() {}
    
    // 생성자
    public Transaction(BigDecimal amount, String description, String merchantName, 
                      TransactionType transactionType) {
        this.amount = amount;
        this.description = description;
        this.merchantName = merchantName;
        this.transactionType = transactionType;
        this.transactionDate = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
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
    
    public LocalDateTime getTransactionDate() {
        return transactionDate;
    }
    
    public void setTransactionDate(LocalDateTime transactionDate) {
        this.transactionDate = transactionDate;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getMerchantName() {
        return merchantName;
    }
    
    public void setMerchantName(String merchantName) {
        this.merchantName = merchantName;
    }
    
    public TransactionType getTransactionType() {
        return transactionType;
    }
    
    public void setTransactionType(TransactionType transactionType) {
        this.transactionType = transactionType;
    }
    
    public Boolean getIsSubscription() {
        return isSubscription;
    }
    
    public void setIsSubscription(Boolean isSubscription) {
        this.isSubscription = isSubscription;
    }
    
    public Long getSubscriptionId() {
        return subscriptionId;
    }
    
    public void setSubscriptionId(Long subscriptionId) {
        this.subscriptionId = subscriptionId;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
