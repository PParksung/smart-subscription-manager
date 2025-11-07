package com.smartsubscription.model;

/**
 * 거래 유형 열거형
 */
public enum TransactionType {
    DEBIT("출금"),
    CREDIT("입금"),
    TRANSFER("이체"),
    SUBSCRIPTION("구독결제"),
    REFUND("환불");
    
    private final String displayName;
    
    TransactionType(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
}
