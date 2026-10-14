/**
 * Elyas Mehraein — Interactive Sword Cursor & Cup Slicing Easter Egg
 * 
 * Features:
 *  - Custom animated sword cursor (gliding blade, gleaming steel, slash arc)
 *  - Dynamic evasion / dodging mechanics (eyes tracking threat, fleeing in opposite direction)
 *  - Expression switching: looking right, looking left, terrified dodge
 *  - Slicing mechanic: fast slash flick, cornering, or clicking to strike
 *  - Rich tea explosion & liquid pouring physics on canvas
 *  - Web Audio sound effects (whoosh, blade slice, liquid splash, refill chime)
 *  - Shocked speech bubble & refill/reset interaction
 */

(function () {
    'use strict';

    // --- Audio Synthesis via Web Audio API (Zero external audio files) ---
    const Sound = {
        ctx: null,
        init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        },
        playSwing() {
            if (!this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(500, now);
                filter.frequency.exponentialRampToValueAtTime(1600, now + 0.05);
                filter.frequency.exponentialRampToValueAtTime(350, now + 0.12);
                filter.Q.value = 3.5;

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);
            } catch (err) { }
        },
        playSlice() {
            if (!this.ctx) return;
            try {
                const now = this.ctx.currentTime;

                // Metallic sword impact ringing
                const osc = this.ctx.createOscillator();
                const oscGain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(1900, now);
                osc.frequency.exponentialRampToValueAtTime(750, now + 0.25);
                oscGain.gain.setValueAtTime(0.35, now);
                oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

                osc.connect(oscGain);
                oscGain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.32);

                // Snappy blade cut bite
                const osc2 = this.ctx.createOscillator();
                const osc2Gain = this.ctx.createGain();
                osc2.type = 'sawtooth';
                osc2.frequency.setValueAtTime(3400, now);
                osc2.frequency.exponentialRampToValueAtTime(180, now + 0.12);
                osc2Gain.gain.setValueAtTime(0.25, now);
                osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

                osc2.connect(osc2Gain);
                osc2Gain.connect(this.ctx.destination);
                osc2.start(now);
                osc2.stop(now + 0.13);

                // Spilling liquid splash sound
                this.playSplash(now + 0.03);
            } catch (err) { }
        },
        playSplash(startTime) {
            if (!this.ctx) return;
            try {
                const t0 = startTime || this.ctx.currentTime;
                for (let i = 0; i < 4; i++) {
                    const drip = this.ctx.createOscillator();
                    const dripGain = this.ctx.createGain();
                    drip.type = 'sine';
                    const f0 = 380 + Math.random() * 450;
                    drip.frequency.setValueAtTime(f0, t0 + i * 0.04);
                    drip.frequency.exponentialRampToValueAtTime(f0 * 1.5, t0 + i * 0.04 + 0.07);

                    dripGain.gain.setValueAtTime(0.12, t0 + i * 0.04);
                    dripGain.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.04 + 0.07);

                    drip.connect(dripGain);
                    dripGain.connect(this.ctx.destination);
                    drip.start(t0 + i * 0.04);
                    drip.stop(t0 + i * 0.04 + 0.08);
                }
            } catch (err) { }
        },
        playRefill() {
            if (!this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                    gain.gain.setValueAtTime(0.16, now + idx * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now + idx * 0.08);
                    osc.stop(now + idx * 0.08 + 0.4);
                });
            } catch (err) { }
        }
    };

    // Preload image assets into cache
    const expressions = [
        'img/elyas.webp',
        'img/elyas-dodge-right.jpg',
        'img/elyas-dodge-left.jpg',
        'img/elyas-sliced.jpg'
    ];
    expressions.forEach(src => {
        const img = new Image();
        img.src = src;
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSwordGame);
    } else {
        initSwordGame();
    }

    function initSwordGame() {
        const photoWrapper = document.querySelector('.photo');
        if (!photoWrapper) return;

        // Ensure Sword Cursor is in document
        let swordCursor = document.getElementById('sword-cursor');
        if (!swordCursor) {
            swordCursor = document.createElement('div');
            swordCursor.id = 'sword-cursor';
            swordCursor.className = 'sword-cursor';
            swordCursor.setAttribute('aria-hidden', 'true');
            swordCursor.innerHTML = `
                <svg class="sword-svg" viewBox="0 0 70 70" width="70" height="70">
                    <defs>
                        <linearGradient id="bladeGleam" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#ffffff"/>
                            <stop offset="30%" stop-color="#e8f3ff"/>
                            <stop offset="70%" stop-color="#93c2ec"/>
                            <stop offset="100%" stop-color="#5a8bb8"/>
                        </linearGradient>
                        <linearGradient id="goldHilt" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#fff085"/>
                            <stop offset="50%" stop-color="#d49a1d"/>
                            <stop offset="100%" stop-color="#7a5500"/>
                        </linearGradient>
                        <filter id="bladeGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#6cbaff" flood-opacity="0.8"/>
                        </filter>
                    </defs>
                    <!-- Blade tip is at (4, 4) -->
                    <path d="M 4 4 L 7 15 L 36 44 L 44 36 L 15 7 Z" fill="url(#bladeGleam)" stroke="#ffffff" stroke-width="0.8" filter="url(#bladeGlow)"/>
                    <!-- Blade fuller (center line) -->
                    <line x1="4" y1="4" x2="38" y2="38" stroke="#ffffff" stroke-width="0.9" opacity="0.95"/>
                    <!-- Crossguard -->
                    <path d="M 31 47 L 47 31 L 50 34 L 34 50 Z" fill="url(#goldHilt)" stroke="#573b00" stroke-width="0.5"/>
                    <circle cx="32.5" cy="48.5" r="2.2" fill="#ffe259"/>
                    <circle cx="48.5" cy="32.5" r="2.2" fill="#ffe259"/>
                    <!-- Grip -->
                    <line x1="40" y1="40" x2="52" y2="52" stroke="#2a1608" stroke-width="4.5" stroke-linecap="round"/>
                    <line x1="40" y1="40" x2="52" y2="52" stroke="#d49a1d" stroke-width="1.2" stroke-dasharray="2 2"/>
                    <!-- Pommel -->
                    <circle cx="54" cy="54" r="3.4" fill="url(#goldHilt)" stroke="#573b00" stroke-width="0.5"/>
                    <circle cx="54" cy="54" r="1.4" fill="#6cbaff"/>
                    <!-- Gleam sparkle at tip -->
                    <polygon points="4,0 5.2,2.8 8,4 5.2,5.2 4,8 2.8,5.2 0,4 2.8,2.8" fill="#ffffff"/>
                </svg>
                <div class="slash-whoosh" aria-hidden="true"></div>
            `;
            document.body.appendChild(swordCursor);
        }

        // DOM elements
        const target = document.getElementById('photo-target');
        const faceNormal = document.getElementById('face-normal');
        const faceDodgeRight = document.getElementById('face-dodge-right');
        const faceDodgeLeft = document.getElementById('face-dodge-left');
        const faceSliced = document.getElementById('face-sliced');
        const sweatDrop = document.getElementById('sweat-drop');
        const sliceFlash = document.getElementById('slice-flash');
        const teaBubble = document.getElementById('tea-bubble');
        const refillBtn = document.getElementById('refill-btn');
        const teaCanvas = document.getElementById('tea-canvas');
        if (!target || !teaCanvas) return;

        const ctx = teaCanvas.getContext('2d');

        // State
        let mouseX = -1000;
        let mouseY = -1000;
        let prevMouseX = -1000;
        let prevMouseY = -1000;
        let lastTime = performance.now();
        let mouseSpeed = 0; // px/sec

        let isSliced = false;
        let activeFace = 'normal';
        let canvasW = 250;
        let canvasH = 333;

        // Physics variables for smooth evasion
        let currentShiftX = 0;
        let currentShiftY = 0;
        let currentTiltX = 0;
        let currentTiltY = 0;
        let targetShiftX = 0;
        let targetShiftY = 0;
        let targetTiltX = 0;
        let targetTiltY = 0;

        // Canvas sizing with DPR support
        function resizeCanvas() {
            const rect = photoWrapper.getBoundingClientRect();
            if (rect.width <= 0) return;
            const dpr = window.devicePixelRatio || 1;
            canvasW = rect.width;
            canvasH = rect.height;
            teaCanvas.width = canvasW * dpr;
            teaCanvas.height = canvasH * dpr;
            ctx.resetTransform?.();
            ctx.scale(dpr, dpr);
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Particle System for Tea Splashing
        const particles = [];
        const teaColors = ['#3d1604', '#6a2a07', '#9c4412', '#c96825', '#f39845', '#ffbe76'];

        class TeaParticle {
            constructor(x, y, vx, vy, size, isStream = false) {
                this.x = x;
                this.y = y;
                this.vx = vx;
                this.vy = vy;
                this.size = size;
                this.isStream = isStream;
                this.color = teaColors[Math.floor(Math.random() * teaColors.length)];
                this.life = 1;
                this.decay = 0.009 + Math.random() * 0.016;
                this.gravity = 0.44;
            }
            update() {
                this.vy += this.gravity;
                this.vx *= 0.985;
                this.x += this.vx;
                this.y += this.vy;
                this.life -= this.decay;

                // Splash at bottom border
                if (this.y > canvasH - 8 && this.vy > 0) {
                    this.vy = -this.vy * 0.22;
                    this.vx *= 0.5;
                    this.y = canvasH - 8;
                }
            }
            draw(c) {
                if (this.life <= 0) return;
                c.save();
                c.globalAlpha = Math.max(0, this.life);
                c.fillStyle = this.color;
                c.beginPath();

                const angle = Math.atan2(this.vy, this.vx);
                const speed = Math.hypot(this.vx, this.vy);
                const stretch = Math.min(2.4, 1 + speed * 0.12);

                c.translate(this.x, this.y);
                c.rotate(angle);
                c.ellipse(0, 0, this.size * stretch, this.size, 0, 0, Math.PI * 2);
                c.fill();
                c.restore();
            }
        }

        class SteamParticle {
            constructor(x, y) {
                this.x = x + (Math.random() - 0.5) * 16;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 0.8;
                this.vy = -1.1 - Math.random() * 1.4;
                this.size = 5 + Math.random() * 7;
                this.alpha = 0.45;
                this.decay = 0.012 + Math.random() * 0.012;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.size += 0.22;
                this.alpha -= this.decay;
            }
            draw(c) {
                if (this.alpha <= 0) return;
                c.save();
                c.globalAlpha = Math.max(0, this.alpha);
                c.fillStyle = '#ffffff';
                c.beginPath();
                c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                c.fill();
                c.restore();
            }
        }

        function triggerTeaExplosion() {
            const originX = canvasW * 0.74;
            const originY = canvasH * 0.72;

            for (let i = 0; i < 95; i++) {
                const angle = (Math.PI * 0.18) + (Math.random() - 0.5) * 1.9;
                const speed = 2.5 + Math.random() * 13;
                const vx = Math.cos(angle) * speed * (Math.random() > 0.3 ? 1 : -0.7);
                const vy = Math.sin(angle) * speed - 3.5;
                const size = 2 + Math.random() * 4.5;
                particles.push(new TeaParticle(originX, originY, vx, vy, size));
            }
        }

        let teaGushCounter = 0;
        function updateTeaSimulation() {
            ctx.clearRect(0, 0, canvasW, canvasH);

            if (isSliced && teaGushCounter > 0) {
                teaGushCounter--;
                const originX = canvasW * 0.74 + (Math.random() - 0.5) * 14;
                const originY = canvasH * 0.72 + (Math.random() - 0.5) * 8;

                for (let i = 0; i < 3; i++) {
                    const vx = (Math.random() - 0.3) * 2.2;
                    const vy = 1 + Math.random() * 3.8;
                    particles.push(new TeaParticle(originX, originY, vx, vy, 2.5 + Math.random() * 3, true));
                }

                if (Math.random() < 0.45) {
                    particles.push(new SteamParticle(originX, originY));
                }
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.update();
                p.draw(ctx);
                if (p.life <= 0) {
                    particles.splice(i, 1);
                }
            }
        }

        // Expression Switcher
        function setFace(face) {
            if (activeFace === face) return;
            activeFace = face;

            if (faceNormal) faceNormal.classList.toggle('is-active', face === 'normal');
            if (faceDodgeRight) faceDodgeRight.classList.toggle('is-active', face === 'dodgeRight');
            if (faceDodgeLeft) faceDodgeLeft.classList.toggle('is-active', face === 'dodgeLeft');
            if (faceSliced) faceSliced.classList.toggle('is-active', face === 'sliced');
        }

        // Slice Execution
        function performSlice() {
            if (isSliced) return;
            isSliced = true;
            Sound.init();
            Sound.playSlice();

            setFace('sliced');
            target.classList.add('is-sliced', 'impact-shake');
            setTimeout(() => target.classList.remove('impact-shake'), 450);

            if (sliceFlash) {
                sliceFlash.classList.add('fire');
                setTimeout(() => sliceFlash.classList.remove('fire'), 300);
            }

            if (sweatDrop) sweatDrop.classList.remove('visible');
            teaGushCounter = 170; // Gush tea for ~3.5s
            triggerTeaExplosion();

            if (teaBubble) teaBubble.classList.add('visible');

            clearTimeout(window.__teaResetTimer);
            window.__teaResetTimer = setTimeout(resetGame, 7500);
        }

        // Reset / Refill
        function resetGame() {
            clearTimeout(window.__teaResetTimer);
            if (!isSliced) return;

            Sound.init();
            Sound.playRefill();

            isSliced = false;
            target.classList.remove('is-sliced');
            if (teaBubble) teaBubble.classList.remove('visible');
            setFace('normal');

            if (sliceFlash) {
                sliceFlash.style.background = 'radial-gradient(circle, rgba(108, 186, 255, 0.75) 0%, transparent 70%)';
                sliceFlash.classList.add('fire');
                setTimeout(() => {
                    sliceFlash.classList.remove('fire');
                    sliceFlash.style.background = '';
                }, 350);
            }
        }

        if (refillBtn) {
            refillBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                resetGame();
            });
        }

        // Mouse Motion Tracking
        window.addEventListener('pointermove', (e) => {
            Sound.init();
            const now = performance.now();
            const dt = Math.max(1, now - lastTime);

            prevMouseX = mouseX;
            prevMouseY = mouseY;
            mouseX = e.clientX;
            mouseY = e.clientY;

            if (prevMouseX > -500) {
                const dist = Math.hypot(mouseX - prevMouseX, mouseY - prevMouseY);
                mouseSpeed = (dist / dt) * 1000;
            }
            lastTime = now;

            swordCursor.style.opacity = '1';
            swordCursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
        });

        document.addEventListener('mouseleave', () => {
            mouseX = -1000;
            mouseY = -1000;
            swordCursor.style.opacity = '0';
        });

        document.addEventListener('mouseenter', () => {
            swordCursor.style.opacity = '1';
        });

        // Click to Slash
        window.addEventListener('pointerdown', (e) => {
            if (e.target.closest('#refill-btn') || e.target.closest('a')) return;

            Sound.init();
            Sound.playSwing();

            swordCursor.classList.remove('slashing');
            void swordCursor.offsetWidth;
            swordCursor.classList.add('slashing');
            setTimeout(() => swordCursor.classList.remove('slashing'), 220);

            if (isSliced) return;

            const rect = photoWrapper.getBoundingClientRect();
            const padding = 20;
            const hitZone = {
                left: rect.left - padding,
                right: rect.right + padding,
                top: rect.top - padding,
                bottom: rect.bottom + padding
            };

            if (e.clientX >= hitZone.left && e.clientX <= hitZone.right &&
                e.clientY >= hitZone.top && e.clientY <= hitZone.bottom) {
                performSlice();
            }
        });

        // Touch support for mobile devices
        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches[0]) {
                const t = e.touches[0];
                mouseX = t.clientX;
                mouseY = t.clientY;
                swordCursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
            }
        }, { passive: true });

        // Physics Loop (RAF)
        function gameLoop() {
            updateTeaSimulation();

            if (!isSliced && photoWrapper) {
                const rect = photoWrapper.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const dx = mouseX - centerX;
                const dy = mouseY - centerY;
                const dist = Math.hypot(dx, dy);

                const dangerRadius = 260;
                const panicRadius = 130;

                if (dist < dangerRadius && mouseX > -500) {
                    // Fast slash flick catch or cornering contact
                    if ((mouseSpeed > 850 && dist < 175) || dist < 80) {
                        performSlice();
                    } else {
                        // Repulsion: push photo AWAY from the incoming sword
                        const repelForce = Math.pow((dangerRadius - dist) / dangerRadius, 1.15);
                        const maxDodgeX = 75;
                        const maxDodgeY = 55;

                        const normX = dx / (dist || 1);
                        const normY = dy / (dist || 1);

                        targetShiftX = -normX * repelForce * maxDodgeX;
                        targetShiftY = -normY * repelForce * maxDodgeY;

                        // 3D perspective lean away from blade
                        targetTiltY = (dx / dangerRadius) * -16;
                        targetTiltX = (dy / dangerRadius) * 12;

                        // Directional eye expression: look at the incoming sword!
                        if (dx > 25) {
                            setFace('dodgeRight');
                        } else if (dx < -25) {
                            setFace('dodgeLeft');
                        } else {
                            setFace('normal');
                        }

                        // Jitter and sweat drop in close panic zone
                        if (dist < panicRadius) {
                            if (sweatDrop) sweatDrop.classList.add('visible');
                            targetShiftX += (Math.random() - 0.5) * 3.5;
                            targetShiftY += (Math.random() - 0.5) * 3.5;
                        } else {
                            if (sweatDrop) sweatDrop.classList.remove('visible');
                        }
                    }
                } else {
                    targetShiftX = 0;
                    targetShiftY = 0;
                    targetTiltX = 0;
                    targetTiltY = 0;
                    if (sweatDrop) sweatDrop.classList.remove('visible');
                    setFace('normal');
                }

                currentShiftX += (targetShiftX - currentShiftX) * 0.14;
                currentShiftY += (targetShiftY - currentShiftY) * 0.14;
                currentTiltX += (targetTiltX - currentTiltX) * 0.12;
                currentTiltY += (targetTiltY - currentTiltY) * 0.12;

                target.style.transform = `translate3d(${currentShiftX.toFixed(2)}px, ${currentShiftY.toFixed(2)}px, 0) perspective(800px) rotateX(${currentTiltX.toFixed(2)}deg) rotateY(${currentTiltY.toFixed(2)}deg)`;
            } else if (isSliced) {
                currentShiftX += (0 - currentShiftX) * 0.08;
                currentShiftY += (10 - currentShiftY) * 0.08;
                currentTiltX += (4 - currentTiltX) * 0.08;
                currentTiltY += (0 - currentTiltY) * 0.08;

                target.style.transform = `translate3d(${currentShiftX.toFixed(2)}px, ${currentShiftY.toFixed(2)}px, 0) perspective(800px) rotateX(${currentTiltX.toFixed(2)}deg) rotateY(${currentTiltY.toFixed(2)}deg)`;
            }

            requestAnimationFrame(gameLoop);
        }

        requestAnimationFrame(gameLoop);
    }
})();
