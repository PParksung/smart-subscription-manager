// 구독 관리 기능
class SubscriptionManager {
    constructor() {
        this.subscriptionTemplates = this.initializeTemplates();
        this.notificationSettings = this.loadNotificationSettings();
    }

    // 구독 서비스 템플릿 초기화
    initializeTemplates() {
        return {
            'netflix': {
                name: '넷플릭스',
                category: 'entertainment',
                icon: 'fas fa-tv',
                color: '#e50914',
                description: '영화 및 드라마 스트리밍 서비스',
                cancellationUrl: 'https://www.netflix.com/youraccount',
                cancellationSteps: [
                    '넷플릭스 계정에 로그인',
                    '계정 설정으로 이동',
                    '구독 취소 선택'
                ]
            },
            'youtube': {
                name: '유튜브 프리미엄',
                category: 'entertainment',
                icon: 'fab fa-youtube',
                color: '#ff0000',
                description: '광고 없는 유튜브 시청',
                cancellationUrl: 'https://www.youtube.com/premium',
                cancellationSteps: [
                    '유튜브 계정에 로그인',
                    '구독 관리로 이동',
                    '구독 취소 선택'
                ]
            },
            'spotify': {
                name: '스포티파이',
                category: 'music',
                icon: 'fab fa-spotify',
                color: '#1db954',
                description: '음악 스트리밍 서비스',
                cancellationUrl: 'https://www.spotify.com/account/subscription/',
                cancellationSteps: [
                    '스포티파이 계정에 로그인',
                    '구독 관리로 이동',
                    '구독 취소 선택'
                ]
            },
            'amazon': {
                name: '아마존 프라임',
                category: 'entertainment',
                icon: 'fab fa-amazon',
                color: '#ff9900',
                description: '무료 배송 및 프라임 비디오',
                cancellationUrl: 'https://www.amazon.com/gp/primecentral',
                cancellationSteps: [
                    '아마존 계정에 로그인',
                    '프라임 멤버십 관리로 이동',
                    '구독 취소 선택'
                ]
            },
            'google': {
                name: '구글 드라이브',
                category: 'cloud',
                icon: 'fab fa-google-drive',
                color: '#4285f4',
                description: '클라우드 저장소',
                cancellationUrl: 'https://one.google.com/storage',
                cancellationSteps: [
                    '구글 계정에 로그인',
                    '구독 관리로 이동',
                    '구독 취소 선택'
                ]
            }
        };
    }

    // 알림 설정 로드
    loadNotificationSettings() {
        const saved = localStorage.getItem('notificationSettings');
        return saved ? JSON.parse(saved) : {
            enabled: true,
            daysBeforePayment: [7, 3, 1],
            emailNotifications: false,
            pushNotifications: true
        };
    }

