class NewsManager {
    constructor() {
        this.currentCategory = 'all';
        this.subscriptionCategories = new Set();
        this.initialized = false;
        this.loading = false;
        this.init();
    }

    init() {
        const initWhenReady = () => {
            const newsContent = document.getElementById('newsContent');
            if (!newsContent) {
                setTimeout(initWhenReady, 50);
                return;
            }
            
            this.setupEventListeners();
            this.loadSubscriptionCategories();
            this.initialized = true;
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initWhenReady);
        } else {
            setTimeout(initWhenReady, 100);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.getAttribute('data-category');
                this.setActiveCategory(category);
            });
        });

        const refreshBtn = document.getElementById('refreshNewsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadNews(this.currentCategory);
            });
        }
    }

    loadSubscriptionCategories() {
        if (typeof app !== 'undefined' && app.subscriptions) {
            app.subscriptions.forEach(sub => {
                if (sub.category && sub.status === 'active') {
                    this.subscriptionCategories.add(sub.category);
                }
            });
        }
    }

    setActiveCategory(category) {
        this.currentCategory = category;
        
        document.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-category') === category) {
                btn.classList.add('active');
            }
        });

        this.loadNews(category);
    }

    async loadNews(category = 'all') {
        if (this.loading) {
            return;
        }
        
        if (!this.initialized) {
            let attempts = 0;
            while (!this.initialized && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 50));
                attempts++;
            }
            if (!this.initialized) {
                console.error('NewsManager 초기화 시간 초과');
                this.init();
            }
        }
        
        const newsContent = document.getElementById('newsContent');
        if (!newsContent) {
            console.error('newsContent 요소를 찾을 수 없습니다.');
            return;
        }

        if (typeof apiManager === 'undefined') {
            let attempts = 0;
            while (typeof apiManager === 'undefined' && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 50));
                attempts++;
            }
            if (typeof apiManager === 'undefined') {
                console.error('apiManager를 찾을 수 없습니다.');
                newsContent.innerHTML = '<div class="news-error">API 관리자를 초기화할 수 없습니다.</div>';
                return;
            }
        }

        this.loading = true;
        newsContent.innerHTML = '<div class="news-loading">뉴스를 불러오는 중...</div>';

        try {
            if (category === 'all') {
                await this.loadAllCategoryNews();
            } else {
                const newsData = await apiManager.fetchNewsByCategory(category, 5);
                const articles = newsData.articles || [];
                this.displayNews(articles, category);
            }
        } catch (error) {
            console.error('뉴스 로드 실패:', error);
            newsContent.innerHTML = '<div class="news-error">뉴스를 불러오는 중 오류가 발생했습니다: ' + error.message + '</div>';
        } finally {
            this.loading = false;
        }
    }

    async loadAllCategoryNews() {
        const newsContent = document.getElementById('newsContent');
        const categories = Array.from(this.subscriptionCategories);
        
        if (categories.length === 0) {
            const newsData = await apiManager.fetchNewsByCategory('technology', 5);
            const articles = newsData.articles || [];
            this.displayNews(articles, 'technology');
            return;
        }

        const allNews = [];
        for (const category of categories.slice(0, 3)) {
            try {
                const newsData = await apiManager.fetchNewsByCategory(category, 3);
                if (newsData.articles && newsData.articles.length > 0) {
                    newsData.articles.forEach(article => {
                        article.category = category;
                        allNews.push(article);
                    });
                }
            } catch (error) {
                console.warn(`${category} 카테고리 뉴스 로드 실패:`, error);
            }
        }

        allNews.sort((a, b) => {
            const dateA = new Date(a.publishedAt || 0);
            const dateB = new Date(b.publishedAt || 0);
            return dateB - dateA;
        });

        this.displayNews(allNews.slice(0, 10), 'all');
    }

    displayNews(articles, category) {
        const newsContent = document.getElementById('newsContent');
        
        if (!articles || articles.length === 0) {
            apiManager.fetchNewsByCategory('technology', 5).then(newsData => {
                if (newsData.articles && newsData.articles.length > 0) {
                    this.displayNews(newsData.articles, 'technology');
                } else {
                    newsContent.innerHTML = '<div class="news-empty">해당 카테고리의 뉴스가 없습니다.</div>';
                }
            }).catch(() => {
                newsContent.innerHTML = '<div class="news-empty">해당 카테고리의 뉴스가 없습니다.</div>';
            });
            return;
        }

        const categoryNames = {
            'entertainment': '엔터테인먼트',
            'music': '음악',
            'productivity': '생산성',
            'cloud': '클라우드',
            'ai': 'AI',
            'development': '개발',
            'all': '전체'
        };

        let html = `<div class="news-list">`;
        
        articles.forEach((article, index) => {
            const categoryName = categoryNames[article.category || category] || article.category || category;
            const publishDate = this.formatDate(article.publishedAt);
            
            html += `
                <div class="news-item">
                    <div class="news-item-header">
                        <span class="news-category-badge">${categoryName}</span>
                        <span class="news-date">${publishDate}</span>
                    </div>
                    <h3 class="news-title">
                        <a href="${article.url || '#'}" target="_blank" rel="noopener noreferrer">
                            ${article.title || '제목 없음'}
                        </a>
                    </h3>
                    <p class="news-description">${article.description || '설명 없음'}</p>
                    <div class="news-item-footer">
                        <span class="news-source">${article.source?.name || '출처 없음'}</span>
                        <a href="${article.url || '#'}" target="_blank" rel="noopener noreferrer" class="news-link">
                            더 알아보기 <i class="fas fa-external-link-alt"></i>
                        </a>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        newsContent.innerHTML = html;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (minutes < 1) return '방금 전';
            if (minutes < 60) return `${minutes}분 전`;
            if (hours < 24) return `${hours}시간 전`;
            if (days < 7) return `${days}일 전`;
            
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return '';
        }
    }

    updateNews() {
        if (this.currentCategory) {
            this.loadNews(this.currentCategory);
        }
    }
}

const newsManager = new NewsManager();

