class DrawingManager {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.paths = [];
        this.particles = [];
        this.currentColor = '#FF69B4';
        this.fadeTimeout = 3000;  // Wait longer before fading starts
        this.fadeDuration = 7000; // Fade over a longer period
        this.lastPoint = null;
        this.smoothingFactor = 0.5;
        this.minDistance = 2;
        this.maxPoints = 5;
        
        // Pastel colors for fireworks
        this.pastelColors = [
            '#FFB3BA', // pink
            '#BAFFC9', // green
            '#BAE1FF', // blue
            '#FFFFBA', // yellow
            '#FFB3F7', // purple
            '#E0B3FF', // violet
            '#B3FFE0', // mint
            '#FFD1BA'  // peach
        ];
        
        this.initializeCanvas();
        this.setupEventListeners();
        this.setupColorPicker();
        this.createReminderMessage();  // Add reminder message
        this.animate();
    }

    initializeCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    getRandomPastelColor() {
        return this.pastelColors[Math.floor(Math.random() * this.pastelColors.length)];
    }

    createFirework(x, y) {
        const particleCount = 100;  // Increased particle count
        const color = this.getRandomPastelColor();
        const baseVelocity = 10;    // Increased base velocity
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const randomVelocity = baseVelocity * (0.8 + Math.random() * 0.6);  // More random velocity variation
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * randomVelocity,
                vy: Math.sin(angle) * randomVelocity,
                radius: 3,  // Larger particle size
                color: color,
                life: 1,
                decay: 0.01 + Math.random() * 0.01  // Slower decay for longer visibility
            });
        }
    }

    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // gravity
            particle.vx *= 0.99; // air resistance
            particle.life -= particle.decay;
            return particle.life > 0;
        });
    }

    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color + Math.floor(particle.life * 255).toString(16).padStart(2, '0');
            this.ctx.fill();
        });
    }

    getDistance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    getAveragePoint(points) {
        const len = points.length;
        if (len === 0) return null;

        let sumX = 0;
        let sumY = 0;
        let sumTime = 0;

        points.forEach(p => {
            sumX += p.x;
            sumY += p.y;
            sumTime += p.timestamp;
        });

        return {
            x: sumX / len,
            y: sumY / len,
            timestamp: sumTime / len
        };
    }

    setupEventListeners() {
        this.canvas.style.pointerEvents = 'auto';
        let pointsBuffer = [];
        
        document.addEventListener('mousedown', (e) => {
            this.isDrawing = true;
            const newPoint = {
                x: e.clientX,
                y: e.clientY,
                timestamp: Date.now()
            };
            pointsBuffer = [newPoint];
            this.paths.push({
                points: [newPoint],
                color: this.currentColor,
                opacity: 1,
                startTime: Date.now()
            });
        });

        document.addEventListener('dblclick', (e) => {
            this.createFirework(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDrawing) return;
            
            const newPoint = {
                x: e.clientX,
                y: e.clientY,
                timestamp: Date.now()
            };

            const currentPath = this.paths[this.paths.length - 1];
            const lastPoint = currentPath.points[currentPath.points.length - 1];

            if (lastPoint && this.getDistance(lastPoint, newPoint) < this.minDistance) {
                return;
            }

            pointsBuffer.push(newPoint);
            if (pointsBuffer.length > this.maxPoints) {
                pointsBuffer.shift();
            }

            const avgPoint = this.getAveragePoint(pointsBuffer);
            if (avgPoint) {
                currentPath.points.push(avgPoint);
            }
        });

        document.addEventListener('mouseup', () => {
            this.isDrawing = false;
            pointsBuffer = []; // Clear buffer on mouse up to avoid drawing random lines
        });

        document.addEventListener('mouseleave', () => {
            this.isDrawing = false;
            pointsBuffer = []; // Ensure no drawing when mouse leaves the canvas
        });
    }

    setupColorPicker() {
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                colorOptions.forEach(opt => opt.classList.remove('active'));
                e.target.classList.add('active');
                this.currentColor = e.target.dataset.color;
            });
        });
    }

    drawPaths() {
        const currentTime = Date.now();
        
        this.paths = this.paths.filter(path => {
            const pathStartTime = path.startTime;
            const lastPoint = path.points[path.points.length - 1];
            return currentTime - lastPoint.timestamp < this.fadeTimeout + this.fadeDuration;
        });
        
        this.paths.forEach(path => {
            const points = path.points;
            if (points.length < 2) return;
            
            // Calculate path-level opacity based on the time since path started
            const pathAge = currentTime - path.startTime;
            let pathOpacity = 1;
            
            if (pathAge > this.fadeTimeout) {
                pathOpacity = 1 - (pathAge - this.fadeTimeout) / this.fadeDuration;
                pathOpacity = Math.max(0, Math.min(1, pathOpacity));
            }
            
            // Draw smooth curve through points
            this.ctx.beginPath();
            this.ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length - 2; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                
                // Calculate point-specific opacity based on its position in the path
                const pointProgress = i / (points.length - 1);
                const pointAge = currentTime - points[i].timestamp;
                let pointOpacity = 1;
                
                if (pointAge > this.fadeTimeout) {
                    // More aggressive fade for older points
                    pointOpacity = 1 - (pointAge - this.fadeTimeout) / (this.fadeDuration * (1 - pointProgress * 0.5));
                    pointOpacity = Math.max(0, Math.min(1, pointOpacity));
                }
                
                const finalOpacity = pathOpacity * pointOpacity;
                
                if (finalOpacity > 0) {
                    this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
                    
                    this.ctx.lineWidth = 3;
                    this.ctx.lineCap = 'round';
                    this.ctx.lineJoin = 'round';
                    
                    const alphaHex = Math.floor(finalOpacity * 255).toString(16).padStart(2, '0');
                    this.ctx.strokeStyle = path.color + alphaHex;
                }
            }
            
            if (points.length > 2) {
                this.ctx.quadraticCurveTo(
                    points[points.length - 2].x,
                    points[points.length - 2].y,
                    points[points.length - 1].x,
                    points[points.length - 1].y
                );
            }
            
            this.ctx.stroke();
        });
    }

    createReminderMessage() {
        const reminder = document.createElement('div');
        reminder.textContent = "Double click for a surprise!";
        reminder.style.position = 'fixed';
        reminder.style.bottom = '20px';
        reminder.style.left = '50%';
        reminder.style.transform = 'translateX(-50%)';
        reminder.style.padding = '10px 20px';
        reminder.style.backgroundColor = 'rgba(232, 212, 247, 0.9)';
        reminder.style.color = '#524669';
        reminder.style.fontFamily = 'Arial, sans-serif';
        reminder.style.borderRadius = '10px';
        reminder.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        reminder.style.zIndex = '1001';  // Ensure it's on top

        // Add a close button to the reminder
        const closeButton = document.createElement('button');
        closeButton.textContent = 'x';
        closeButton.style.marginLeft = '10px';
        closeButton.style.background = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = '#524669';
        closeButton.style.fontSize = '16px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.padding = '0';
        
        closeButton.addEventListener('click', () => {
            reminder.style.display = 'none';  // Hide the reminder when the button is clicked
        });

        reminder.appendChild(closeButton);
        document.body.appendChild(reminder);
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw paths first
        this.drawPaths();
        
        // Update and draw particles
        this.updateParticles();
        this.drawParticles();
        
        // Continue animation loop
        requestAnimationFrame(() => this.animate());
    }
}

window.addEventListener('load', () => {
    new DrawingManager();
});