const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../js/sword-game.js'), 'utf8');

function target() {
    const listeners = new Map();
    return {
        addEventListener(type, handler) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(handler);
        },
        dispatch(type, event = {}) {
            for (const handler of listeners.get(type) || []) handler({ ...event, type });
        }
    };
}

function setup() {
    let now = 0;
    let timerId = 0;
    const timers = new Map();
    const swordClasses = new Set();
    const sword = {
        style: {},
        classList: {
            add(name) { swordClasses.add(name); },
            remove(name) { swordClasses.delete(name); },
            contains(name) { return swordClasses.has(name); }
        },
        setAttribute() {}
    };
    const photo = {
        ...target(),
        getBoundingClientRect() {
            return { left: 100, top: 100, right: 300, bottom: 500, width: 200, height: 400 };
        }
    };
    const portrait = { src: 'img/elyas.jpg' };
    const window = target();
    const document = {
        ...target(),
        readyState: 'complete',
        body: { appendChild() {} },
        getElementById(id) {
            return { 'photo-area': photo, 'portrait-img': portrait }[id] || null;
        },
        createElement() { return sword; }
    };
    vm.runInNewContext(script, {
        window, document,
        Image: class { set src(_value) {} },
        setTimeout(callback, delay) {
            const id = ++timerId;
            timers.set(id, { callback, at: now + delay });
            return id;
        },
        clearTimeout(id) { timers.delete(id); }
    });

    return {
        window, document, photo, portrait, sword,
        advance(ms) {
            const until = now + ms;
            while (true) {
                const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
                if (!next || next[1].at > until) break;
                now = next[1].at;
                timers.delete(next[0]);
                next[1].callback();
            }
            now = until;
        }
    };
}

function touch(identifier, clientX, clientY) {
    return { identifier, clientX, clientY };
}

function sendTouch(window, type, ...touches) {
    window.dispatch(type, { changedTouches: touches });
}

test('a finger reveals and moves the sword anywhere on screen, then hides it', () => {
    const { window, sword } = setup();
    sendTouch(window, 'touchstart', touch(1, 20, 40));
    assert.equal(sword.style.opacity, '1');
    assert.equal(sword.style.transform, 'translate3d(20px, 40px, 0)');
    assert.equal(sword.classList.contains('touching'), true);

    sendTouch(window, 'touchmove', touch(1, 350, 610));
    assert.equal(sword.style.transform, 'translate3d(350px, 610px, 0)');
    sendTouch(window, 'touchend', touch(1, 350, 610));
    assert.equal(sword.style.opacity, '0');
    assert.equal(sword.classList.contains('touching'), false);
});

test('the lower half of the portrait slices; the upper half does not', () => {
    const { window, photo, portrait, sword, advance } = setup();
    sendTouch(window, 'touchstart', touch(1, 290, 490)); // lower corner
    assert.equal(portrait.src, 'img/elyas-sliced.jpg');
    photo.dispatch('pointerleave', { pointerType: 'touch' });
    assert.equal(portrait.src, 'img/elyas-sliced.jpg');
    sendTouch(window, 'touchend', touch(1, 290, 490));
    advance(899);
    assert.equal(portrait.src, 'img/elyas-sliced.jpg');
    advance(1);
    assert.equal(portrait.src, 'img/elyas.jpg');

    sendTouch(window, 'touchstart', touch(2, 200, 140));
    assert.equal(portrait.src, 'img/elyas-dodge-bottom.jpg');
    assert.equal(sword.style.opacity, '1');
    sendTouch(window, 'touchend', touch(2, 200, 140));
    advance(900);
    assert.equal(portrait.src, 'img/elyas.jpg');
});

test('dragging into and out of the portrait updates its reaction', () => {
    const { window, portrait, sword } = setup();
    sendTouch(window, 'touchstart', touch(7, 30, 50));
    sendTouch(window, 'touchmove', touch(7, 240, 400));
    assert.equal(portrait.src, 'img/elyas-sliced.jpg');
    sendTouch(window, 'touchmove', touch(7, 200, 140));
    assert.equal(portrait.src, 'img/elyas-dodge-bottom.jpg');
    sendTouch(window, 'touchmove', touch(7, 320, 530));
    assert.equal(portrait.src, 'img/elyas.jpg');
    sendTouch(window, 'touchcancel', touch(7, 320, 530));
    assert.equal(sword.style.opacity, '0');
    assert.equal(portrait.src, 'img/elyas.jpg');
});

test('only the first finger controls the sword and a new touch cancels the old reset', () => {
    const { window, portrait, sword, advance } = setup();
    sendTouch(window, 'touchstart', touch(1, 200, 400));
    sendTouch(window, 'touchstart', touch(2, 10, 10));
    sendTouch(window, 'touchmove', touch(2, 5, 5));
    assert.equal(sword.style.transform, 'translate3d(200px, 400px, 0)');
    sendTouch(window, 'touchend', touch(2, 5, 5));
    assert.equal(sword.style.opacity, '1');
    sendTouch(window, 'touchend', touch(1, 200, 400));
    advance(200);
    sendTouch(window, 'touchstart', touch(3, 200, 150));
    advance(900);
    assert.equal(portrait.src, 'img/elyas-dodge-bottom.jpg');
});

test('mouse hover and click retain their desktop behavior', () => {
    const { window, document, photo, portrait, sword } = setup();
    window.dispatch('pointermove', { pointerType: 'mouse', clientX: 160, clientY: 220 });
    assert.equal(sword.style.opacity, '1');
    assert.equal(sword.style.transform, 'translate3d(160px, 220px, 0)');
    photo.dispatch('pointermove', { pointerType: 'mouse', clientX: 290, clientY: 300 });
    assert.equal(portrait.src, 'img/elyas-dodge-left.jpg');
    photo.dispatch('pointermove', { pointerType: 'mouse', clientX: 200, clientY: 450 });
    assert.equal(portrait.src, 'img/elyas-dodge-top.jpg');
    photo.dispatch('pointerdown', { pointerType: 'mouse' });
    assert.equal(portrait.src, 'img/elyas-sliced.jpg');
    photo.dispatch('pointermove', { pointerType: 'mouse', clientX: 200, clientY: 150 });
    assert.equal(portrait.src, 'img/elyas-sliced.jpg');
    photo.dispatch('pointerleave', { pointerType: 'mouse' });
    assert.equal(portrait.src, 'img/elyas.jpg');
    document.dispatch('mouseleave');
    assert.equal(sword.style.opacity, '0');
});
