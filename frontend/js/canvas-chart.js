class CanvasChartManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
    }

    // Canvas 차트 초기화
    initCanvas(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas 요소를 찾을 수 없습니다: ${canvasId}`);
            return false;
        }

        this.ctx = this.canvas.getContext('2d');
        
        // Canvas 크기 설정 (반응형)
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        return true;
    }

    // Canvas 크기 조정 (반응형)
    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width * 2; // 고해상도 디스플레이 지원
        this.canvas.height = rect.height * 2;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // 스케일 조정
        this.ctx.scale(2, 2);
    }

    // 도넛 차트 그리기
    drawDoughnutChart(data, options = {}) {
        if (!this.canvas || !this.ctx) return;

        const { labels, values, colors } = data;
        const centerX = this.canvas.width / 4; // 2배 스케일 고려
        const centerY = this.canvas.height / 4;
        const radius = Math.min(centerX, centerY) * 0.7;
        const innerRadius = radius * 0.6;

        const total = values.reduce((a, b) => a + b, 0);
        if (total === 0) {
            this.drawNoDataMessage();
            return;
        }

        // 배경 지우기
        this.ctx.clearRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);

        // 각 섹션 그리기
        let currentAngle = -Math.PI / 2; // 시작 각도 (12시 방향)

        values.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            // 바깥 원 그리기
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            this.ctx.lineTo(centerX, centerY);
            this.ctx.fillStyle = colors[index] || '#667eea';
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // 레이블과 값 표시
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.85);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.85);
            
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const percentage = ((value / total) * 100).toFixed(1);
            this.ctx.fillText(`${percentage}%`, labelX, labelY);

            currentAngle += sliceAngle;
        });

        // 안쪽 원 (도넛 모양)
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 중심에 총합 표시
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText('총합', centerX, centerY - 10);
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`₩${total.toLocaleString()}`, centerX, centerY + 10);

        // 범례 그리기
        this.drawLegend(labels, colors, centerX + radius + 30, centerY - radius);
    }

    // 범례 그리기
    drawLegend(labels, colors, startX, startY) {
        const legendItemHeight = 25;
        const boxSize = 15;

        labels.forEach((label, index) => {
            const y = startY + index * legendItemHeight;

            // 색상 박스
            this.ctx.fillStyle = colors[index] || '#667eea';
            this.ctx.fillRect(startX, y - boxSize / 2, boxSize, boxSize);
            this.ctx.strokeStyle = '#ddd';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(startX, y - boxSize / 2, boxSize, boxSize);

            // 레이블 텍스트
            this.ctx.fillStyle = '#333';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(label, startX + boxSize + 8, y);
        });
    }

    // 선 차트 그리기
    drawLineChart(data, options = {}) {
        if (!this.canvas || !this.ctx) return;

        const { labels, values } = data;
        const padding = 60;
        const chartWidth = this.canvas.width / 2 - padding * 2;
        const chartHeight = this.canvas.height / 2 - padding * 2;
        const startX = padding;
        const startY = padding;
        const endX = startX + chartWidth;
        const endY = startY + chartHeight;

        // 배경 지우기
        this.ctx.clearRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);

        if (values.length === 0 || values.every(v => v === 0)) {
            this.drawNoDataMessage();
            return;
        }

        const maxValue = Math.max(...values, 1);
        const minValue = Math.min(...values, 0);
        const valueRange = maxValue - minValue || 1;

        // 그리드 그리기
        this.drawGrid(startX, startY, chartWidth, chartHeight, maxValue, minValue);

        // 데이터 포인트 및 선 그리기
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        values.forEach((value, index) => {
            const x = startX + (index / (values.length - 1 || 1)) * chartWidth;
            const y = endY - ((value - minValue) / valueRange) * chartHeight;

            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            // 데이터 포인트 그리기
            this.ctx.fillStyle = '#667eea';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = 3;

            // 값 표시
            this.ctx.fillStyle = '#333';
            this.ctx.font = '11px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`₩${Math.round(value).toLocaleString()}`, x, y - 15);

            // 레이블 표시
            if (index % Math.ceil(values.length / 6) === 0 || index === values.length - 1) {
                this.ctx.fillStyle = '#666';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(labels[index], x, endY + 20);
            }
        });

        this.ctx.stroke();

        // 영역 채우기
        this.ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(startX, endY);
        values.forEach((value, index) => {
            const x = startX + (index / (values.length - 1 || 1)) * chartWidth;
            const y = endY - ((value - minValue) / valueRange) * chartHeight;
            this.ctx.lineTo(x, y);
        });
        this.ctx.lineTo(startX + chartWidth, endY);
        this.ctx.closePath();
        this.ctx.fill();
    }

    // 그리드 그리기
    drawGrid(startX, startY, width, height, maxValue, minValue) {
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;

        // 세로선 (5개)
        for (let i = 0; i <= 5; i++) {
            const x = startX + (i / 5) * width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, startY + height);
            this.ctx.stroke();

            // Y축 값 표시
            const value = maxValue - (i / 5) * (maxValue - minValue);
            this.ctx.fillStyle = '#666';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`₩${Math.round(value).toLocaleString()}`, x - 10, startY + height - (i / 5) * height);
        }

        // 가로선 (5개)
        for (let i = 0; i <= 5; i++) {
            const y = startY + (i / 5) * height;
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(startX + width, y);
            this.ctx.stroke();
        }
    }

    // 데이터 없음 메시지 표시
    drawNoDataMessage() {
        if (!this.canvas || !this.ctx) return;
        
        const centerX = this.canvas.width / 4;
        const centerY = this.canvas.height / 4;
        
        this.ctx.clearRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillStyle = '#999';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('표시할 데이터가 없습니다', centerX, centerY);
    }

    // 막대 차트 그리기
    drawBarChart(data, options = {}) {
        if (!this.canvas || !this.ctx) return;

        const { labels, values, colors } = data;
        const padding = 60;
        const chartWidth = this.canvas.width / 2 - padding * 2;
        const chartHeight = this.canvas.height / 2 - padding * 2;
        const startX = padding;
        const startY = padding;
        const endX = startX + chartWidth;
        const endY = startY + chartHeight;

        // 배경 지우기
        this.ctx.clearRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);

        if (values.length === 0 || values.every(v => v === 0)) {
            this.drawNoDataMessage();
            return;
        }

        const maxValue = Math.max(...values, 1);
        const barWidth = chartWidth / values.length * 0.7;
        const barSpacing = chartWidth / values.length * 0.3;

        // 그리드 그리기
        this.drawGrid(startX, startY, chartWidth, chartHeight, maxValue, 0);

        // 막대 그리기
        values.forEach((value, index) => {
            const barHeight = (value / maxValue) * chartHeight;
            const x = startX + index * (barWidth + barSpacing) + barSpacing / 2;
            const y = endY - barHeight;

            // 막대 그리기
            this.ctx.fillStyle = colors ? (colors[index] || '#667eea') : '#667eea';
            this.ctx.fillRect(x, y, barWidth, barHeight);

            // 값 표시
            this.ctx.fillStyle = '#333';
            this.ctx.font = '11px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`₩${Math.round(value).toLocaleString()}`, x + barWidth / 2, y - 5);

            // 레이블 표시
            this.ctx.fillStyle = '#666';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(labels[index] || '', x + barWidth / 2, endY + 20);
        });
    }
}

const canvasChartManager = new CanvasChartManager();