    // 알림 설정 저장
    saveNotificationSettings() {
        localStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));
    }



    // 구독 해지 안내
    showCancellationGuide(subscription) {
        const template = this.findTemplateByName(subscription.name);
        if (!template) {
            app.showNotification('해지 방법을 찾을 수 없습니다.', 'error');
            return;
        }

        const content = `
            <div class="cancellation-guide">
                <h3>${subscription.name} 구독 해지 방법</h3>
                <div class="cancellation-steps">
                    ${template.cancellationSteps.map((step, index) => `
                        <div class="step">
                            <span class="step-number">${index + 1}</span>
                            <span class="step-text">${step}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="cancellation-actions">
                    <button class="btn btn-primary" onclick="subscriptionManager.openCancellationUrl('${template.cancellationUrl}')">
                        <i class="fas fa-external-link-alt"></i>
                        해지 페이지로 이동
                    </button>
                    <button class="btn btn-outline" onclick="app.hideModal()">
                        나중에 하기
                    </button>
                </div>
            </div>
        `;

        app.showModal('구독 해지 안내', content);
    }

    // 템플릿 이름으로 찾기
    findTemplateByName(name) {
        return Object.values(this.subscriptionTemplates).find(template => 
            template.name === name
        );
    }

    // 해지 URL 열기
    openCancellationUrl(url) {
        window.open(url, '_blank');
        app.hideModal();
    }

    // 구독 일시정지
    pauseSubscription(subscriptionId, duration) {
        const subscription = app.subscriptions.find(sub => sub.id === subscriptionId);
        if (!subscription) return;

        subscription.status = 'paused';
        subscription.pausedUntil = new Date();
        subscription.pausedUntil.setDate(subscription.pausedUntil.getDate() + duration);

        app.saveData();
        app.updateDashboard();
        app.showNotification('구독이 일시정지되었습니다.', 'success');
    }

    // 구독 재개
    resumeSubscription(subscriptionId) {
        const subscription = app.subscriptions.find(sub => sub.id === subscriptionId);
        if (!subscription) return;

        subscription.status = 'active';
        delete subscription.pausedUntil;

        app.saveData();
        app.updateDashboard();
        app.showNotification('구독이 재개되었습니다.', 'success');
    }

    // 구독 복제
    duplicateSubscription(subscriptionId) {
        const original = app.subscriptions.find(sub => sub.id === subscriptionId);
        if (!original) return;

        const duplicate = {
            ...original,
            id: Date.now(),
            name: original.name + ' (복사본)',
            status: 'active',
            nextPaymentDate: new Date().toISOString().split('T')[0]
        };

        app.subscriptions.push(duplicate);
        app.saveData();
        app.updateDashboard();
        app.showNotification('구독이 복제되었습니다.', 'success');
    }

    // 구독 내보내기
    exportSubscriptions() {
        const data = {
            subscriptions: app.subscriptions,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `subscriptions_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        app.showNotification('구독 데이터가 내보내기되었습니다.', 'success');
    }

    // 구독 가져오기
    importSubscriptions(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.subscriptions && Array.isArray(data.subscriptions)) {
                    app.subscriptions = data.subscriptions;
                    app.saveData();
                    app.updateDashboard();
                    app.showNotification('구독 데이터가 가져오기되었습니다.', 'success');
                } else {
                    throw new Error('잘못된 파일 형식입니다.');
                }
            } catch (error) {
                app.showNotification('파일을 읽는 중 오류가 발생했습니다.', 'error');
            }
        };
        reader.readAsText(file);
    }

    // 구독 검색
    searchSubscriptions(query) {
        const searchTerm = query.toLowerCase();
        return app.subscriptions.filter(sub => 
            sub.name.toLowerCase().includes(searchTerm) ||
            sub.description.toLowerCase().includes(searchTerm) ||
            sub.category.toLowerCase().includes(searchTerm)
        );
    }

    // 구독 필터링
    filterSubscriptions(filters) {
        let filtered = app.subscriptions;

        if (filters.status) {
            filtered = filtered.filter(sub => sub.status === filters.status);
        }

        if (filters.category) {
            filtered = filtered.filter(sub => sub.category === filters.category);
        }

        if (filters.billingCycle) {
            filtered = filtered.filter(sub => sub.billingCycle === filters.billingCycle);
        }

        if (filters.amountRange) {
            filtered = filtered.filter(sub => 
                sub.amount >= filters.amountRange.min && 
                sub.amount <= filters.amountRange.max
            );
        }

        return filtered;
    }

    // 구독 통계
    getSubscriptionStats() {
        const active = app.subscriptions.filter(sub => sub.status === 'active');
        const paused = app.subscriptions.filter(sub => sub.status === 'paused');
        const cancelled = app.subscriptions.filter(sub => sub.status === 'cancelled');

        const monthlyTotal = active
            .filter(sub => sub.billingCycle === 'monthly')
            .reduce((sum, sub) => sum + sub.amount, 0);

        const yearlyTotal = active
            .filter(sub => sub.billingCycle === 'yearly')
            .reduce((sum, sub) => sum + sub.amount, 0);

        return {
            total: app.subscriptions.length,
            active: active.length,
            paused: paused.length,
            cancelled: cancelled.length,
            monthlyTotal,
            yearlyTotal,
            averageAmount: active.length > 0 ? monthlyTotal / active.length : 0
        };
    }

    // 결제 예정 알림 확인
    checkUpcomingPayments() {
        const today = new Date();
        const upcomingPayments = [];

        app.subscriptions
            .filter(sub => sub.status === 'active')
            .forEach(sub => {
                const nextPayment = new Date(sub.nextPaymentDate);
                const daysUntil = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));

                if (this.notificationSettings.daysBeforePayment.includes(daysUntil)) {
                    upcomingPayments.push({
                        subscription: sub,
                        daysUntil,
                        message: this.generatePaymentMessage(sub, daysUntil)
                    });
                }
            });

        return upcomingPayments;
    }

    // 결제 메시지 생성
    generatePaymentMessage(subscription, daysUntil) {
        if (daysUntil === 0) {
            return `오늘 ${subscription.name} 구독료 ₩${subscription.amount.toLocaleString()}이 결제됩니다.`;
        } else if (daysUntil === 1) {
            return `내일 ${subscription.name} 구독료 ₩${subscription.amount.toLocaleString()}이 결제됩니다.`;
        } else {
            return `${daysUntil}일 후 ${subscription.name} 구독료 ₩${subscription.amount.toLocaleString()}이 결제됩니다.`;
        }
    }

    // 알림 발송
    sendNotifications() {
        if (!this.notificationSettings.enabled) return;

        const upcomingPayments = this.checkUpcomingPayments();
        
        upcomingPayments.forEach(payment => {
            if (this.notificationSettings.pushNotifications) {
                app.showNotification(payment.message, 'warning');
            }
        });
    }

    // 알림 설정 업데이트
    updateNotificationSettings(settings) {
        this.notificationSettings = { ...this.notificationSettings, ...settings };
        this.saveNotificationSettings();
    }

    // 구독 템플릿 추가
    addSubscriptionTemplate(template) {
        this.subscriptionTemplates[template.key] = template;
        this.saveTemplates();
    }

    // 템플릿 저장
    saveTemplates() {
        localStorage.setItem('subscriptionTemplates', JSON.stringify(this.subscriptionTemplates));
    }

    // 템플릿 로드
    loadTemplates() {
        const saved = localStorage.getItem('subscriptionTemplates');
        if (saved) {
            this.subscriptionTemplates = { ...this.subscriptionTemplates, ...JSON.parse(saved) };
        }
    }
}

// 전역 구독 매니저 인스턴스
const subscriptionManager = new SubscriptionManager();

// 앱에서 구독 관리 함수 호출
if (typeof app !== 'undefined') {
    app.subscriptionManager = subscriptionManager;
}
