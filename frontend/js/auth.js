// 사용자 인증 및 세션 관리
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.loggingOut = false;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 100);
        }
    }

    // 인증 매니저 초기화
    async init() {
        if (typeof apiManager === 'undefined') {
            setTimeout(() => this.init(), 50);
            return;
        }
        
        await this.loadUserFromStorage();
        this.updateUI();
        
        if (this.isAuthenticated && typeof app !== 'undefined') {
            setTimeout(() => {
                if (app && !app.currentSection) {
                    app.init();
                }
            }, 100);
        }
    }

    // 스토리지에서 사용자 정보 로드
    async loadUserFromStorage() {
        if (typeof apiManager === 'undefined') {
            setTimeout(() => this.loadUserFromStorage(), 50);
            return;
        }
        
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionUser) {
            try {
                const sessionResponse = await apiManager.checkSession();
                if (sessionResponse && sessionResponse.authenticated) {
                    this.currentUser = {
                        id: sessionResponse.userId,
                        name: sessionResponse.userName,
                        email: sessionResponse.userEmail
                    };
                    this.isAuthenticated = true;
                    sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                    return;
                }
            } catch (error) {
                console.error('세션 확인 실패:', error);
            }
        }
        
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                const sessionResponse = await apiManager.checkSession();
                if (sessionResponse && sessionResponse.authenticated) {
                    this.currentUser = JSON.parse(savedUser);
                    this.isAuthenticated = true;
                    sessionStorage.setItem('currentUser', savedUser);
                    return;
                } else {
                    localStorage.removeItem('currentUser');
                }
            } catch (error) {
                console.error('세션 확인 실패:', error);
            }
        }
        
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    // UI 상태 업데이트 (로그인/로그아웃 상태에 따라)
    updateUI() {
        const userMenu = document.getElementById('userMenuContainer');
        const mainContent = document.querySelector('.main');
        const loginContainer = document.querySelector('.login-container');
        const header = document.querySelector('.header');
        
        if (!userMenu) return;
        
        if (this.isAuthenticated) {
            userMenu.innerHTML = `
                <span class="user-info">안녕하세요, ${this.currentUser.name}님</span>
                <button class="btn btn-outline" id="logoutBtn" onclick="authManager.logout()">로그아웃</button>
            `;
            
            if (mainContent) {
                mainContent.style.cssText = '';
                mainContent.classList.remove('hidden');
                mainContent.style.display = 'block';
                mainContent.style.visibility = 'visible';
                
                const dashboardSection = document.getElementById('dashboard');
                if (dashboardSection) {
                    dashboardSection.classList.add('active');
                    dashboardSection.style.display = 'block';
                    dashboardSection.style.visibility = 'visible';
                }
            }
            
            if (loginContainer) {
                loginContainer.style.cssText = '';
                loginContainer.classList.add('hidden');
                loginContainer.style.display = 'none';
                loginContainer.style.visibility = 'hidden';
            }
            
            if (header) {
                const nav = header.querySelector('.nav');
                if (nav) {
                    nav.style.display = '';
                }
            }
            
            document.querySelectorAll('.nav-link').forEach(link => {
                link.style.pointerEvents = '';
            });
        } else {
            userMenu.innerHTML = `
                <button class="btn btn-outline" id="loginBtn" onclick="authManager.showLoginModal()">로그인</button>
                <button class="btn btn-primary" id="signupBtn" onclick="authManager.showSignupModal()">회원가입</button>
            `;
            
            if (mainContent) {
                mainContent.style.cssText = '';
                mainContent.style.setProperty('display', 'none', 'important');
                mainContent.style.setProperty('visibility', 'hidden', 'important');
                mainContent.style.setProperty('opacity', '0', 'important');
                mainContent.classList.add('hidden');
            }
            
            if (loginContainer) {
                loginContainer.style.cssText = '';
                loginContainer.style.setProperty('display', 'flex', 'important');
                loginContainer.style.setProperty('visibility', 'visible', 'important');
                loginContainer.style.setProperty('opacity', '1', 'important');
                loginContainer.classList.remove('hidden');
            }
            
            if (header) {
                const nav = header.querySelector('.nav');
                if (nav) {
                    nav.style.display = 'none';
                }
            }
            
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                link.style.pointerEvents = 'none';
            });
        }
    }

    showLoginModal() {
        const content = `
            <form id="loginForm">
                <div class="form-group">
                    <label for="loginEmail">이메일</label>
                    <input type="email" id="loginEmail" required placeholder="이메일을 입력하세요">
                </div>
                <div class="form-group">
                    <label for="loginPassword">비밀번호</label>
                    <input type="password" id="loginPassword" required placeholder="비밀번호를 입력하세요">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="authManager.hideModal()">취소</button>
                    <button type="submit" class="btn btn-primary">로그인</button>
                </div>
            </form>
        `;

        this.showModal('로그인', content);

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
    }

    showSignupModal() {
        const content = `
            <form id="signupForm">
                <div class="form-group">
                    <label for="signupName">이름</label>
                    <input type="text" id="signupName" required placeholder="이름을 입력하세요">
                </div>
                <div class="form-group">
                    <label for="signupEmail">이메일</label>
                    <input type="email" id="signupEmail" required placeholder="이메일을 입력하세요">
                </div>
                <div class="form-group">
                    <label for="signupPassword">비밀번호</label>
                    <input type="password" id="signupPassword" required placeholder="비밀번호를 입력하세요 (최소 8자)">
                </div>
                <div class="form-group">
                    <label for="signupPasswordConfirm">비밀번호 확인</label>
                    <input type="password" id="signupPasswordConfirm" required placeholder="비밀번호를 다시 입력하세요">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="authManager.hideModal()">취소</button>
                    <button type="submit" class="btn btn-primary">회원가입</button>
                </div>
            </form>
        `;

        this.showModal('회원가입', content);

        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.signup();
        });
    }

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showNotification('이메일과 비밀번호를 입력해주세요.', 'error');
            return;
        }

        try {
            const response = await apiManager.login(email, password);
            
            if (response.success) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                this.saveUserToStorage();
                sessionStorage.setItem('currentUser', JSON.stringify(response.user));
                if (response.sessionId) {
                    sessionStorage.setItem('sessionId', response.sessionId);
                }
                
                try {
                    const sessionCheck = await apiManager.checkSession();
                    if (!sessionCheck || !sessionCheck.authenticated) {
                        console.warn('세션이 제대로 설정되지 않았습니다.');
                    }
                } catch (sessionError) {
                    console.error('세션 확인 실패:', sessionError);
                }
                
                this.hideModal();
                this.showNotification('로그인되었습니다.', 'success');
                this.updateUI();
                
                setTimeout(() => {
                    if (typeof app !== 'undefined') {
                        window.history.replaceState({ section: 'dashboard' }, '', '/dashboard');
                        app.init();
                    }
                }, 200);
            } else {
                this.showNotification(response.message || '로그인에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('로그인 오류:', error);
            this.showNotification('로그인 중 오류가 발생했습니다.', 'error');
        }
    }

    async signup() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

        if (!name || !email || !password || !passwordConfirm) {
            this.showNotification('모든 필드를 입력해주세요.', 'error');
            return;
        }

        if (password.length < 8) {
            this.showNotification('비밀번호는 최소 8자 이상이어야 합니다.', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            this.showNotification('비밀번호가 일치하지 않습니다.', 'error');
            return;
        }

        try {
            const response = await apiManager.signup({ name, email, password });
            
            if (response.success) {
                const loginResponse = await apiManager.login(email, password);
                
                if (loginResponse.success) {
                    this.currentUser = response.user;
                    this.isAuthenticated = true;
                    this.saveUserToStorage();
                    sessionStorage.setItem('currentUser', JSON.stringify(response.user));
                    sessionStorage.setItem('sessionId', loginResponse.sessionId);
                    
                    this.updateUI();
                    this.hideModal();
                    this.showNotification('회원가입이 완료되었습니다.', 'success');

                    if (typeof app !== 'undefined') {
                        app.init();
                    }
                } else {
                    this.showNotification('회원가입은 완료되었으나 자동 로그인에 실패했습니다. 다시 로그인해주세요.', 'warning');
                }
            } else {
                this.showNotification(response.message || '회원가입에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('회원가입 오류:', error);
            this.showNotification('회원가입 중 오류가 발생했습니다.', 'error');
        }
    }

    // 로그아웃 처리
    async logout() {
        if (this.loggingOut) {
            return;
        }
        
        this.loggingOut = true;
        this.isAuthenticated = false;
        this.currentUser = null;
        
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('lastSection');
        
        if (typeof app !== 'undefined') {
            app.currentSection = null;
            app.subscriptions = [];
            app.currentUser = null;
        }
        
        this.showLoginPage();
        this.updateUI();
        this.showNotification('로그아웃되었습니다.', 'success');
        
        apiManager.logout().catch(error => {
            console.error('로그아웃 오류:', error);
        });
        
        setTimeout(() => {
            this.loggingOut = false;
        }, 500);
    }

    saveUserToStorage() {
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
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

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    checkAuth() {
        return this.isAuthenticated;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // 로그인 페이지 표시
    showLoginPage() {
        if (window.location.pathname !== '/') {
            window.history.replaceState(null, '', '/');
        }
        
        if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
        }
        
        document.querySelectorAll('.section').forEach(section => {
            section.style.setProperty('display', 'none', 'important');
        });
        
        const loginContainer = document.querySelector('.login-container');
        const mainContent = document.querySelector('.main');
        const header = document.querySelector('.header');
        
        if (loginContainer) {
            loginContainer.classList.remove('hidden');
            loginContainer.style.setProperty('display', 'flex', 'important');
            loginContainer.style.setProperty('visibility', 'visible', 'important');
        }
        
        if (mainContent) {
            mainContent.classList.add('hidden');
            mainContent.style.setProperty('display', 'none', 'important');
        }
        
        if (header) {
            const nav = header.querySelector('.nav');
            if (nav) {
                nav.style.display = 'none';
            }
        }
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            link.style.pointerEvents = 'none';
        });
        
        window.scrollTo(0, 0);
    }
}

const authManager = new AuthManager();
