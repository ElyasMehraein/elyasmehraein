/**
 * Elyas Mehraein — Clean Image-Swapping Sword Interaction
 * Zero audio, zero particle clutter. Pure directional image switching.
 */

(function () {
    'use strict';

    const IMAGES = {
        normal: 'img/elyas.jpg',
        left: 'img/elyas-left.jpg',     // Crouching / dodging in left corner
        right: 'img/elyas-right.jpg',   // Crouching / dodging in right corner
        top: 'img/elyas-top.jpg',       // Dodging in top area
        bottom: 'img/elyas-bottom.jpg', // Dodging in bottom area
        sliced: 'img/elyas-sliced.jpg'  // Cup sliced in half, tea spilling
    };

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

        function setPhotoState(state) {
            if (currentState === state) return;
            currentState = state;
            portraitImg.src = IMAGES[state] || IMAGES.normal;
        }

        // Track sword cursor across screen
        window.addEventListener('pointermove', (e) => {
            swordCursor.style.opacity = '1';
            swordCursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        });

        document.addEventListener('mouseleave', () => {
            swordCursor.style.opacity = '0';
        });

        // Switch image based on which quadrant/sector of the photo the mouse is in
        photoArea.addEventListener('pointermove', (e) => {
            if (isSliced) return;

            const rect = photoArea.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 to 0.5
            const relY = (e.clientY - rect.top) / rect.height - 0.5;  // -0.5 to 0.5

            // Dodge to the opposite side of where the cursor is pointing
            if (Math.abs(relX) > Math.abs(relY)) {
                if (relX > 0) {
                    // Mouse is on the right -> ambush/dodge to the left corner
                    setPhotoState('left');
                } else {
                    // Mouse is on the left -> ambush/dodge to the right corner
                    setPhotoState('right');
                }
            } else {
                if (relY > 0) {
                    // Mouse is at the bottom -> ambush/dodge to the top
                    setPhotoState('top');
                } else {
                    // Mouse is at the top -> ambush/dodge to the bottom
                    setPhotoState('bottom');
                }
            }
        });

        // Click on the photo to slice the cup
        photoArea.addEventListener('pointerdown', () => {
            isSliced = true;
            setPhotoState('sliced');
        });

        // Reset to normal when mouse leaves the photo frame
        photoArea.addEventListener('pointerleave', () => {
            isSliced = false;
            setPhotoState('normal');
        });

        // Simple sword tilt on click anywhere
        window.addEventListener('pointerdown', () => {
            swordCursor.classList.add('slashing');
            setTimeout(() => swordCursor.classList.remove('slashing'), 150);
        });
    }
})();