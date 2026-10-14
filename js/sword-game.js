/**
 * Elyas Mehraein — Clean Image-Swapping Sword Interaction
 * Zero audio, zero particle clutter. Pure directional image switching.
 */

(function () {
    'use strict';

    const IMAGES = {
        normal: 'img/elyas.jpg',
        left: 'img/elyas-dodge-left.jpg',
        right: 'img/elyas-dodge-right.jpg',
        top: 'img/elyas-dodge-top.jpg',
        bottom: 'img/elyas-dodge-bottom.jpg',
        sliced: 'img/elyas-sliced.jpg'
    };

    // The blade tip sits about 100px up-left from the finger (104px box offset minus
    // the tip's ~4px inset). Use one offset for both the visible sword and its hit point.
    const TOUCH_SWORD_OFFSET = 100;

    // Preload all images so switching is instant without flicker
    Object.values(IMAGES).forEach((src) => {
        const img = new Image();
        img.src = src;
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        const photoArea = document.getElementById('photo-area');
        const portraitImg = document.getElementById('portrait-img');
        if (!photoArea || !portraitImg) return;

        // Create custom sword cursor
        let swordCursor = document.getElementById('sword-cursor');
        if (!swordCursor) {
            swordCursor = document.createElement('div');
            swordCursor.id = 'sword-cursor';
            swordCursor.className = 'sword-cursor';
            swordCursor.setAttribute('aria-hidden', 'true');
            swordCursor.innerHTML = `
                <svg class="sword-svg" viewBox="0 0 70 70" width="64" height="64">
                    <defs>
                        <linearGradient id="bladeGleam" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#ffffff"/>
                            <stop offset="40%" stop-color="#e8f3ff"/>
                            <stop offset="100%" stop-color="#5a8bb8"/>
                        </linearGradient>
                        <linearGradient id="goldHilt" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#fff085"/>
                            <stop offset="50%" stop-color="#d49a1d"/>
                            <stop offset="100%" stop-color="#7a5500"/>
                        </linearGradient>
                    </defs>
                    <path d="M 4 4 L 7 15 L 36 44 L 44 36 L 15 7 Z" fill="url(#bladeGleam)" stroke="#ffffff" stroke-width="0.8"/>
                    <line x1="4" y1="4" x2="38" y2="38" stroke="#ffffff" stroke-width="0.9"/>
                    <path d="M 31 47 L 47 31 L 50 34 L 34 50 Z" fill="url(#goldHilt)" stroke="#573b00" stroke-width="0.5"/>
                    <line x1="40" y1="40" x2="52" y2="52" stroke="#2a1608" stroke-width="4.5" stroke-linecap="round"/>
                    <circle cx="54" cy="54" r="3.4" fill="url(#goldHilt)" stroke="#573b00" stroke-width="0.5"/>
                </svg>
            `;
            document.body.appendChild(swordCursor);
        }

        let currentState = 'normal';
        let isSliced = false;
        let activeTouchId = null;
        let touchOnPhoto = false;
        let resetTimer = null;
        let slashTimer = null;

        function setPhotoState(state) {
            if (currentState === state) return;
            currentState = state;
            portraitImg.src = IMAGES[state] || IMAGES.normal;
        }

        function getTouchImpactPoint(touch) {
            return {
                clientX: touch.clientX - TOUCH_SWORD_OFFSET,
                clientY: touch.clientY - TOUCH_SWORD_OFFSET
            };
        }

        function positionSword(point, isTouch = false) {
            const swordPoint = isTouch ? getTouchImpactPoint(point) : point;
            swordCursor.style.transform = `translate3d(${swordPoint.clientX}px, ${swordPoint.clientY}px, 0)`;
            swordCursor.style.opacity = '1';
        }

        function slashSword() {
            swordCursor.classList.add('slashing');
            clearTimeout(slashTimer);
            slashTimer = setTimeout(() => swordCursor.classList.remove('slashing'), 150);
        }

        function updateStateFromPointer(point, isTouch, rect = photoArea.getBoundingClientRect()) {
            const relX = (point.clientX - rect.left) / rect.width - 0.5;
            const relY = (point.clientY - rect.top) / rect.height - 0.5;

            // On mobile, the lower half (including the corners) is the strike target.
            if (isTouch && relY > 0) {
                setPhotoState('sliced');
            } else if (Math.abs(relX) > Math.abs(relY)) {
                setPhotoState(relX > 0 ? 'left' : 'right');
            } else {
                setPhotoState(relY > 0 ? 'top' : 'bottom');
            }
        }

        // Keep tracking the finger if a swipe starts outside the photo or scrolling starts;
        // hit-test at the offset point used to position the sword tip. Only .photo blocks scrolling.
        function updateTouchPhoto(touch) {
            const impactPoint = getTouchImpactPoint(touch);
            const rect = photoArea.getBoundingClientRect();
            const inside = impactPoint.clientX >= rect.left && impactPoint.clientX <= rect.right &&
                impactPoint.clientY >= rect.top && impactPoint.clientY <= rect.bottom;

            if (inside) {
                touchOnPhoto = true;
                updateStateFromPointer(impactPoint, true, rect);
            } else if (touchOnPhoto) {
                touchOnPhoto = false;
                setPhotoState('normal');
            }
        }

        function getActiveTouch(changedTouches) {
            for (let i = 0; i < changedTouches.length; i++) {
                if (changedTouches[i].identifier === activeTouchId) return changedTouches[i];
            }
            return null;
        }

        window.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'mouse' && activeTouchId === null) positionSword(e);
        });

        document.addEventListener('mouseleave', () => {
            if (activeTouchId === null) swordCursor.style.opacity = '0';
        });

        photoArea.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'mouse' || isSliced || activeTouchId !== null) return;
            clearTimeout(resetTimer);
            resetTimer = null;
            updateStateFromPointer(e, false);
        });

        photoArea.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'mouse') return;
            clearTimeout(resetTimer);
            resetTimer = null;
            isSliced = true;
            setPhotoState('sliced');
        });

        photoArea.addEventListener('pointerleave', (e) => {
            if (e.pointerType !== 'mouse' || activeTouchId !== null) return;
            isSliced = false;
            setPhotoState('normal');
        });

        window.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse') slashSword();
        });

        window.addEventListener('touchstart', (e) => {
            if (activeTouchId !== null || !e.changedTouches.length) return;
            const touch = e.changedTouches[0];
            activeTouchId = touch.identifier;
            clearTimeout(resetTimer);
            resetTimer = null;
            touchOnPhoto = false;
            isSliced = false;
            swordCursor.classList.add('touching');
            positionSword(touch, true);
            slashSword();
            updateTouchPhoto(touch);
            if (!touchOnPhoto) setPhotoState('normal');
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            const touch = getActiveTouch(e.changedTouches);
            if (!touch) return;
            positionSword(touch, true);
            updateTouchPhoto(touch);
        }, { passive: true });

        function finishTouch(e) {
            const touch = getActiveTouch(e.changedTouches);
            if (!touch) return;
            if (e.type === 'touchend') updateTouchPhoto(touch);
            activeTouchId = null;
            swordCursor.classList.remove('touching');
            swordCursor.style.opacity = '0';

            // Leave the reaction visible briefly after a tap so it can be seen on mobile.
            if (e.type === 'touchend' && touchOnPhoto) {
                resetTimer = setTimeout(() => {
                    resetTimer = null;
                    setPhotoState('normal');
                }, 900);
            } else {
                setPhotoState('normal');
            }
            touchOnPhoto = false;
        }

        window.addEventListener('touchend', finishTouch, { passive: true });
        window.addEventListener('touchcancel', finishTouch, { passive: true });
    }
})();
