package com.smartsubscription.model;

/**
 * 구독 카테고리 열거형
 */
public enum SubscriptionCategory {
    ENTERTAINMENT("엔터테인먼트"),
    MUSIC("음악"),
    NEWS("뉴스"),
    PRODUCTIVITY("생산성"),
    CLOUD("클라우드"),
    FITNESS("피트니스"),
    EDUCATION("교육"),
    GAMING("게임"),
    SHOPPING("쇼핑"),
    OTHER("기타");
    
    private final String displayName;
    
    SubscriptionCategory(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
}
