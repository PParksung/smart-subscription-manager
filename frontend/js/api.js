// 백엔드 API 통신 관리
class APIManager {
    constructor() {
        this.baseURL = 'http://localhost:8081/api';
    }

    // 공통 API 요청 처리
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };
        
        try {
            const response = await fetch(url, mergedOptions);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API 호출 실패 (${endpoint}):`, error);
            throw error;
        }
    }

    async signup(userData) {
        return await this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(email, password) {
        return await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async logout() {
        return await this.request('/auth/logout', {
            method: 'POST'
        });
    }

    async checkSession() {
        return await this.request('/auth/session', {
            method: 'GET'
        });
    }

    async getSubscriptions() {
        return await this.request('/subscriptions', {
            method: 'GET'
        });
    }

    async addSubscription(subscriptionData) {
        return await this.request('/subscriptions', {
            method: 'POST',
            body: JSON.stringify(subscriptionData)
        });
    }

    async updateSubscription(id, subscriptionData) {
        return await this.request(`/subscriptions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(subscriptionData)
        });
    }

    async deleteSubscription(id) {
        return await this.request(`/subscriptions/${id}`, {
            method: 'DELETE'
        });
    }

    async getSubscription(id) {
        return await this.request(`/subscriptions/${id}`, {
            method: 'GET'
        });
    }

    async updateSubscriptionOrder(orderedIds) {
        return await this.request('/subscriptions/order', {
            method: 'PUT',
            body: JSON.stringify({ orderedIds })
        });
    }

    async fetchExchangeRates() {
        try {
            const response = await this.request('/exchange-rates', {
                method: 'GET'
            });
            
            if (response && response.success) {
                return this.processExchangeRates(response);
            } else {
                throw new Error('환율 API 응답이 올바르지 않습니다.');
            }
        } catch (error) {
            console.warn('외부 환율 API 호출 실패 (폴백 데이터 사용):', error.message);
            return this.getFallbackExchangeRates();
        }
    }

    processExchangeRates(data) {
        return {
            base: data.base || 'USD',
            date: data.date || new Date().toISOString().split('T')[0],
            rates: data.rates || {
                USD: 1,
                KRW: 1350,
                EUR: 0.92,
                JPY: 150,
                CNY: 7.2
            },
            source: data.source || 'external_api'
        };
    }

    getFallbackExchangeRates() {
        return {
            base: 'USD',
            date: new Date().toISOString().split('T')[0],
            rates: {
                USD: 1,
                KRW: 1350, // 1 USD = 1350 KRW
                EUR: 0.92,
                JPY: 150,
                CNY: 7.2
            },
            source: 'fallback'
        };
    }

    async fetchNewsByCategory(category = 'technology', pageSize = 5) {
        try {
            const response = await this.request(`/news?category=${category}&pageSize=${pageSize}`, {
                method: 'GET'
            });
            
            if (response && response.success) {
                return response;
            } else {
                throw new Error('뉴스 API 응답이 올바르지 않습니다.');
            }
        } catch (error) {
            console.warn('뉴스 API 호출 실패:', error.message);
            return {
                success: false,
                category: category,
                articles: [],
                source: 'fallback'
            };
        }
    }

    async sendDebugLog(level = 'INFO', message = '', data = null) {
        try {
            await this.request('/debug/log', {
                method: 'POST',
                body: JSON.stringify({
                    level: level,
                    message: message,
                    data: data
                })
            });
        } catch (error) {
            console.error('디버그 로그 전송 실패:', error);
        }
    }
}

const apiManager = new APIManager();
