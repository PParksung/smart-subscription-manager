package com.smartsubscription.model;

/**
 * 결제 주기 열거형
 */
public enum BillingCycle {
    MONTHLY("월간"),
    YEARLY("연간"),
    WEEKLY("주간"),
    QUARTERLY("분기"),
    BIANNUAL("반년");
    
    private final String displayName;
    
    BillingCycle(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
}
