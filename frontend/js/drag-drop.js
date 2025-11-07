class DragDropManager {
    constructor() {
        this.draggedElement = null;
        this.dragOverElement = null;
        this.init();
    }

    init() {
        // 구독 목록이 업데이트될 때마다 drag & drop 초기화
        this.setupDragAndDrop();
        
        // DOM 변경 감지 (MutationObserver)
        const observer = new MutationObserver(() => {
            this.setupDragAndDrop();
        });
        
        const subscriptionList = document.getElementById('allSubscriptions');
        if (subscriptionList) {
            observer.observe(subscriptionList, { childList: true, subtree: true });
        }
    }

    // Drag and Drop 설정
    setupDragAndDrop() {
        const subscriptionItems = document.querySelectorAll('.subscription-item');
        
        subscriptionItems.forEach((item, index) => {
            // 드래그 가능하게 설정
            item.setAttribute('draggable', 'true');
            item.dataset.originalIndex = index;
            
            // 드래그 시작
            item.addEventListener('dragstart', (e) => {
                this.handleDragStart(e, item);
            });
            
            // 드래그 중
            item.addEventListener('dragover', (e) => {
                this.handleDragOver(e, item);
            });
            
            // 드래그 진입
            item.addEventListener('dragenter', (e) => {
                this.handleDragEnter(e, item);
            });
            
            // 드래그 떠남
            item.addEventListener('dragleave', (e) => {
                this.handleDragLeave(e, item);
            });
            
            // 드롭
            item.addEventListener('drop', (e) => {
                this.handleDrop(e, item);
            });
            
            // 드래그 종료
            item.addEventListener('dragend', (e) => {
                this.handleDragEnd(e);
            });
        });
    }

    // 드래그 시작
    handleDragStart(e, item) {
        this.draggedElement = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', item.innerHTML);
        
        // 드래그 이미지 설정
        const dragImage = item.cloneNode(true);
        dragImage.style.opacity = '0.5';
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        setTimeout(() => document.body.removeChild(dragImage), 0);
    }

    // 드래그 중 (다른 요소 위에 있을 때)
    handleDragOver(e, item) {
        if (this.draggedElement && item !== this.draggedElement) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            
            // 위/아래 구분하여 삽입 위치 결정
            if (e.clientY < midY) {
                item.classList.add('drag-over-top');
                item.classList.remove('drag-over-bottom');
            } else {
                item.classList.add('drag-over-bottom');
                item.classList.remove('drag-over-top');
            }
        }
    }

    // 드래그 진입
    handleDragEnter(e, item) {
        if (this.draggedElement && item !== this.draggedElement) {
            e.preventDefault();
            item.classList.add('drag-over');
        }
    }

    // 드래그 떠남
    handleDragLeave(e, item) {
        item.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
    }

    // 드롭
    handleDrop(e, item) {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.draggedElement && item !== this.draggedElement) {
            const container = item.parentElement;
            const draggedIndex = Array.from(container.children).indexOf(this.draggedElement);
            const dropIndex = Array.from(container.children).indexOf(item);
            
            const rect = item.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            
            // 삽입 위치 결정
            if (e.clientY < midY) {
                // 위에 삽입
                container.insertBefore(this.draggedElement, item);
            } else {
                // 아래에 삽입
                container.insertBefore(this.draggedElement, item.nextSibling);
            }
            
            // 순서 업데이트를 Ajax로 저장
            this.saveOrderToBackend();
        }
        
        // 스타일 정리
        item.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
    }

    // 드래그 종료
    handleDragEnd(e) {
        const subscriptionItems = document.querySelectorAll('.subscription-item');
        subscriptionItems.forEach(item => {
            item.classList.remove('dragging', 'drag-over', 'drag-over-top', 'drag-over-bottom');
        });
        
        this.draggedElement = null;
        this.dragOverElement = null;
    }

    // Ajax를 통한 순서 저장
    async saveOrderToBackend() {
        const container = document.getElementById('allSubscriptions');
        if (!container) return;
        
        const items = Array.from(container.querySelectorAll('.subscription-item'));
        const orderedIds = items.map(item => {
            // 구독 ID 추출 (버튼의 onclick에서 추출)
            const editBtn = item.querySelector('button[onclick*="editSubscription"]');
            if (editBtn) {
                const onclick = editBtn.getAttribute('onclick');
                const match = onclick.match(/editSubscription\((\d+)\)/);
                if (match) {
                    return parseInt(match[1]);
                }
            }
            // 또는 data 속성에서 ID 추출 시도
            const subscriptionId = item.dataset.subscriptionId;
            if (subscriptionId) {
                return parseInt(subscriptionId);
            }
            return null;
        }).filter(id => id !== null);
        
        if (orderedIds.length === 0) {
            console.warn('저장할 구독 ID를 찾을 수 없습니다.');
            return;
        }
        
        try {
            // 백엔드에 순서 저장 API 호출
            const response = await apiManager.updateSubscriptionOrder(orderedIds);
            
            if (response.success) {
                this.showOrderSavedFeedback();
                
                // 로컬 데이터도 업데이트
                if (typeof app !== 'undefined') {
                    // displayOrder 업데이트
                    orderedIds.forEach((id, index) => {
                        const subscription = app.subscriptions.find(sub => sub.id === id);
                        if (subscription) {
                            subscription.displayOrder = index;
                        }
                    });
                    app.saveData();
                }
            } else {
                console.error('순서 저장 실패:', response.message);
                app.showNotification('순서 저장에 실패했습니다: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('순서 저장 중 오류:', error);
            if (typeof app !== 'undefined') {
                app.showNotification('순서 저장 중 오류가 발생했습니다.', 'error');
            }
        }
    }

    // 순서 저장 완료 피드백
    showOrderSavedFeedback() {
        const feedback = document.createElement('div');
        feedback.className = 'order-saved-feedback';
        feedback.textContent = '✓ 순서가 저장되었습니다';
        feedback.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }
}

const dragDropManager = new DragDropManager();

