class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.payments = [];
    }

    updateCalendar() {
        this.loadPayments();
        this.initializeYearSelect();
        this.renderCalendar();
    }

    /**
     * 결제 데이터 로드
     * 활성 구독의 nextPaymentDate를 YYYY-MM-DD 형식으로 파싱하여 payments 배열에 저장
     */
    loadPayments() {
        if (!app || !app.subscriptions) {
            this.payments = [];
            return;
        }
        
        const activeSubs = app.subscriptions.filter(sub => sub.status === 'active' && sub.nextPaymentDate);
        
        this.payments = activeSubs
            .map(sub => {
                let dateString = '';
                if (typeof sub.nextPaymentDate === 'string') {
                    const originalValue = sub.nextPaymentDate.trim();
                    const match = originalValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (match && match[0].length === 10) {
                        dateString = match[0];
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
                
                return {
                    id: sub.id,
                    name: sub.name,
                    amount: sub.amount || 0,
                    krwAmount: sub.krwAmount || sub.amount || 0,
                    dateString: dateString,
                    color: sub.color || '#1e88e5',
                    icon: sub.icon || 'fas fa-credit-card'
                };
            })
            .filter(payment => payment !== null && payment.dateString && payment.dateString.length === 10);
    }
    
    /**
     * Date 객체를 YYYY-MM-DD 문자열로 변환
     */
    dateToString(date) {
        if (!date || isNaN(date.getTime())) {
            return '';
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    /**
     * YYYY-MM-DD 문자열을 Date 객체로 변환
     * 타임존 문제 방지를 위해 T00:00:00을 추가하여 ISO 형식으로 파싱
     */
    stringToDate(dateString) {
        if (!dateString || dateString.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return null;
        }
        
        const isoDateString = dateString + 'T00:00:00';
        const date = new Date(isoDateString);
        
        if (isNaN(date.getTime())) {
            return null;
        }
        
        return date;
    }

    renderCalendar() {
        const calendar = document.getElementById('paymentCalendar');
        const monthYear = document.getElementById('currentMonth');
        
        if (!calendar || !monthYear) {
            return;
        }
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        monthYear.textContent = `${year}년 ${month + 1}월`;
        
        // 달력 시작일 계산 (이번 달 1일의 요일 기준)
        const firstDayString = `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00`;
        const firstDay = new Date(firstDayString);
        const firstDayOfWeek = firstDay.getDay();
        
        // 달력 시작 날짜 계산 (이전 달의 마지막 주 일요일부터)
        const startDay = 1 - firstDayOfWeek;
        let actualStartMonth = month;
        let actualStartYear = year;
        let startDate;
        
        if (startDay < 1) {
            actualStartMonth = month - 1;
            if (actualStartMonth < 0) {
                actualStartMonth = 11;
                actualStartYear = year - 1;
            }
            const daysInPrevMonth = new Date(actualStartYear, actualStartMonth + 1, 0).getDate();
            const actualStartDay = daysInPrevMonth + startDay;
            const startDateString = `${actualStartYear}-${String(actualStartMonth + 1).padStart(2, '0')}-${String(actualStartDay).padStart(2, '0')}T00:00:00`;
            startDate = new Date(startDateString);
        } else {
            const startDateString = `${actualStartYear}-${String(actualStartMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}T00:00:00`;
            startDate = new Date(startDateString);
        }
        
        let calendarHTML = '';
        
        // 요일 헤더
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        calendarHTML += '<div class="calendar-weekdays">';
        weekdays.forEach(day => {
            calendarHTML += `<div class="calendar-weekday">${day}</div>`;
        });
        calendarHTML += '</div>';
        
        // 6주 x 7일 = 42일 렌더링
        for (let week = 0; week < 6; week++) {
            calendarHTML += '<div class="calendar-week">';
            
            for (let day = 0; day < 7; day++) {
                const daysFromStart = week * 7 + day;
                
                // ISO 형식으로 날짜 생성 (타임존 문제 방지)
                const cellDateObj = new Date(startDate);
                cellDateObj.setDate(startDate.getDate() + daysFromStart);
                
                const cellYear = cellDateObj.getFullYear();
                const cellMonth = cellDateObj.getMonth() + 1;
                const cellDay = cellDateObj.getDate();
                const cellDateString = `${cellYear}-${String(cellMonth).padStart(2, '0')}-${String(cellDay).padStart(2, '0')}T00:00:00`;
                const cellDate = new Date(cellDateString);
                
                const dateString = this.dateToString(cellDate);
                
                if (dateString.length !== 10) {
                    calendarHTML += '<div class="calendar-day">-</div>';
                    continue;
                }
                
                const isCurrentMonth = cellDate.getMonth() === month;
                const isToday = this.isToday(cellDate);
                const hasPayment = this.hasPaymentOnDate(dateString);
                const payments = this.getPaymentsOnDate(dateString);
                
                let cellClass = 'calendar-day';
                if (!isCurrentMonth) cellClass += ' other-month';
                if (isToday) cellClass += ' today';
                if (hasPayment) cellClass += ' has-payment';
                
                const dayNumber = cellDate.getDate();
                
                calendarHTML += `
                    <div class="${cellClass}" 
                         data-date="${dateString}">
                        <div class="day-number">${dayNumber}</div>
                        ${hasPayment ? '<div class="payment-indicator"></div>' : ''}
                        ${payments.length > 0 ? this.renderPaymentsList(payments) : ''}
                    </div>
                `;
            }
            
            calendarHTML += '</div>';
        }
        
        calendar.innerHTML = calendarHTML;
        this.setupCalendarEvents();
    }

    hasPaymentOnDate(dateString) {
        if (!dateString || dateString.length !== 10) return false;
        return this.payments.some(p => p.dateString === dateString);
    }

    getPaymentsOnDate(dateString) {
        if (!dateString || dateString.length !== 10) return [];
        return this.payments.filter(p => p.dateString === dateString);
    }

    renderPaymentsList(payments) {
        if (payments.length === 0) return '';
        
        let html = '<div class="payments-list">';
        payments.forEach(payment => {
            const displayAmount = payment.krwAmount || payment.amount || 0;
            html += `
                <div class="payment-item" style="border-left-color: ${payment.color}">
                    <i class="${payment.icon}"></i>
                    <span class="payment-name">${payment.name}</span>
                    <span class="payment-amount">₩${displayAmount.toLocaleString()}</span>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    /**
     * 주어진 날짜가 오늘인지 확인
     */
    isToday(date) {
        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();
        const todayStringISO = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}T00:00:00`;
        const todayObj = new Date(todayStringISO);
        
        const todayString = this.dateToString(todayObj);
        const dateString = this.dateToString(date);
        return todayString === dateString;
    }

    initializeYearSelect() {
        const yearSelect = document.getElementById('yearSelect');
        const monthSelect = document.getElementById('monthSelect');
        
        if (!yearSelect || !monthSelect) return;
        
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '';
        
        for (let year = currentYear - 5; year <= currentYear + 5; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}년`;
            if (year === this.currentDate.getFullYear()) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
        
        monthSelect.value = this.currentDate.getMonth();
    }

    removeCalendarEvents() {
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        const yearSelect = document.getElementById('yearSelect');
        const monthSelect = document.getElementById('monthSelect');
        const calendar = document.getElementById('paymentCalendar');
        
        if (prevBtn && this.prevBtnHandler) {
            prevBtn.removeEventListener('click', this.prevBtnHandler);
        }
        if (nextBtn && this.nextBtnHandler) {
            nextBtn.removeEventListener('click', this.nextBtnHandler);
        }
        if (yearSelect && this.yearSelectHandler) {
            yearSelect.removeEventListener('change', this.yearSelectHandler);
        }
        if (monthSelect && this.monthSelectHandler) {
            monthSelect.removeEventListener('change', this.monthSelectHandler);
        }
        if (calendar && this.calendarClickHandler) {
            calendar.removeEventListener('click', this.calendarClickHandler);
        }
    }

    setupCalendarEvents() {
        this.removeCalendarEvents();
        
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        
        if (prevBtn) {
            this.prevBtnHandler = () => this.goToPreviousMonth();
            prevBtn.addEventListener('click', this.prevBtnHandler);
        }

        if (nextBtn) {
            this.nextBtnHandler = () => this.goToNextMonth();
            nextBtn.addEventListener('click', this.nextBtnHandler);
        }

        const yearSelect = document.getElementById('yearSelect');
        const monthSelect = document.getElementById('monthSelect');
        
        if (yearSelect) {
            this.yearSelectHandler = (e) => {
                const newYear = parseInt(e.target.value);
                const currentMonth = this.currentDate.getMonth();
                this.currentDate = new Date(newYear, currentMonth, 1);
                this.renderCalendar();
            };
            yearSelect.addEventListener('change', this.yearSelectHandler);
        }
        
        if (monthSelect) {
            this.monthSelectHandler = (e) => {
                const newMonth = parseInt(e.target.value);
                const currentYear = this.currentDate.getFullYear();
                this.currentDate = new Date(currentYear, newMonth, 1);
                this.renderCalendar();
            };
            monthSelect.addEventListener('change', this.monthSelectHandler);
        }

        // 날짜 클릭 이벤트
        const calendar = document.getElementById('paymentCalendar');
        
        if (calendar) {
            this.calendarClickHandler = (e) => {
                // payment-item 클릭 무시
                if (e.target.closest('.payment-item')) {
                    return;
                }
                
                const dayElement = e.target.closest('.calendar-day');
                
                if (dayElement) {
                    const dateString = dayElement.getAttribute('data-date');
                    
                    if (dateString && dateString.length === 10) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showDayDetails(dateString);
                    }
                }
            };
            
            calendar.addEventListener('click', this.calendarClickHandler);
        }
    }

    goToPreviousMonth() {
        const currentYear = this.currentDate.getFullYear();
        const currentMonth = this.currentDate.getMonth();
        
        let newYear = currentYear;
        let newMonth = currentMonth - 1;
        
        if (newMonth < 0) {
            newYear = currentYear - 1;
            newMonth = 11;
        }
        
        this.currentDate = new Date(newYear, newMonth, 1);
        this.updateSelectors();
        this.renderCalendar();
    }

    goToNextMonth() {
        const currentYear = this.currentDate.getFullYear();
        const currentMonth = this.currentDate.getMonth();
        
        let newYear = currentYear;
        let newMonth = currentMonth + 1;
        
        if (newMonth > 11) {
            newYear = currentYear + 1;
            newMonth = 0;
        }
        
        this.currentDate = new Date(newYear, newMonth, 1);
        this.updateSelectors();
        this.renderCalendar();
    }

    updateSelectors() {
        const yearSelect = document.getElementById('yearSelect');
        const monthSelect = document.getElementById('monthSelect');
        
        if (yearSelect) {
            yearSelect.value = this.currentDate.getFullYear();
        }
        
        if (monthSelect) {
            monthSelect.value = this.currentDate.getMonth();
        }
    }

    /**
     * 특정 날짜의 결제 상세 정보를 모달로 표시
     */
    showDayDetails(dateString) {
        if (!dateString || dateString.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return;
        }
        
        this.loadPayments();
        
        const payments = this.payments.filter(payment => payment.dateString === dateString);
        
        if (payments.length === 0) {
            app.showNotification('이 날짜에는 결제 예정인 구독이 없습니다.', 'warning');
            return;
        }

        const parts = dateString.split('-');
        if (parts.length !== 3) {
            app.showNotification('날짜 형식이 올바르지 않습니다.', 'error');
            return;
        }
        
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        
        const dateStringISO = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
        const dateObj = new Date(dateStringISO);
        
        // 요일 이름 배열
        const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        const weekday = weekdays[dateObj.getDay()];
        
        // 월 이름 배열
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        const monthName = monthNames[month - 1];
        
        const formattedDateString = `${year}년 ${monthName} ${day}일 ${weekday}`;

        let content = `
            <h3>${formattedDateString} 결제 예정</h3>
            <div class="day-payments">
        `;

        payments.forEach(payment => {
            const displayAmount = payment.krwAmount || payment.amount || 0;
            content += `
                <div class="payment-detail">
                    <div class="payment-info">
                        <i class="${payment.icon}" style="color: ${payment.color}"></i>
                        <span class="payment-name">${payment.name}</span>
                    </div>
                    <div class="payment-amount">₩${displayAmount.toLocaleString()}</div>
                </div>
            `;
        });

        const totalAmount = payments.reduce((sum, payment) => 
            sum + (payment.krwAmount || payment.amount || 0), 0);
        content += `
            </div>
            <div class="day-total">
                <strong>총 결제 예정 금액: ₩${totalAmount.toLocaleString()}</strong>
            </div>
        `;

        app.showModal('결제 일정 상세', content);
    }

    /**
     * 지정된 일수 내에 결제 예정인 구독 목록 반환
     */
    getUpcomingPayments(days = 7) {
        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();
        const todayStringISO = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}T00:00:00`;
        const todayObj = new Date(todayStringISO);
        const todayString = this.dateToString(todayObj);
        
        const futureDateObj = new Date(todayObj);
        futureDateObj.setDate(todayObj.getDate() + days);
        const futureYear = futureDateObj.getFullYear();
        const futureMonth = futureDateObj.getMonth() + 1;
        const futureDay = futureDateObj.getDate();
        const futureStringISO = `${futureYear}-${String(futureMonth).padStart(2, '0')}-${String(futureDay).padStart(2, '0')}T00:00:00`;
        const futureDateObj2 = new Date(futureStringISO);
        const futureString = this.dateToString(futureDateObj2);
        
        return this.payments
            .filter(payment => {
                return payment.dateString >= todayString && payment.dateString <= futureString;
            })
            .sort((a, b) => a.dateString.localeCompare(b.dateString));
    }

    /**
     * 다가오는 결제에 대한 알림 표시
     */
    showPaymentNotifications() {
        const upcomingPayments = this.getUpcomingPayments(3);
        
        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();
        const todayStringISO = `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}T00:00:00`;
        const todayObj = new Date(todayStringISO);
        
        upcomingPayments.forEach(payment => {
            const paymentDate = this.stringToDate(payment.dateString);
            if (!paymentDate) return;
            
            const daysUntil = Math.round((paymentDate - todayObj) / (1000 * 60 * 60 * 24));
            let message = '';
            
            if (daysUntil === 0) {
                message = `오늘 ${payment.name} 구독료 ₩${payment.amount.toLocaleString()}이 결제됩니다.`;
            } else if (daysUntil === 1) {
                message = `내일 ${payment.name} 구독료 ₩${payment.amount.toLocaleString()}이 결제됩니다.`;
            } else {
                message = `${daysUntil}일 후 ${payment.name} 구독료 ₩${payment.amount.toLocaleString()}이 결제됩니다.`;
            }
            
            app.showNotification(message, 'warning');
        });
    }

    getMonthlyStats() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const monthString = String(month + 1).padStart(2, '0');
        const yearMonthPrefix = `${year}-${monthString}`;
        
        const monthlyPayments = this.payments.filter(payment => 
            payment.dateString.startsWith(yearMonthPrefix)
        );

        const totalAmount = monthlyPayments.reduce((sum, payment) => 
            sum + (payment.krwAmount || payment.amount || 0), 0);
        const paymentCount = monthlyPayments.length;

        return {
            totalAmount,
            paymentCount,
            payments: monthlyPayments
        };
    }

    analyzePaymentPatterns() {
        const patterns = {};
        
        this.payments.forEach(payment => {
            const day = payment.dateString.split('-')[2];
            if (!patterns[day]) {
                patterns[day] = [];
            }
            patterns[day].push(payment);
        });

        return patterns;
    }

    getPeakPaymentDay() {
        const patterns = this.analyzePaymentPatterns();
        let maxCount = 0;
        let peakDay = null;

        Object.keys(patterns).forEach(day => {
            if (patterns[day].length > maxCount) {
                maxCount = patterns[day].length;
                peakDay = parseInt(day);
            }
        });

        return { day: peakDay, count: maxCount };
    }
}

const calendarManager = new CalendarManager();
