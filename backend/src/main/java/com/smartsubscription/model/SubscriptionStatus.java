package com.smartsubscription.model;

/**
 * 구독 상태 열거형
 */
public enum SubscriptionStatus {
    ACTIVE("활성"),
    PAUSED("일시정지"),
    CANCELLED("취소됨"),
    EXPIRED("만료됨");
    
    private final String displayName;
    
    SubscriptionStatus(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
}
