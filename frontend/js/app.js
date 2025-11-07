// 구독 관리 메인 애플리케이션
class SmartSubscriptionApp {
    constructor() {
        this.subscriptions = [];
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.navClickHandler = null;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeApp();
            });
        } else {
            this.initializeApp();
        }
    }
    
    // 의존성 모듈 로드 대기 후 초기화
    initializeApp() {
        if (typeof authManager === 'undefined' || typeof apiManager === 'undefined') {
            setTimeout(() => this.initializeApp(), 100);
        } else {
            this.init();
        }
    }

    // 애플리케이션 초기화
    init() {
        if (typeof authManager === 'undefined') {
            setTimeout(() => this.init(), 50);
            return;
        }
        
        if (authManager.loggingOut) {
            return;
        }
        
        this.setupEventListeners();
        
        if (!authManager.checkAuth()) {
            if (typeof authManager !== 'undefined') {
                authManager.showLoginPage();
            }
            return;
        }
        
        const mainContent = document.querySelector('.main');
        const loginContainer = document.querySelector('.login-container');
        
        if (mainContent) {
            mainContent.style.cssText = '';
            mainContent.classList.remove('hidden');
            mainContent.style.display = 'block';
            mainContent.style.visibility = 'visible';
        }
        
        if (loginContainer) {
            loginContainer.style.cssText = '';
            loginContainer.classList.add('hidden');
            loginContainer.style.display = 'none';
            loginContainer.style.visibility = 'hidden';
        }
        
        const header = document.querySelector('.header');
        if (header) {
            const nav = header.querySelector('.nav');
            if (nav) {
                nav.style.display = '';
            }
        }
        
        this.loadData();
        
        const currentPath = window.location.pathname;
        let targetSection = currentPath.substring(1);
        
        if (!targetSection || targetSection === '') {
            targetSection = sessionStorage.getItem('lastSection') || 'dashboard';
        }
        
        setTimeout(() => {
            document.querySelectorAll('.section').forEach(section => {
                section.style.cssText = '';
            });
            
            if (window.location.pathname !== `/${targetSection}`) {
                window.history.replaceState({ section: targetSection }, '', `/${targetSection}`);
            }
            
            this.showSection(targetSection);
            
            setTimeout(() => {
                const targetSectionEl = document.getElementById(targetSection);
                if (targetSectionEl) {
                    const computedStyle = window.getComputedStyle(targetSectionEl);
                    if (computedStyle.display === 'none') {
                        targetSectionEl.style.setProperty('display', 'block', 'important');
                        targetSectionEl.style.setProperty('visibility', 'visible', 'important');
                    }
                }
            }, 100);
        }, 300);
        
        this.setupCalendarEventsDelayed();
    }

    setupCalendarEventsDelayed() {
        const trySetup = () => {
            if (typeof calendarManager !== 'undefined') {
                calendarManager.setupCalendarEvents();
            } else {
                setTimeout(trySetup, 50);
            }
        };
        trySetup();
    }

    async loadData() {
        if (typeof authManager === 'undefined') {
            setTimeout(() => this.loadData(), 50);
            return;
        }
        
        this.currentUser = authManager.getCurrentUser();
        
        if (!this.currentUser) {
            return;
        }
        
        await this.loadSubscriptionsFromBackend();
        this.loadExternalData();
        this.updateDashboard();
        this.updateSubscriptionsList();
        this.updateCalendar();
        this.updateAnalytics();
    }

    // 백엔드에서 구독 목록 로드
    async loadSubscriptionsFromBackend() {
        try {
            // 세션 확인
            if (typeof apiManager !== 'undefined') {
                try {
                    const sessionCheck = await apiManager.checkSession();
                    if (!sessionCheck || !sessionCheck.authenticated) {
                        this.subscriptions = [];
                        this.saveData();
                        return;
                    }
                } catch (sessionError) {
                    this.subscriptions = [];
                    this.saveData();
                    return;
                }
            }
            
            const response = await apiManager.getSubscriptions();
            
            if (response && response.success && response.subscriptions) {
                this.subscriptions = response.subscriptions.map(sub => {
                    if (typeof sub.id === 'string') {
                        sub.id = parseInt(sub.id);
                    }
                    if (typeof sub.amount === 'string') {
                        sub.amount = parseFloat(sub.amount);
                    }
                    return sub;
                });
                
                this.saveData();
            } else {
                this.subscriptions = [];
                this.saveData();
            }
        } catch (error) {
            // 에러가 401이면 로그인 페이지로 리다이렉트
            if (error.message && error.message.includes('로그인이 필요')) {
                if (typeof authManager !== 'undefined') {
                    authManager.showLoginPage();
                }
            } else {
                this.loadFromLocalStorage();
            }
        }
    }

    loadFromLocalStorage() {
        const userKey = `subscriptions_${this.currentUser.id}`;
        const saved = localStorage.getItem(userKey);
        if (saved) {
            this.subscriptions = JSON.parse(saved);
        } else {
            this.subscriptions = [];
        }
    }

    async loadExternalData() {
        try {
            const exchangeRates = await apiManager.fetchExchangeRates();
            this.exchangeRates = exchangeRates;
            // displayExchangeRates는 더 이상 페이지에 위젯을 추가하지 않음
            this.updateForeignSubscriptions();
        } catch (error) {
            console.error('외부 API 데이터 로드 실패:', error);
        }
    }

    displayExchangeRates(exchangeData) {
        // 환율 위젯을 페이지에 추가하지 않음 (사용자 요청)
        // 환율 정보는 내부적으로만 사용
    }

    updateForeignSubscriptions() {
        if (!this.exchangeRates || !this.exchangeRates.rates) {
            this.updateDashboard();
            this.updateSubscriptionsList();
            return [];
        }

        const changedSubscriptions = [];

        this.subscriptions.forEach(subscription => {
            if (subscription.currency !== 'KRW') {
                // 기존 금액 저장 (변경 전)
                const oldKrwAmount = subscription.krwAmount || 0;
                
                // USD, EUR 등 외화를 KRW로 변환
                let newKrwAmount = 0;
                if (subscription.currency === 'USD') {
                    // 1 USD = X KRW 형식
                    const krwPerUsd = this.exchangeRates.rates.KRW || 1350;
                    newKrwAmount = Math.round(subscription.amount * krwPerUsd);
                    subscription.exchangeRate = krwPerUsd;
                } else if (subscription.currency === 'EUR') {
                    // EUR -> USD -> KRW 변환
                    const usdPerEur = 1 / (this.exchangeRates.rates.EUR || 0.92);
                    const krwPerUsd = this.exchangeRates.rates.KRW || 1350;
                    newKrwAmount = Math.round(subscription.amount * usdPerEur * krwPerUsd);
                } else if (subscription.currency === 'JPY') {
                    // JPY -> USD -> KRW 변환
                    const usdPerJpy = 1 / (this.exchangeRates.rates.JPY || 150);
                    const krwPerUsd = this.exchangeRates.rates.KRW || 1350;
                    newKrwAmount = Math.round(subscription.amount * usdPerJpy * krwPerUsd);
                } else {
                    // 기타 통화는 기본 환율 사용
                    const krwPerUsd = this.exchangeRates.rates.KRW || 1350;
                    newKrwAmount = Math.round(subscription.amount * krwPerUsd);
                }
                
                // 변경된 경우만 추적
                if (oldKrwAmount > 0 && oldKrwAmount !== newKrwAmount) {
                    changedSubscriptions.push({
                        subscription: subscription,
                        oldAmount: oldKrwAmount,
                        newAmount: newKrwAmount
                    });
                }
                
                subscription.krwAmount = newKrwAmount;
            }
        });

        this.updateDashboard();
        this.updateSubscriptionsList();
        
        return changedSubscriptions;
    }

    // 로컬 스토리지에 구독 데이터 저장 (백엔드 동기화용)
    saveData() {
        if (!this.currentUser) return;
        const userKey = `subscriptions_${this.currentUser.id}`;
        localStorage.setItem(userKey, JSON.stringify(this.subscriptions));
    }

    // 이벤트 리스너 설정 (네비게이션, 라우팅 등)
    setupEventListeners() {
        const nav = document.querySelector('.nav');
        if (nav) {
            if (this.navClickHandler) {
                nav.removeEventListener('click', this.navClickHandler);
            }
            
            this.navClickHandler = (e) => {
                const link = e.target.closest('.nav-link');
                if (link) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (typeof authManager !== 'undefined') {
                        if (authManager.loggingOut || !authManager.checkAuth()) {
                            authManager.showLoginPage();
                            return;
                        }
                    }
                    
                    const href = link.getAttribute('href');
                    if (href) {
                        let section = '';
                        if (href.startsWith('#')) {
                            section = href.substring(1);
                        } else if (href.startsWith('/')) {
                            section = href.substring(1);
                        }
                        
                        if (section) {
                            window.history.pushState({ section: section }, '', href);
                            this.showSection(section);
                        }
                    }
                }
            };
            
            nav.addEventListener('click', this.navClickHandler);
        }
        
        if (!this.popstateHandler) {
            this.popstateHandler = (e) => {
                if (typeof authManager !== 'undefined' && authManager.loggingOut) {
                    e.preventDefault();
                    return;
                }
                
                const path = window.location.pathname;
                const section = path.substring(1) || 'dashboard';
                
                if (typeof authManager !== 'undefined') {
                    if (authManager.loggingOut || !authManager.checkAuth()) {
                        authManager.showLoginPage();
                        return;
                    }
                }
                
                if (section) {
                    this.showSection(section);
                }
            };
            window.addEventListener('popstate', this.popstateHandler);
        }
        
        if (!this.hashChangeHandler) {
            this.hashChangeHandler = () => {
                const hash = window.location.hash.substring(1);
                if (hash) {
                    if (typeof authManager !== 'undefined') {
                        if (authManager.loggingOut || !authManager.checkAuth()) {
                            authManager.showLoginPage();
                            return;
                        }
                    }
                    this.showSection(hash);
                }
            };
            window.addEventListener('hashchange', this.hashChangeHandler);
        }

        const addBtn = document.getElementById('addSubscriptionBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddSubscriptionModal();
            });
        }

        const refreshBtn = document.getElementById('refreshExchangeBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshExchangeRates();
            });
        }

        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                if (typeof authManager !== 'undefined') {
                    authManager.showLoginModal();
                }
            });
        }

        const signupBtn = document.getElementById('signupBtn');
        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                if (typeof authManager !== 'undefined') {
                    authManager.showSignupModal();
                }
            });
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterSubscriptions();
            });
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filterSubscriptions();
            });
        }

        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideModal();
            });
        }

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modal');
            if (e.target === modal) {
                this.hideModal();
            }
        });
    }

    // 섹션 전환 및 표시
    showSection(sectionName) {
        try {
            if (typeof authManager !== 'undefined') {
                if (authManager.loggingOut || !authManager.checkAuth()) {
                    document.querySelectorAll('.section').forEach(section => {
                        section.style.setProperty('display', 'none', 'important');
                        section.style.setProperty('visibility', 'hidden', 'important');
                    });
                    const mainContent = document.querySelector('.main');
                    if (mainContent) {
                        mainContent.style.setProperty('display', 'none', 'important');
                        mainContent.style.setProperty('visibility', 'hidden', 'important');
                    }
                    authManager.showLoginPage();
                    return;
                }
            }
            
            const targetSection = document.getElementById(sectionName);
            if (!targetSection) {
                sectionName = 'dashboard';
                const dashboardSection = document.getElementById('dashboard');
                if (!dashboardSection) {
                    return;
                }
            }

            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
                section.style.cssText = '';
                section.style.display = 'none';
            });

            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });

            const finalSection = document.getElementById(sectionName);
            if (finalSection) {
                finalSection.classList.add('active');
                finalSection.style.display = 'block';
                finalSection.style.visibility = 'visible';
            }
            
            const navLink = document.querySelector(`.nav-link[href="/${sectionName}"], .nav-link[href="#${sectionName}"]`);
            if (navLink) {
                navLink.classList.add('active');
            }

            this.currentSection = sectionName;
            sessionStorage.setItem('lastSection', sectionName);
            
            const currentPath = window.location.pathname;
            if (currentPath !== `/${sectionName}`) {
                window.history.pushState({ section: sectionName }, '', `/${sectionName}`);
            }
            switch(sectionName) {
                case 'dashboard':
                    this.updateDashboard();
                    break;
                case 'subscriptions':
                    this.updateSubscriptionsList();
                    break;
                case 'calendar':
                    this.updateCalendar();
                    break;
                case 'analytics':
                    this.updateAnalytics();
                    break;
                case 'news':
                    this.updateNews();
                    break;
                default:
                    console.warn('알 수 없는 섹션:', sectionName);
            }
        } catch (error) {
            console.error('섹션 업데이트 중 오류:', error, '섹션:', sectionName);
        }
    }

    /**
     * 대시보드 데이터 새로고침
     * 백엔드에서 최신 구독 목록을 가져와서 대시보드를 업데이트
     */
    async refreshDashboard() {
        try {
            // 백엔드에서 최신 구독 목록 가져오기
            await this.loadSubscriptionsFromBackend();
            // 대시보드 업데이트
            this.updateDashboard();
        } catch (error) {
            console.error('대시보드 새로고침 오류:', error);
            // 에러가 발생해도 로컬 데이터로 대시보드 업데이트
            this.updateDashboard();
        }
    }

    /**
     * 대시보드 UI 업데이트
     * 현재 구독 데이터를 기반으로 대시보드 통계 및 최근 구독 내역 표시
     */
    updateDashboard() {
        const totalSubscriptions = this.subscriptions.filter(sub => sub.status === 'active').length;
        const monthlyTotal = this.subscriptions
            .filter(sub => sub.status === 'active' && sub.billingCycle === 'monthly')
            .reduce((sum, sub) => {
                const amount = sub.currency === 'KRW' ? sub.amount : (sub.krwAmount || sub.amount);
                return sum + amount;
            }, 0);
        
        const today = new Date();
        const upcomingPayments = this.subscriptions.filter(sub => {
            if (sub.status !== 'active') return false;
            const nextPayment = new Date(sub.nextPaymentDate);
            const daysDiff = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));
            return daysDiff <= 7 && daysDiff >= 0;
        }).length;

        document.getElementById('totalSubscriptions').textContent = totalSubscriptions;
        document.getElementById('monthlyTotal').textContent = `₩${monthlyTotal.toLocaleString()}`;
        document.getElementById('upcomingPayments').textContent = upcomingPayments;

        this.updateRecentSubscriptions();
    }

    updateRecentSubscriptions() {
        const container = document.getElementById('recentSubscriptions');
        if (!container) return;
        
        const recentSubs = this.subscriptions
            .filter(sub => sub.status === 'active')
            .sort((a, b) => {
                // createdAt이 있으면 최신 생성 순서로 정렬 (최근 추가된 것이 앞으로)
                if (a.createdAt && b.createdAt) {
                    const dateA = new Date(a.createdAt);
                    const dateB = new Date(b.createdAt);
                    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                        return dateB - dateA; // 최신이 앞으로
                    }
                }
                // createdAt이 없으면 id 기준으로 정렬 (최신 추가된 것이 앞으로)
                const idA = typeof a.id === 'number' ? a.id : parseInt(a.id) || 0;
                const idB = typeof b.id === 'number' ? b.id : parseInt(b.id) || 0;
                if (idA !== idB) {
                    return idB - idA; // 큰 id가 앞으로 (최신)
                }
                // 마지막으로 lastPaymentDate로 정렬
                const dateA = a.lastPaymentDate ? new Date(a.lastPaymentDate) : new Date(0);
                const dateB = b.lastPaymentDate ? new Date(b.lastPaymentDate) : new Date(0);
                return dateB - dateA;
            })
            .slice(0, 5);

        container.innerHTML = recentSubs.map(sub => this.createSubscriptionItemHTML(sub)).join('');
    }

    // 구독 항목 HTML 생성
    createSubscriptionItemHTML(subscription) {
        const nextPayment = new Date(subscription.nextPaymentDate);
        const today = new Date();
        const daysUntilPayment = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));
        
        // 은행명 매핑
        const bankNames = {
            'kb': '국민은행',
            'shinhan': '신한은행',
            'woori': '우리은행',
            'hana': '하나은행',
            'nh': '농협은행',
            'ibk': '기업은행',
            'keb': '외환은행',
            'kdb': '산업은행',
            'kakao': '카카오뱅크',
            'kbank': '케이뱅크',
            'toss': '토스뱅크',
            'other': '기타'
        };
        
        const bankName = bankNames[subscription.paymentBank] || '미설정';
        const accountInfo = subscription.paymentAccount || '미설정';
        
        // 해외 구독 서비스인 경우 환율 정보 표시
        let amountDisplay = `₩${subscription.amount.toLocaleString()}`;
        let currencyInfo = '';
        
        if (subscription.isForeign && subscription.currency !== 'KRW') {
            if (subscription.krwAmount) {
                amountDisplay = `₩${subscription.krwAmount.toLocaleString()}`;
                currencyInfo = `<p class="currency-info">💱 ${subscription.currency} ${subscription.amount} (환율: ${subscription.exchangeRate?.toFixed(4) || 'N/A'})</p>`;
            } else {
                amountDisplay = `${subscription.currency} ${subscription.amount}`;
                currencyInfo = `<p class="currency-info">🌍 해외 서비스 (환율 로딩 중...)</p>`;
            }
        }
        
        return `
            <div class="subscription-item ${subscription.isForeign ? 'foreign-subscription' : ''}" data-subscription-id="${subscription.id}">
                <div class="subscription-info">
                    <div class="subscription-icon" style="background-color: ${subscription.color}">
                        <i class="${subscription.icon}"></i>
                    </div>
                    <div class="subscription-details">
                        <h4>${subscription.name} ${subscription.isForeign ? '🌍' : ''}</h4>
                        <p>다음 결제: ${daysUntilPayment}일 후 (${nextPayment.toLocaleDateString('ko-KR')})</p>
                        <p class="payment-info">💳 ${bankName} ${accountInfo}</p>
                        ${currencyInfo}
                    </div>
                </div>
                <div class="subscription-amount">${amountDisplay}</div>
                <div class="subscription-actions">
                    <button class="btn btn-small btn-outline" onclick="app.editSubscription(${subscription.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="app.cancelSubscription(${subscription.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }

    updateSubscriptionsList() {
        const container = document.getElementById('allSubscriptions');
        const activeSubs = this.subscriptions
            .filter(sub => sub.status === 'active')
            .sort((a, b) => {
                if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
                    return a.displayOrder - b.displayOrder;
                }
                return new Date(b.createdAt || b.id) - new Date(a.createdAt || a.id);
            });
        
        if (container) {
            container.innerHTML = activeSubs.map(sub => this.createSubscriptionItemHTML(sub)).join('');
            
            const sectionTitle = document.querySelector('#subscriptions .section-header h2');
            if (sectionTitle) {
                sectionTitle.innerHTML = `구독 목록 <span style="font-size: 0.7em; color: #7f8c8d; font-weight: normal;">(${activeSubs.length}개)</span>`;
            }
            
            if (typeof dragDropManager !== 'undefined') {
                dragDropManager.setupDragAndDrop();
            }
        }
    }

    filterSubscriptions() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value;
        
        const filteredSubs = this.subscriptions.filter(sub => {
            const matchesSearch = sub.name.toLowerCase().includes(searchTerm) || 
                                sub.description.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryFilter || sub.category === categoryFilter;
            return sub.status === 'active' && matchesSearch && matchesCategory;
        });

        const container = document.getElementById('allSubscriptions');
        container.innerHTML = filteredSubs.map(sub => this.createSubscriptionItemHTML(sub)).join('');
        
        if (typeof dragDropManager !== 'undefined') {
            dragDropManager.setupDragAndDrop();
        }
    }

    showModal(title, content) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        
        modalBody.innerHTML = `
            <h2>${title}</h2>
            ${content}
        `;
        
        modal.style.display = 'block';
    }

    hideModal() {
        document.getElementById('modal').style.display = 'none';
    }

    // 구독 추가 모달
    showAddSubscriptionModal() {
        const content = `
            <form id="addSubscriptionForm">
                <div class="form-group">
                    <label for="subscriptionName">서비스명</label>
                    <input type="text" id="subscriptionName" required>
                </div>
                <div class="form-group">
                    <label for="subscriptionAmount">금액</label>
                    <input type="number" id="subscriptionAmount" required>
                </div>
                <div class="form-group">
                    <label for="subscriptionCategory">카테고리</label>
                    <select id="subscriptionCategory" required>
                        <option value="entertainment">🎬 엔터테인먼트</option>
                        <option value="music">🎵 음악</option>
                        <option value="ai">🤖 AI 서비스</option>
                        <option value="social">📱 소셜 미디어</option>
                        <option value="productivity">⚡ 생산성 도구</option>
                        <option value="cloud">☁️ 클라우드</option>
                        <option value="education">🎓 교육 및 학습</option>
                        <option value="finance">💰 금융 및 투자</option>
                        <option value="news">📰 뉴스 및 미디어</option>
                        <option value="gaming">🎮 게임</option>
                        <option value="development">💻 개발 도구</option>
                        <option value="security">🔒 보안</option>
                        <option value="other">📦 기타</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="billingCycle">결제 주기</label>
                    <select id="billingCycle" required>
                        <option value="monthly">월간</option>
                        <option value="yearly">연간</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="nextPaymentDate">다음 결제일</label>
                    <input type="date" id="nextPaymentDate" required>
                </div>
                <div class="form-group">
                    <label for="paymentBank">결제 은행</label>
                    <select id="paymentBank" required>
                        <option value="">은행을 선택하세요</option>
                        <option value="kb">국민은행</option>
                        <option value="shinhan">신한은행</option>
                        <option value="woori">우리은행</option>
                        <option value="hana">하나은행</option>
                        <option value="nh">농협은행</option>
                        <option value="ibk">기업은행</option>
                        <option value="keb">외환은행</option>
                        <option value="kdb">산업은행</option>
                        <option value="kakao">카카오뱅크</option>
                        <option value="kbank">케이뱅크</option>
                        <option value="toss">토스뱅크</option>
                        <option value="other">기타</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="paymentAccount">계좌번호</label>
                    <input type="text" id="paymentAccount" placeholder="예: 123456-78-901234" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="app.hideModal()">취소</button>
                    <button type="submit" class="btn btn-primary">추가</button>
                </div>
            </form>
        `;

        this.showModal('구독 추가', content);

        // 폼 제출 이벤트
        document.getElementById('addSubscriptionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSubscription();
        });

        // 실시간 아이콘 미리보기
        const nameInput = document.getElementById('subscriptionName');
        const previewContainer = document.createElement('div');
        previewContainer.id = 'iconPreview';
        previewContainer.style.cssText = 'margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; text-align: center;';
        nameInput.parentNode.appendChild(previewContainer);

        nameInput.addEventListener('input', (e) => {
            const iconInfo = this.getIconForSubscription(e.target.value);
            const categoryInfo = this.getCategoryForSubscription(e.target.value);
            
            // 카테고리 자동 선택
            const categorySelect = document.getElementById('subscriptionCategory');
            if (categorySelect) {
                categorySelect.value = categoryInfo;
            }
            
            previewContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <i class="${iconInfo.icon}" style="font-size: 24px; color: ${iconInfo.color}"></i>
                    <span>미리보기: ${e.target.value || '구독명을 입력하세요'}</span>
                </div>
                <div style="margin-top: 5px; font-size: 0.9em; color: #666;">
                    자동 선택된 카테고리: ${this.getCategoryDisplayName(categoryInfo)}
                </div>
            `;
        });
    }

    // 구독 추가
    async addSubscription() {
        const subscriptionName = document.getElementById('subscriptionName').value;
        const iconInfo = this.getIconForSubscription(subscriptionName);
        
        const newSubscription = {
            name: subscriptionName,
            category: document.getElementById('subscriptionCategory').value,
            amount: parseInt(document.getElementById('subscriptionAmount').value),
            currency: 'KRW',
            billingCycle: document.getElementById('billingCycle').value,
            nextPaymentDate: document.getElementById('nextPaymentDate').value,
            lastPaymentDate: new Date().toISOString().split('T')[0],
            status: 'active',
            icon: iconInfo.icon,
            color: iconInfo.color,
            description: '',
            paymentBank: document.getElementById('paymentBank').value,
            paymentAccount: document.getElementById('paymentAccount').value
        };

        try {
            // 백엔드에 저장
            const response = await apiManager.addSubscription(newSubscription);
            
            if (response.success) {
                // 모달 닫기
                this.hideModal();
                
                // 백엔드에서 최신 구독 목록을 다시 가져와서 대시보드 갱신
                await this.refreshDashboard();
                
                // 구독 목록 업데이트
                this.updateSubscriptionsList();
                
                // 뉴스 카테고리 업데이트
                if (typeof newsManager !== 'undefined') {
                    newsManager.loadSubscriptionCategories();
                }
                
                this.showNotification('구독이 성공적으로 추가되었습니다.', 'success');
            } else {
                this.showNotification(response.message || '구독 추가에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('구독 추가 오류:', error);
            this.showNotification('구독 추가 중 오류가 발생했습니다.', 'error');
        }
    }

    // 구독 편집
    editSubscription(id) {
        const subscription = this.subscriptions.find(sub => sub.id === id);
        if (!subscription) return;

        const content = `
            <form id="editSubscriptionForm">
                <div class="form-group">
                    <label for="editSubscriptionName">서비스명</label>
                    <input type="text" id="editSubscriptionName" value="${subscription.name}" required>
                </div>
                <div class="form-group">
                    <label for="editSubscriptionAmount">금액</label>
                    <input type="number" id="editSubscriptionAmount" value="${subscription.amount}" required>
                </div>
                <div class="form-group">
                    <label for="editSubscriptionCategory">카테고리</label>
                    <select id="editSubscriptionCategory" required>
                        <option value="entertainment" ${subscription.category === 'entertainment' ? 'selected' : ''}>🎬 엔터테인먼트</option>
                        <option value="music" ${subscription.category === 'music' ? 'selected' : ''}>🎵 음악</option>
                        <option value="ai" ${subscription.category === 'ai' ? 'selected' : ''}>🤖 AI 서비스</option>
                        <option value="social" ${subscription.category === 'social' ? 'selected' : ''}>📱 소셜 미디어</option>
                        <option value="productivity" ${subscription.category === 'productivity' ? 'selected' : ''}>⚡ 생산성 도구</option>
                        <option value="cloud" ${subscription.category === 'cloud' ? 'selected' : ''}>☁️ 클라우드</option>
                        <option value="education" ${subscription.category === 'education' ? 'selected' : ''}>🎓 교육 및 학습</option>
                        <option value="finance" ${subscription.category === 'finance' ? 'selected' : ''}>💰 금융 및 투자</option>
                        <option value="news" ${subscription.category === 'news' ? 'selected' : ''}>📰 뉴스 및 미디어</option>
                        <option value="gaming" ${subscription.category === 'gaming' ? 'selected' : ''}>🎮 게임</option>
                        <option value="development" ${subscription.category === 'development' ? 'selected' : ''}>💻 개발 도구</option>
                        <option value="security" ${subscription.category === 'security' ? 'selected' : ''}>🔒 보안</option>
                        <option value="other" ${subscription.category === 'other' ? 'selected' : ''}>📦 기타</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editBillingCycle">결제 주기</label>
                    <select id="editBillingCycle" required>
                        <option value="monthly" ${subscription.billingCycle === 'monthly' ? 'selected' : ''}>월간</option>
                        <option value="yearly" ${subscription.billingCycle === 'yearly' ? 'selected' : ''}>연간</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editNextPaymentDate">다음 결제일</label>
                    <input type="date" id="editNextPaymentDate" value="${subscription.nextPaymentDate}" required>
                </div>
                <div class="form-group">
                    <label for="editPaymentBank">결제 은행</label>
                    <select id="editPaymentBank" required>
                        <option value="">은행을 선택하세요</option>
                        <option value="kb" ${subscription.paymentBank === 'kb' ? 'selected' : ''}>국민은행</option>
                        <option value="shinhan" ${subscription.paymentBank === 'shinhan' ? 'selected' : ''}>신한은행</option>
                        <option value="woori" ${subscription.paymentBank === 'woori' ? 'selected' : ''}>우리은행</option>
                        <option value="hana" ${subscription.paymentBank === 'hana' ? 'selected' : ''}>하나은행</option>
                        <option value="nh" ${subscription.paymentBank === 'nh' ? 'selected' : ''}>농협은행</option>
                        <option value="ibk" ${subscription.paymentBank === 'ibk' ? 'selected' : ''}>기업은행</option>
                        <option value="keb" ${subscription.paymentBank === 'keb' ? 'selected' : ''}>외환은행</option>
                        <option value="kdb" ${subscription.paymentBank === 'kdb' ? 'selected' : ''}>산업은행</option>
                        <option value="kakao" ${subscription.paymentBank === 'kakao' ? 'selected' : ''}>카카오뱅크</option>
                        <option value="kbank" ${subscription.paymentBank === 'kbank' ? 'selected' : ''}>케이뱅크</option>
                        <option value="toss" ${subscription.paymentBank === 'toss' ? 'selected' : ''}>토스뱅크</option>
                        <option value="other" ${subscription.paymentBank === 'other' ? 'selected' : ''}>기타</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editPaymentAccount">계좌번호</label>
                    <input type="text" id="editPaymentAccount" value="${subscription.paymentAccount || ''}" placeholder="예: 123456-78-901234" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="app.hideModal()">취소</button>
                    <button type="submit" class="btn btn-primary">저장</button>
                </div>
            </form>
        `;

        this.showModal('구독 편집', content);

        // 폼 제출 이벤트
        document.getElementById('editSubscriptionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateSubscription(id);
        });
    }

    // 구독 업데이트
    async updateSubscription(id) {
        const subscription = this.subscriptions.find(sub => sub.id === id);
        if (!subscription) return;

        const updateData = {
            name: document.getElementById('editSubscriptionName').value,
            amount: parseInt(document.getElementById('editSubscriptionAmount').value),
            category: document.getElementById('editSubscriptionCategory').value,
            billingCycle: document.getElementById('editBillingCycle').value,
            nextPaymentDate: document.getElementById('editNextPaymentDate').value,
            paymentBank: document.getElementById('editPaymentBank').value,
            paymentAccount: document.getElementById('editPaymentAccount').value
        };

        try {
            // 백엔드에 업데이트
            const response = await apiManager.updateSubscription(id, updateData);
            
            if (response.success) {
                // 모달 닫기
                this.hideModal();
                
                // 백엔드에서 최신 구독 목록을 다시 가져와서 대시보드 갱신
                await this.refreshDashboard();
                
                // 구독 목록 업데이트
                this.updateSubscriptionsList();
                
                // 뉴스 카테고리 업데이트
                if (typeof newsManager !== 'undefined') {
                    newsManager.loadSubscriptionCategories();
                }
                
                this.showNotification('구독이 성공적으로 수정되었습니다.', 'success');
            } else {
                this.showNotification(response.message || '구독 수정에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('구독 수정 오류:', error);
            this.showNotification('구독 수정 중 오류가 발생했습니다.', 'error');
        }
    }

    // 구독 취소
    async cancelSubscription(id) {
        if (confirm('정말로 이 구독을 취소하시겠습니까?')) {
            try {
                // 백엔드에서 삭제
                const response = await apiManager.deleteSubscription(id);
                
                if (response.success) {
                    // 백엔드에서 최신 구독 목록을 다시 가져와서 대시보드 갱신
                    await this.refreshDashboard();
                    
                    // 구독 목록 업데이트
                    this.updateSubscriptionsList();
                    
                    // 뉴스 카테고리 업데이트
                    if (typeof newsManager !== 'undefined') {
                        newsManager.loadSubscriptionCategories();
                    }
                    
                    this.showNotification('구독이 취소되었습니다.', 'success');
                } else {
                    this.showNotification(response.message || '구독 취소에 실패했습니다.', 'error');
                }
            } catch (error) {
                console.error('구독 취소 오류:', error);
                this.showNotification('구독 취소 중 오류가 발생했습니다.', 'error');
            }
        }
    }

    // 알림 표시
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // 여러 줄 메시지 지원
        if (message.includes('\n')) {
            const lines = message.split('\n');
            lines.forEach((line, index) => {
                const lineElement = document.createElement('div');
                lineElement.textContent = line;
                if (index === 0) {
                    lineElement.style.fontWeight = 'bold';
                    lineElement.style.marginBottom = '0.5rem';
                }
                notification.appendChild(lineElement);
            });
        } else {
            notification.textContent = message;
        }
        
        document.body.appendChild(notification);

        // 여러 줄 메시지는 더 오래 표시
        const duration = message.includes('\n') ? 5000 : 3000;
        setTimeout(() => {
            notification.remove();
        }, duration);
    }

    // 기타 모달들 (간단한 구현)
    showLoginModal() {
        const content = `
            <form id="loginForm">
                <div class="form-group">
                    <label for="loginEmail">이메일</label>
                    <input type="email" id="loginEmail" required>
                </div>
                <div class="form-group">
                    <label for="loginPassword">비밀번호</label>
                    <input type="password" id="loginPassword" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="app.hideModal()">취소</button>
                    <button type="submit" class="btn btn-primary">로그인</button>
                </div>
            </form>
        `;
        this.showModal('로그인', content);
    }

    showSignupModal() {
        const content = `
            <form id="signupForm">
                <div class="form-group">
                    <label for="signupName">이름</label>
                    <input type="text" id="signupName" required>
                </div>
                <div class="form-group">
                    <label for="signupEmail">이메일</label>
                    <input type="email" id="signupEmail" required>
                </div>
                <div class="form-group">
                    <label for="signupPassword">비밀번호</label>
                    <input type="password" id="signupPassword" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="app.hideModal()">취소</button>
                    <button type="submit" class="btn btn-primary">회원가입</button>
                </div>
            </form>
        `;
        this.showModal('회원가입', content);
    }

    // 환율 정보 새로고침
    async refreshExchangeRates() {
        try {
            const oldExchangeRates = this.exchangeRates ? JSON.parse(JSON.stringify(this.exchangeRates)) : null;
            const exchangeRates = await apiManager.fetchExchangeRates();
            this.exchangeRates = exchangeRates;
            const changedSubscriptions = this.updateForeignSubscriptions();
            if (changedSubscriptions.length > 0) {
                let message = '환율이 새로고침 되었습니다.\n\n';
                message += '변경된 항목:\n';
                changedSubscriptions.forEach(item => {
                    const subscription = item.subscription;
                    const oldAmount = item.oldAmount;
                    const newAmount = item.newAmount;
                    const change = newAmount - oldAmount;
                    const changeSign = change > 0 ? '+' : '';
                    const changeColor = change > 0 ? '🔴' : '🟢';
                    
                    message += `${changeColor} ${subscription.name}: ₩${oldAmount.toLocaleString()} → ₩${newAmount.toLocaleString()} (${changeSign}₩${change.toLocaleString()})\n`;
                });
                
                this.showNotification(message, 'success');
            } else {
                this.showNotification('환율이 새로고침 되었습니다.\n변경된 항목이 없습니다.', 'success');
            }
        } catch (error) {
            this.showNotification('환율 새로고침에 실패했습니다.', 'error');
            console.error('환율 새로고침 오류:', error);
        }
    }

    updateCalendar() {
        if (typeof calendarManager !== 'undefined') {
            calendarManager.updateCalendar();
        }
    }

    updateAnalytics() {
        if (typeof analyticsManager !== 'undefined') {
            analyticsManager.updateAnalytics();
        }
    }

    updateNews() {
        // newsManager가 로드될 때까지 대기
        const tryUpdateNews = async () => {
            if (typeof newsManager === 'undefined') {
                // newsManager가 아직 로드되지 않았으면 잠시 후 다시 시도
                setTimeout(tryUpdateNews, 50);
                return;
            }
            
            // newsManager가 완전히 초기화될 때까지 대기
            if (!newsManager.initialized) {
                let attempts = 0;
                while (!newsManager.initialized && attempts < 20) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    attempts++;
                }
            }
            
            // 초기화 완료 후 뉴스 로드
            newsManager.loadSubscriptionCategories();
            if (newsManager.currentCategory) {
                newsManager.loadNews(newsManager.currentCategory);
            } else {
                newsManager.loadNews('all');
            }
        };
        
        tryUpdateNews();
    }

    // 구독명에 따른 아이콘 매칭
    getIconForSubscription(subscriptionName) {
        const name = subscriptionName.toLowerCase();
        
        // 엔터테인먼트 서비스
        if (name.includes('netflix') || name.includes('넷플릭스')) {
            return { icon: 'fas fa-tv', color: '#e50914' };
        }
        if (name.includes('youtube') || name.includes('유튜브')) {
            return { icon: 'fab fa-youtube', color: '#ff0000' };
        }
        if (name.includes('disney') || name.includes('디즈니')) {
            return { icon: 'fas fa-magic', color: '#113ccf' };
        }
        if (name.includes('amazon') || name.includes('아마존')) {
            return { icon: 'fab fa-amazon', color: '#ff9900' };
        }
        if (name.includes('twitch') || name.includes('트위치')) {
            return { icon: 'fab fa-twitch', color: '#9146ff' };
        }
        if (name.includes('hulu') || name.includes('훌루')) {
            return { icon: 'fas fa-play-circle', color: '#1ce783' };
        }
        if (name.includes('hbo') || name.includes('hbo')) {
            return { icon: 'fas fa-video', color: '#8b5cf6' };
        }
        
        // 음악 서비스
        if (name.includes('spotify') || name.includes('스포티파이')) {
            return { icon: 'fab fa-spotify', color: '#1db954' };
        }
        if (name.includes('apple music') || name.includes('애플 뮤직')) {
            return { icon: 'fab fa-apple', color: '#fa243c' };
        }
        if (name.includes('melon') || name.includes('멜론')) {
            return { icon: 'fas fa-music', color: '#00d4aa' };
        }
        if (name.includes('genie') || name.includes('지니')) {
            return { icon: 'fas fa-headphones', color: '#ff6b6b' };
        }
        
        // 클라우드 서비스
        if (name.includes('google drive') || name.includes('구글 드라이브')) {
            return { icon: 'fab fa-google-drive', color: '#4285f4' };
        }
        if (name.includes('dropbox') || name.includes('드롭박스')) {
            return { icon: 'fab fa-dropbox', color: '#0061ff' };
        }
        if (name.includes('icloud') || name.includes('아이클라우드')) {
            return { icon: 'fab fa-apple', color: '#007aff' };
        }
        if (name.includes('onedrive') || name.includes('원드라이브')) {
            return { icon: 'fab fa-microsoft', color: '#0078d4' };
        }
        
        // AI 및 생산성 도구
        if (name.includes('chatgpt') || name.includes('chat gpt') || name.includes('openai')) {
            return { icon: 'fas fa-robot', color: '#00a67e' };
        }
        if (name.includes('claude') || name.includes('클로드')) {
            return { icon: 'fas fa-brain', color: '#ff6b35' };
        }
        if (name.includes('gemini') || name.includes('제미나이')) {
            return { icon: 'fas fa-gem', color: '#4285f4' };
        }
        if (name.includes('copilot') || name.includes('코파일럿')) {
            return { icon: 'fas fa-plane', color: '#0078d4' };
        }
        if (name.includes('microsoft') || name.includes('마이크로소프트')) {
            return { icon: 'fab fa-microsoft', color: '#00a4ef' };
        }
        if (name.includes('adobe') || name.includes('아도비')) {
            return { icon: 'fab fa-adobe', color: '#ff0000' };
        }
        if (name.includes('notion') || name.includes('노션')) {
            return { icon: 'fas fa-sticky-note', color: '#000000' };
        }
        if (name.includes('canva') || name.includes('캔바')) {
            return { icon: 'fas fa-palette', color: '#00c4cc' };
        }
        if (name.includes('zoom') || name.includes('줌')) {
            return { icon: 'fas fa-video', color: '#2d8cff' };
        }
        if (name.includes('slack') || name.includes('슬랙')) {
            return { icon: 'fab fa-slack', color: '#4a154b' };
        }
        if (name.includes('figma') || name.includes('피그마')) {
            return { icon: 'fas fa-paint-brush', color: '#f24e1e' };
        }
        if (name.includes('trello') || name.includes('트렐로')) {
            return { icon: 'fab fa-trello', color: '#0079bf' };
        }
        if (name.includes('asana') || name.includes('아사나')) {
            return { icon: 'fas fa-tasks', color: '#f06a6a' };
        }
        if (name.includes('jira') || name.includes('지라')) {
            return { icon: 'fas fa-bug', color: '#0052cc' };
        }
        if (name.includes('confluence') || name.includes('컨플루언스')) {
            return { icon: 'fas fa-book', color: '#172b4d' };
        }
        if (name.includes('github') || name.includes('깃허브')) {
            return { icon: 'fab fa-github', color: '#333333' };
        }
        if (name.includes('gitlab') || name.includes('깃랩')) {
            return { icon: 'fab fa-gitlab', color: '#fc6d26' };
        }
        if (name.includes('bitbucket') || name.includes('비트버킷')) {
            return { icon: 'fab fa-bitbucket', color: '#0052cc' };
        }
        
        // 뉴스/미디어
        if (name.includes('new york times') || name.includes('뉴욕타임스')) {
            return { icon: 'fas fa-newspaper', color: '#000000' };
        }
        if (name.includes('wall street') || name.includes('월스트리트')) {
            return { icon: 'fas fa-chart-line', color: '#00a651' };
        }
        if (name.includes('economist') || name.includes('이코노미스트')) {
            return { icon: 'fas fa-globe', color: '#e3120b' };
        }
        if (name.includes('bloomberg') || name.includes('블룸버그')) {
            return { icon: 'fas fa-chart-bar', color: '#ff6600' };
        }
        if (name.includes('reuters') || name.includes('로이터')) {
            return { icon: 'fas fa-globe-americas', color: '#ff6600' };
        }
        if (name.includes('cnn') || name.includes('씨엔엔')) {
            return { icon: 'fas fa-tv', color: '#cc0000' };
        }
        if (name.includes('bbc') || name.includes('비비씨')) {
            return { icon: 'fas fa-broadcast-tower', color: '#bb0000' };
        }
        
        // 게임
        if (name.includes('steam') || name.includes('스팀')) {
            return { icon: 'fab fa-steam', color: '#171a21' };
        }
        if (name.includes('xbox') || name.includes('엑스박스')) {
            return { icon: 'fab fa-xbox', color: '#107c10' };
        }
        if (name.includes('playstation') || name.includes('플레이스테이션')) {
            return { icon: 'fab fa-playstation', color: '#003791' };
        }
        if (name.includes('nintendo') || name.includes('닌텐도')) {
            return { icon: 'fas fa-gamepad', color: '#e60012' };
        }
        
        // 소셜 미디어
        if (name.includes('instagram') || name.includes('인스타그램')) {
            return { icon: 'fab fa-instagram', color: '#e4405f' };
        }
        if (name.includes('facebook') || name.includes('페이스북')) {
            return { icon: 'fab fa-facebook', color: '#1877f2' };
        }
        if (name.includes('twitter') || name.includes('트위터') || name.includes('x')) {
            return { icon: 'fab fa-twitter', color: '#1da1f2' };
        }
        if (name.includes('linkedin') || name.includes('링크드인')) {
            return { icon: 'fab fa-linkedin', color: '#0077b5' };
        }
        if (name.includes('tiktok') || name.includes('틱톡')) {
            return { icon: 'fab fa-tiktok', color: '#000000' };
        }
        if (name.includes('snapchat') || name.includes('스냅챗')) {
            return { icon: 'fab fa-snapchat', color: '#fffc00' };
        }
        if (name.includes('discord') || name.includes('디스코드')) {
            return { icon: 'fab fa-discord', color: '#5865f2' };
        }
        if (name.includes('telegram') || name.includes('텔레그램')) {
            return { icon: 'fab fa-telegram', color: '#0088cc' };
        }
        if (name.includes('whatsapp') || name.includes('왓츠앱')) {
            return { icon: 'fab fa-whatsapp', color: '#25d366' };
        }
        
        // 교육 및 학습
        if (name.includes('coursera') || name.includes('코세라')) {
            return { icon: 'fas fa-graduation-cap', color: '#0056d3' };
        }
        if (name.includes('udemy') || name.includes('유데미')) {
            return { icon: 'fas fa-book-open', color: '#a435f0' };
        }
        if (name.includes('khan') || name.includes('칸아카데미')) {
            return { icon: 'fas fa-chalkboard-teacher', color: '#14bf96' };
        }
        if (name.includes('duolingo') || name.includes('듀오링고')) {
            return { icon: 'fas fa-language', color: '#58cc02' };
        }
        if (name.includes('masterclass') || name.includes('마스터클래스')) {
            return { icon: 'fas fa-crown', color: '#000000' };
        }
        
        // 금융 및 투자
        if (name.includes('robinhood') || name.includes('로빈후드')) {
            return { icon: 'fas fa-chart-line', color: '#00c805' };
        }
        if (name.includes('coinbase') || name.includes('코인베이스')) {
            return { icon: 'fab fa-bitcoin', color: '#0052ff' };
        }
        if (name.includes('paypal') || name.includes('페이팔')) {
            return { icon: 'fab fa-paypal', color: '#0070ba' };
        }
        if (name.includes('stripe') || name.includes('스트라이프')) {
            return { icon: 'fas fa-credit-card', color: '#635bff' };
        }
        if (name.includes('square') || name.includes('스퀘어')) {
            return { icon: 'fas fa-square', color: '#00d924' };
        }
        
        // 기타 일반적인 패턴
        if (name.includes('music') || name.includes('음악')) {
            return { icon: 'fas fa-music', color: '#667eea' };
        }
        if (name.includes('video') || name.includes('비디오') || name.includes('영상')) {
            return { icon: 'fas fa-video', color: '#667eea' };
        }
        if (name.includes('cloud') || name.includes('클라우드')) {
            return { icon: 'fas fa-cloud', color: '#667eea' };
        }
        if (name.includes('office') || name.includes('오피스')) {
            return { icon: 'fas fa-file-alt', color: '#667eea' };
        }
        if (name.includes('news') || name.includes('뉴스')) {
            return { icon: 'fas fa-newspaper', color: '#667eea' };
        }
        if (name.includes('game') || name.includes('게임')) {
            return { icon: 'fas fa-gamepad', color: '#667eea' };
        }
        if (name.includes('storage') || name.includes('저장')) {
            return { icon: 'fas fa-hdd', color: '#667eea' };
        }
        if (name.includes('streaming') || name.includes('스트리밍')) {
            return { icon: 'fas fa-play-circle', color: '#667eea' };
        }
        if (name.includes('ai') || name.includes('인공지능')) {
            return { icon: 'fas fa-robot', color: '#667eea' };
        }
        if (name.includes('security') || name.includes('보안')) {
            return { icon: 'fas fa-shield-alt', color: '#667eea' };
        }
        if (name.includes('database') || name.includes('데이터베이스')) {
            return { icon: 'fas fa-database', color: '#667eea' };
        }
        if (name.includes('analytics') || name.includes('분석')) {
            return { icon: 'fas fa-chart-pie', color: '#667eea' };
        }
        
        // 기본값 (별 아이콘)
        return { icon: 'fas fa-star', color: '#667eea' };
    }

    // 구독명에 따른 카테고리 매칭
    getCategoryForSubscription(subscriptionName) {
        const name = subscriptionName.toLowerCase();
        
        // AI 서비스
        if (name.includes('chatgpt') || name.includes('chat gpt') || name.includes('openai') ||
            name.includes('claude') || name.includes('클로드') || name.includes('gemini') || 
            name.includes('제미나이') || name.includes('copilot') || name.includes('코파일럿')) {
            return 'ai';
        }
        
        // 소셜 미디어
        if (name.includes('instagram') || name.includes('인스타그램') || name.includes('facebook') ||
            name.includes('페이스북') || name.includes('twitter') || name.includes('트위터') ||
            name.includes('linkedin') || name.includes('링크드인') || name.includes('tiktok') ||
            name.includes('틱톡') || name.includes('snapchat') || name.includes('스냅챗') ||
            name.includes('discord') || name.includes('디스코드') || name.includes('telegram') ||
            name.includes('텔레그램') || name.includes('whatsapp') || name.includes('왓츠앱')) {
            return 'social';
        }
        
        // 교육 및 학습
        if (name.includes('coursera') || name.includes('코세라') || name.includes('udemy') ||
            name.includes('유데미') || name.includes('khan') || name.includes('칸아카데미') ||
            name.includes('duolingo') || name.includes('듀오링고') || name.includes('masterclass') ||
            name.includes('마스터클래스')) {
            return 'education';
        }
        
        // 금융 및 투자
        if (name.includes('robinhood') || name.includes('로빈후드') || name.includes('coinbase') ||
            name.includes('코인베이스') || name.includes('paypal') || name.includes('페이팔') ||
            name.includes('stripe') || name.includes('스트라이프') || name.includes('square') ||
            name.includes('스퀘어')) {
            return 'finance';
        }
        
        // 개발 도구
        if (name.includes('github') || name.includes('깃허브') || name.includes('gitlab') ||
            name.includes('깃랩') || name.includes('bitbucket') || name.includes('비트버킷') ||
            name.includes('jira') || name.includes('지라') || name.includes('confluence') ||
            name.includes('컨플루언스')) {
            return 'development';
        }
        
        // 게임
        if (name.includes('steam') || name.includes('스팀') || name.includes('xbox') ||
            name.includes('엑스박스') || name.includes('playstation') || name.includes('플레이스테이션') ||
            name.includes('nintendo') || name.includes('닌텐도')) {
            return 'gaming';
        }
        
        // 뉴스 및 미디어
        if (name.includes('new york times') || name.includes('뉴욕타임스') || name.includes('wall street') ||
            name.includes('월스트리트') || name.includes('economist') || name.includes('이코노미스트') ||
            name.includes('bloomberg') || name.includes('블룸버그') || name.includes('reuters') ||
            name.includes('로이터') || name.includes('cnn') || name.includes('씨엔엔') ||
            name.includes('bbc') || name.includes('비비씨')) {
            return 'news';
        }
        
        // 생산성 도구
        if (name.includes('microsoft') || name.includes('마이크로소프트') || name.includes('adobe') ||
            name.includes('아도비') || name.includes('notion') || name.includes('노션') ||
            name.includes('canva') || name.includes('캔바') || name.includes('zoom') ||
            name.includes('줌') || name.includes('slack') || name.includes('슬랙') ||
            name.includes('figma') || name.includes('피그마') || name.includes('trello') ||
            name.includes('트렐로') || name.includes('asana') || name.includes('아사나')) {
            return 'productivity';
        }
        
        // 클라우드
        if (name.includes('google drive') || name.includes('구글 드라이브') || name.includes('dropbox') ||
            name.includes('드롭박스') || name.includes('icloud') || name.includes('아이클라우드') ||
            name.includes('onedrive') || name.includes('원드라이브') || name.includes('cloud') ||
            name.includes('클라우드')) {
            return 'cloud';
        }
        
        // 음악
        if (name.includes('spotify') || name.includes('스포티파이') || name.includes('apple music') ||
            name.includes('애플 뮤직') || name.includes('melon') || name.includes('멜론') ||
            name.includes('genie') || name.includes('지니') || name.includes('music') ||
            name.includes('음악')) {
            return 'music';
        }
        
        // 엔터테인먼트
        if (name.includes('netflix') || name.includes('넷플릭스') || name.includes('youtube') ||
            name.includes('유튜브') || name.includes('disney') || name.includes('디즈니') ||
            name.includes('amazon') || name.includes('아마존') || name.includes('twitch') ||
            name.includes('트위치') || name.includes('hulu') || name.includes('훌루') ||
            name.includes('hbo') || name.includes('video') || name.includes('비디오') ||
            name.includes('영상') || name.includes('streaming') || name.includes('스트리밍')) {
            return 'entertainment';
        }
        
        // 보안
        if (name.includes('security') || name.includes('보안') || name.includes('vpn') ||
            name.includes('antivirus') || name.includes('안티바이러스')) {
            return 'security';
        }
        
        // 기본값
        return 'other';
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
}

const app = new SmartSubscriptionApp();

