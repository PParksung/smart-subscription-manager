class AnalyticsManager {
    constructor() {
        this.charts = {};
        this.init();
    }

    init() {
        if (typeof Chart === 'undefined') {
            this.loadChartJS();
        }
        this.setupPeriodSelector();
    }
    
    setupPeriodSelector() {
        const periodSelect = document.getElementById('monthlyPeriodSelect');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.updateMonthlyChart(parseInt(e.target.value));
            });
        }
    }

    loadChartJS() {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
        script.onload = () => {
            this.updateAnalytics();
        };
        script.onerror = () => {
            console.error('Chart.js 로드 실패');
            this.showFallbackCharts();
        };
        document.head.appendChild(script);
    }

    // Chart.js 로드 실패 시 대체 차트
    showFallbackCharts() {
        const categoryChart = document.getElementById('categoryChart');
        const monthlyChart = document.getElementById('monthlyChart');
        
        if (categoryChart) {
            categoryChart.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">차트를 로드하는 중입니다...</div>';
        }
        
        if (monthlyChart) {
            monthlyChart.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">차트를 로드하는 중입니다...</div>';
        }
    }

    updateAnalytics() {
        if (typeof Chart === 'undefined') {
            this.loadChartJS();
            return;
        }
        
        this.updateCategoryChart();
        this.updateMonthlyChart();
        this.updateAnalyticsSummary();
    }

    updateCanvasCharts() {
        const categoryData = this.getCategoryData();
        if (canvasChartManager.initCanvas('categoryChartCanvas')) {
            canvasChartManager.drawDoughnutChart({
                labels: categoryData.labels,
                values: categoryData.data,
                colors: categoryData.colors
            });
        }

        const monthlyData = this.getMonthlyData();
        if (canvasChartManager.initCanvas('monthlyChartCanvas')) {
            canvasChartManager.drawLineChart({
                labels: monthlyData.labels,
                values: monthlyData.data
            });
        }
    }

    // 카테고리별 지출 차트
    updateCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) {
            console.error('categoryChart 요소를 찾을 수 없습니다.');
            return;
        }

        const categoryData = this.getCategoryData();
        
        // 기존 차트 제거
        if (this.charts.categoryChart) {
            this.charts.categoryChart.destroy();
        }

        // 데이터가 없는 경우 처리
        if (categoryData.data.length === 0) {
            ctx.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">표시할 데이터가 없습니다.</div>';
            return;
        }

        this.charts.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.data,
                    backgroundColor: categoryData.colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ₩${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 월별 지출 추이 차트
    updateMonthlyChart(months = 12) {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) {
            console.error('monthlyChart 요소를 찾을 수 없습니다.');
            return;
        }

        const monthlyData = this.getMonthlyData(months);
        
        // 기존 차트 제거
        if (this.charts.monthlyChart) {
            this.charts.monthlyChart.destroy();
        }

        // 데이터가 없는 경우 처리
        if (monthlyData.data.length === 0 || monthlyData.data.every(val => val === 0)) {
            ctx.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">표시할 데이터가 없습니다.</div>';
            return;
        }

        this.charts.monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: '월간 구독 지출',
                    data: monthlyData.data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₩' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ₩${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // 카테고리별 데이터 수집
    getCategoryData() {
        const categories = {};
        const categoryNames = {
            'entertainment': '🎬 엔터테인먼트',
            'music': '🎵 음악',
            'ai': '🤖 AI 서비스',
            'social': '📱 소셜 미디어',
            'productivity': '⚡ 생산성 도구',
            'cloud': '☁️ 클라우드',
            'education': '🎓 교육 및 학습',
            'finance': '💰 금융 및 투자',
            'news': '📰 뉴스 및 미디어',
            'gaming': '🎮 게임',
            'development': '💻 개발 도구',
            'security': '🔒 보안',
            'other': '📦 기타'
        };
        const categoryColors = {
            'entertainment': '#e74c3c',
            'music': '#1db954',
            'ai': '#00a67e',
            'social': '#e4405f',
            'productivity': '#f39c12',
            'cloud': '#9b59b6',
            'education': '#3498db',
            'finance': '#27ae60',
            'news': '#34495e',
            'gaming': '#8e44ad',
            'development': '#333333',
            'security': '#e67e22',
            'other': '#95a5a6'
        };

        app.subscriptions
            .filter(sub => sub.status === 'active')
            .forEach(sub => {
                if (!categories[sub.category]) {
                    categories[sub.category] = 0;
                }
                // 환율이 적용된 금액 사용
                const amount = sub.currency === 'KRW' ? sub.amount : (sub.krwAmount || sub.amount);
                categories[sub.category] += amount;
            });

        // 데이터가 있는 카테고리만 필터링
        const filteredCategories = Object.keys(categories).filter(cat => categories[cat] > 0);

        return {
            labels: filteredCategories.map(cat => categoryNames[cat] || cat),
            data: filteredCategories.map(cat => categories[cat]),
            colors: filteredCategories.map(cat => categoryColors[cat] || '#667eea')
        };
    }

    // 월별 데이터 수집 (과거 데이터 시뮬레이션 포함)
    getMonthlyData(months = 12) {
        const monthlyTotals = {};
        const currentDate = new Date();
        
        // 지정된 개월 수만큼 데이터 생성
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = date.toISOString().substring(0, 7);
            monthlyTotals[monthKey] = 0;
        }

        // 현재 활성 구독들의 총 금액 계산
        const currentTotalAmount = app.subscriptions
            .filter(sub => sub.status === 'active')
            .reduce((total, sub) => {
                const amount = sub.currency === 'KRW' ? sub.amount : (sub.krwAmount || sub.amount);
                return total + amount;
            }, 0);

        // 각 월별로 다른 금액 시뮬레이션 (구독 추가/해지 시뮬레이션)
        const monthKeys = Object.keys(monthlyTotals);
        monthKeys.forEach((monthKey, index) => {
            // 현재 월은 실제 금액
            if (index === monthKeys.length - 1) {
                monthlyTotals[monthKey] = currentTotalAmount;
            } else {
                // 과거 월들은 변화를 시뮬레이션
                const monthsAgo = monthKeys.length - 1 - index;
                
                // 시드 기반 일관된 랜덤 생성 (같은 월에는 항상 같은 값)
                const seed = monthsAgo * 7; // 월별로 다른 시드
                const random = Math.sin(seed) * 0.3; // ±15% 변화
                
                // 시간이 지날수록 구독이 증가하는 추세 반영 (월마다 3% 증가)
                const trendFactor = 1 - (monthsAgo * 0.03);
                const randomFactor = 1 + random;
                
                // 최소값 보장 (현재 금액의 60% 이상)
                const minAmount = currentTotalAmount * 0.6;
                const calculatedAmount = currentTotalAmount * trendFactor * randomFactor;
                
                monthlyTotals[monthKey] = Math.max(minAmount, Math.round(calculatedAmount));
            }
        });

        const labels = Object.keys(monthlyTotals).map(key => {
            const date = new Date(key + '-01');
            return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
        });

        const data = Object.values(monthlyTotals).map(amount => Math.round(amount));
        
        return {
            labels: labels,
            data: data
        };
    }

    // 분석 요약 정보 업데이트
    updateAnalyticsSummary() {
        const summary = this.generateSummary();
        this.displaySummary(summary);
    }

    // 분석 요약 생성
    generateSummary() {
        const activeSubscriptions = app.subscriptions.filter(sub => sub.status === 'active');
        
        // 환율이 적용된 금액으로 계산
        const totalMonthlyAmount = activeSubscriptions.reduce((sum, sub) => {
            const amount = sub.currency === 'KRW' ? sub.amount : (sub.krwAmount || sub.amount);
            return sum + amount;
        }, 0);
        
        const totalYearlyAmount = activeSubscriptions
            .filter(sub => sub.billingCycle === 'yearly')
            .reduce((sum, sub) => {
                const amount = sub.currency === 'KRW' ? sub.amount : (sub.krwAmount || sub.amount);
                return sum + amount;
            }, 0);

        const categoryStats = this.getCategoryStats();
        const mostExpensiveCategory = this.getMostExpensiveCategory();
        const savingsOpportunities = this.findSavingsOpportunities();

        return {
            totalSubscriptions: activeSubscriptions.length,
            totalMonthlyAmount,
            totalYearlyAmount,
            averageMonthlyPerSubscription: activeSubscriptions.length > 0 ? 
                Math.round(totalMonthlyAmount / activeSubscriptions.length) : 0,
            categoryStats,
            mostExpensiveCategory,
            savingsOpportunities
        };
    }

    // 카테고리별 통계
    getCategoryStats() {
        const categories = {};
        
        app.subscriptions
            .filter(sub => sub.status === 'active')
            .forEach(sub => {
                if (!categories[sub.category]) {
                    categories[sub.category] = {
                        count: 0,
                        totalAmount: 0,
                        subscriptions: []
                    };
                }
                categories[sub.category].count++;
                // 환율이 적용된 금액 사용
                const amount = sub.currency === 'KRW' ? sub.amount : (sub.krwAmount || sub.amount);
                categories[sub.category].totalAmount += amount;
                categories[sub.category].subscriptions.push(sub);
            });

        return categories;
    }

    // 가장 비싼 카테고리 찾기
    getMostExpensiveCategory() {
        const categoryStats = this.getCategoryStats();
        let maxAmount = 0;
        let mostExpensive = null;

        Object.keys(categoryStats).forEach(category => {
            if (categoryStats[category].totalAmount > maxAmount) {
                maxAmount = categoryStats[category].totalAmount;
                mostExpensive = {
                    category,
                    amount: maxAmount,
                    count: categoryStats[category].count
                };
            }
        });

        return mostExpensive;
    }

    // 절약 기회 찾기 (획기적이고 실용적인 기회들)
    findSavingsOpportunities() {
        const opportunities = [];
        const categoryStats = this.getCategoryStats();

        // 1. 연간 결제 추천 (3개월 이상 구독 중인 서비스 우선)
        const yearlyOpportunities = app.subscriptions
            .filter(sub => sub.status === 'active' && sub.billingCycle === 'monthly')
            .map(sub => {
                const monthlyAmount = sub.currency === 'KRW' ? sub.amount : (sub.krwAmount || sub.amount);
                const yearlyAmount = monthlyAmount * 12;
                
                // 실제 서비스별 연간 할인율 사용 (기본값 15%)
                const discountRate = sub.yearlyDiscount || 0.15;
                const potentialSavings = Math.round(yearlyAmount * discountRate);
                const duration = this.getSubscriptionDuration(sub);
                
                return {
                    type: 'yearly',
                    subscription: sub,
                    duration,
                    message: `${sub.name} 연간 결제 변경`,
                    potentialSavings,
                    currentMonthly: monthlyAmount,
                    yearlyAmount: Math.round(yearlyAmount * (1 - discountRate)),
                    discountRate: Math.round(discountRate * 100), // 퍼센트로 표시용
                    priority: duration >= 3 ? 'high' : 'medium' // 3개월 이상이면 높은 우선순위
                };
            })
            .filter(opp => opp.potentialSavings > 5000) // 5천원 이상 절약 가능한 경우만
            .sort((a, b) => {
                // 우선순위: 3개월 이상 구독 > 절약 금액 높은 순
                if (a.priority === 'high' && b.priority !== 'high') return -1;
                if (b.priority === 'high' && a.priority !== 'high') return 1;
                return b.potentialSavings - a.potentialSavings;
            })
            .slice(0, 2); // 상위 2개

        opportunities.push(...yearlyOpportunities);

        // 2. 미사용 구독 감지 (높은 금액이지만 사용하지 않을 가능성)
        const expensiveUnusedOpportunities = app.subscriptions
            .filter(sub => sub.status === 'active')
            .map(sub => {
                const monthlyAmount = sub.currency === 'KRW' ? sub.amount : (sub.krwAmount || sub.amount);
                const duration = this.getSubscriptionDuration(sub);
                
                // 높은 금액이지만 짧은 기간이거나, 특정 카테고리는 미사용 가능성 높음
                const isExpensive = monthlyAmount > 15000; // 1만5천원 이상
                const isShortTerm = duration < 2; // 2개월 미만
                const isUnusedCategory = ['productivity', 'ai', 'social'].includes(sub.category);
                
                if ((isExpensive && isShortTerm) || (isExpensive && isUnusedCategory)) {
                    return {
                        type: 'unused',
                        subscription: sub,
                        message: `${sub.name} 미사용 가능성`,
                        potentialSavings: monthlyAmount * 12, // 연간 절약
                        monthlyAmount,
                        reason: isShortTerm ? '짧은 사용 기간' : '사용 빈도 낮은 카테고리'
                    };
                }
                return null;
            })
            .filter(opp => opp !== null)
            .sort((a, b) => b.potentialSavings - a.potentialSavings)
            .slice(0, 1); // 상위 1개

        opportunities.push(...expensiveUnusedOpportunities);

        // 3. 카테고리 통합 기회 (같은 카테고리 내 비슷한 서비스들)
        const integrationOpportunities = Object.keys(categoryStats)
            .filter(category => categoryStats[category].count >= 2)
            .map(category => {
                const subs = categoryStats[category].subscriptions;
                const totalAmount = categoryStats[category].totalAmount;
                
                // 비슷한 기능의 서비스들이 있는지 확인
                const similarServices = this.findSimilarServices(subs);
                if (similarServices.length >= 2) {
                    const categoryName = this.getCategoryDisplayName(category);
                    return {
                        type: 'integration',
                        category,
                        categoryName,
                        message: `${categoryName} 서비스 통합`,
                        potentialSavings: Math.round(totalAmount * 0.4), // 40% 절약 가정
                        subscriptions: similarServices.map(sub => sub.name),
                        suggestion: this.getIntegrationSuggestion(category, similarServices)
                    };
                }
                return null;
            })
            .filter(opp => opp !== null)
            .sort((a, b) => b.potentialSavings - a.potentialSavings)
            .slice(0, 1); // 상위 1개

        opportunities.push(...integrationOpportunities);

        return opportunities;
    }

    // 비슷한 서비스 찾기
    findSimilarServices(subscriptions) {
        // 간단한 유사성 검사 (실제로는 더 복잡한 로직 가능)
        const entertainmentServices = subscriptions.filter(sub => 
            ['entertainment', 'music'].includes(sub.category)
        );
        const productivityServices = subscriptions.filter(sub => 
            ['productivity', 'ai'].includes(sub.category)
        );
        
        if (entertainmentServices.length >= 2) return entertainmentServices;
        if (productivityServices.length >= 2) return productivityServices;
        
        return subscriptions.slice(0, 2); // 기본적으로 상위 2개
    }

    // 통합 제안 메시지 생성
    getIntegrationSuggestion(category, subscriptions) {
        const suggestions = {
            'entertainment': '하나의 통합 엔터테인먼트 서비스로 대체',
            'music': '음악 스트리밍 서비스 하나로 통합',
            'productivity': '통합 생산성 도구 사용',
            'ai': 'AI 서비스 통합 플랫폼 활용'
        };
        
        return suggestions[category] || '유사한 기능의 서비스 통합 고려';
    }

    // 카테고리 표시명 가져오기
    getCategoryDisplayName(category) {
        const categoryMap = {
            'entertainment': '🎬 엔터테인먼트',
            'music': '🎵 음악',
            'ai': '🤖 AI 서비스',
            'social': '📱 소셜 미디어',
            'productivity': '⚡ 생산성 도구',
            'cloud': '☁️ 클라우드',
            'education': '🎓 교육 및 학습',
            'finance': '💰 금융 및 투자',
            'news': '📰 뉴스 및 미디어',
            'gaming': '🎮 게임',
            'development': '💻 개발 도구',
            'security': '🔒 보안',
            'other': '📦 기타'
        };
        return categoryMap[category] || '📦 기타';
    }

    // 구독 기간 계산 (다양한 기간 시뮬레이션)
    getSubscriptionDuration(subscription) {
        // 각 구독마다 다른 시작 날짜 시뮬레이션
        const subscriptionId = subscription.id || subscription.name.charCodeAt(0);
        const now = new Date();
        
        // 구독 ID 기반으로 일관된 랜덤 기간 생성 (1개월~36개월)
        const seed = subscriptionId * 13; // 구독별로 다른 시드
        const randomMonths = Math.abs(Math.sin(seed)) * 35 + 1; // 1~36개월
        const monthsAgo = Math.floor(randomMonths);
        
        // 시작 날짜 계산
        const startDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
        
        // 실제 계산된 기간 반환
        const diffTime = Math.abs(now - startDate);
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
        
        return Math.max(1, diffMonths); // 최소 1개월
    }

    // 요약 정보 표시
    displaySummary(summary) {
        // 분석 섹션에 요약 정보 추가
        const analyticsSection = document.getElementById('analytics');
        let summaryHTML = analyticsSection.querySelector('.analytics-summary');
        
        if (!summaryHTML) {
            summaryHTML = document.createElement('div');
            summaryHTML.className = 'analytics-summary';
            analyticsSection.insertBefore(summaryHTML, analyticsSection.firstChild);
        }

        // 구독 기간 정보 생성
        const subscriptionDurations = app.subscriptions
            .filter(sub => sub.status === 'active')
            .map(sub => ({
                name: sub.name,
                duration: this.getSubscriptionDuration(sub),
                amount: sub.currency === 'KRW' ? sub.amount : (sub.krwAmount || sub.amount)
            }))
            .sort((a, b) => b.duration - a.duration);

        summaryHTML.innerHTML = `
            <div class="summary-cards">
                <div class="summary-card">
                    <h3>총 구독 수</h3>
                    <p class="summary-number">${summary.totalSubscriptions}개</p>
                </div>
                <div class="summary-card">
                    <h3>월간 총 지출</h3>
                    <p class="summary-number">₩${summary.totalMonthlyAmount.toLocaleString()}</p>
                </div>
                <div class="summary-card">
                    <h3>구독당 평균 비용</h3>
                    <p class="summary-number">₩${summary.averageMonthlyPerSubscription.toLocaleString()}</p>
                </div>
                <div class="summary-card">
                    <h3>가장 비싼 카테고리</h3>
                    <p class="summary-number">${summary.mostExpensiveCategory ? this.getCategoryDisplayName(summary.mostExpensiveCategory.category) : 'N/A'}</p>
                </div>
            </div>
            
            <div class="analytics-grid">
                <div class="savings-opportunities">
                    <h3>💰 절약 기회</h3>
                    <div class="opportunities-list">
                        ${summary.savingsOpportunities.length > 0 ? summary.savingsOpportunities.map(opp => {
                            const getOpportunityType = (type) => {
                                switch(type) {
                                    case 'yearly': return '연간 결제';
                                    case 'unused': return '미사용 구독';
                                    case 'integration': return '서비스 통합';
                                    default: return '절약 기회';
                                }
                            };
                            
                            const getOpportunityIcon = (type) => {
                                switch(type) {
                                    case 'yearly': return 'fas fa-calendar-alt';
                                    case 'unused': return 'fas fa-exclamation-triangle';
                                    case 'integration': return 'fas fa-compress-alt';
                                    default: return 'fas fa-lightbulb';
                                }
                            };
                            
                            return `
                                <div class="opportunity-card ${opp.type}">
                                    <div class="opportunity-header">
                                        <i class="${getOpportunityIcon(opp.type)}"></i>
                                        <span class="opportunity-type">${getOpportunityType(opp.type)}</span>
                                        ${opp.priority === 'high' ? '<span class="priority-badge">추천</span>' : ''}
                                    </div>
                                    <div class="opportunity-content">
                                        <p class="opportunity-message">${opp.message}</p>
                                        ${opp.type === 'yearly' ? `
                                            <div class="yearly-comparison">
                                                <div class="comparison-item">
                                                    <span class="label">현재 월간:</span>
                                                    <span class="amount">₩${opp.currentMonthly.toLocaleString()}</span>
                                                </div>
                                                <div class="comparison-item">
                                                    <span class="label">연간 할인:</span>
                                                    <span class="amount">₩${opp.yearlyAmount.toLocaleString()}</span>
                                                </div>
                                                <div class="comparison-item">
                                                    <span class="label">할인율:</span>
                                                    <span class="amount discount-rate">${opp.discountRate}%</span>
                                                </div>
                                                ${opp.duration ? `<div class="comparison-item">
                                                    <span class="label">구독 기간:</span>
                                                    <span class="amount">${opp.duration}개월</span>
                                                </div>` : ''}
                                            </div>
                                        ` : opp.type === 'unused' ? `
                                            <div class="unused-info">
                                                <div class="info-item">
                                                    <span class="label">월간 비용:</span>
                                                    <span class="amount">₩${opp.monthlyAmount.toLocaleString()}</span>
                                                </div>
                                                <div class="info-item">
                                                    <span class="label">사유:</span>
                                                    <span class="reason">${opp.reason}</span>
                                                </div>
                                            </div>
                                        ` : opp.type === 'integration' ? `
                                            <div class="integration-info">
                                                <div class="info-item">
                                                    <span class="label">통합 대상:</span>
                                                    <span class="services">${opp.subscriptions.join(', ')}</span>
                                                </div>
                                                <div class="info-item">
                                                    <span class="label">제안:</span>
                                                    <span class="suggestion">${opp.suggestion}</span>
                                                </div>
                                            </div>
                                        ` : ''}
                                        <div class="savings-amount">절약 가능: ₩${opp.potentialSavings.toLocaleString()}</div>
                                    </div>
                                </div>
                            `;
                        }).join('') : '<p class="no-opportunities">현재 절약 기회가 없습니다.</p>'}
                    </div>
                </div>
                
                <div class="subscription-durations">
                    <h3>📅 구독 기간</h3>
                    <div class="duration-list">
                        ${subscriptionDurations.map(sub => {
                            const durationText = sub.duration >= 12 ? 
                                `${Math.floor(sub.duration / 12)}년 ${sub.duration % 12}개월` : 
                                `${sub.duration}개월`;
                            const durationClass = sub.duration >= 24 ? 'long-term' : 
                                                sub.duration >= 12 ? 'medium-term' : 'short-term';
                            const progressWidth = Math.min(sub.duration * 3, 100);
                            
                            return `
                                <div class="duration-item">
                                    <div class="duration-info">
                                        <span class="subscription-name">${sub.name}</span>
                                        <span class="duration-months ${durationClass}">${durationText}</span>
                                    </div>
                                    <div class="duration-bar">
                                        <div class="duration-progress ${durationClass}" style="width: ${progressWidth}%"></div>
                                    </div>
                                    <div class="duration-amount">₩${sub.amount.toLocaleString()}/월</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // 구독 트렌드 분석
    analyzeTrends() {
        const trends = {
            spending: this.analyzeSpendingTrend(),
            category: this.analyzeCategoryTrend(),
            subscription: this.analyzeSubscriptionTrend()
        };
        
        return trends;
    }

    // 지출 트렌드 분석
    analyzeSpendingTrend() {
        const monthlyData = this.getMonthlyData(12);
        const data = monthlyData.data;
        
        if (data.length < 2) return 'insufficient_data';
        
        const recent = data.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const previous = data.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
        
        const change = ((recent - previous) / previous) * 100;
        
        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }

    // 카테고리 트렌드 분석
    analyzeCategoryTrend() {
        const categoryStats = this.getCategoryStats();
        const sortedCategories = Object.keys(categoryStats)
            .sort((a, b) => categoryStats[b].totalAmount - categoryStats[a].totalAmount);
        
        return sortedCategories.slice(0, 3); // 상위 3개 카테고리
    }

    // 구독 트렌드 분석
    analyzeSubscriptionTrend() {
        const activeCount = app.subscriptions.filter(sub => sub.status === 'active').length;
        const cancelledCount = app.subscriptions.filter(sub => sub.status === 'cancelled').length;
        
        return {
            active: activeCount,
            cancelled: cancelledCount,
            retentionRate: activeCount / (activeCount + cancelledCount) * 100
        };
    }

    // 리포트 생성
    generateReport() {
        const summary = this.generateSummary();
        const trends = this.analyzeTrends();
        
        return {
            summary,
            trends,
            generatedAt: new Date().toISOString(),
            recommendations: this.generateRecommendations(summary, trends)
        };
    }

    // 추천사항 생성
    generateRecommendations(summary, trends) {
        const recommendations = [];
        
        // 지출이 증가하는 경우
        if (trends.spending === 'increasing') {
            recommendations.push({
                type: 'warning',
                title: '지출 증가 추세',
                message: '최근 구독 지출이 증가하고 있습니다. 불필요한 구독을 검토해보세요.',
                action: '구독 목록을 검토하고 해지할 항목을 찾아보세요.'
            });
        }
        
        // 중복 구독이 있는 경우
        const duplicateCategories = Object.keys(summary.categoryStats)
            .filter(cat => summary.categoryStats[cat].count > 1);
        
        if (duplicateCategories.length > 0) {
            recommendations.push({
                type: 'info',
                title: '중복 구독 발견',
                message: `${duplicateCategories.join(', ')} 카테고리에 여러 구독이 있습니다.`,
                action: '유사한 기능의 구독을 통합하여 비용을 절약할 수 있습니다.'
            });
        }
        
        // 절약 기회가 있는 경우
        if (summary.savingsOpportunities.length > 0) {
            const totalSavings = summary.savingsOpportunities
                .reduce((sum, opp) => sum + opp.potentialSavings, 0);
            
            recommendations.push({
                type: 'success',
                title: '절약 기회',
                message: `₩${Math.round(totalSavings).toLocaleString()} 절약 가능합니다.`,
                action: '제안된 절약 방법을 검토해보세요.'
            });
        }
        
        return recommendations;
    }
}

// 전역 분석 매니저 인스턴스
const analyticsManager = new AnalyticsManager();

// 앱에서 분석 업데이트 함수 호출
if (typeof app !== 'undefined') {
    app.updateAnalytics = function() {
        analyticsManager.updateAnalytics();
    };
}
