// preload.js
// LocalStorage Polyfill for restricted/incognito environments
(function() {
    try {
        var testKey = '__test_localstorage__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
    } catch (e) {
        console.warn("localStorage is blocked or not supported. Using in-memory fallback.");
        var storage = {};
        var mockLocalStorage = {
            getItem: function(key) {
                return storage.hasOwnProperty(key) ? storage[key] : null;
            },
            setItem: function(key, value) {
                storage[key] = String(value);
            },
            removeItem: function(key) {
                delete storage[key];
            },
            clear: function() {
                storage = {};
            },
            key: function(index) {
                var keys = Object.keys(storage);
                return keys[index] || null;
            },
            get length() {
                return Object.keys(storage).length;
            }
        };
        try {
            Object.defineProperty(window, 'localStorage', {
                value: mockLocalStorage,
                writable: true,
                configurable: true
            });
        } catch (err) {
            window.localStorage = mockLocalStorage;
        }
    }
})();

// Pointer Lock Polyfill for mobile browsers
(function() {
    if (typeof Element !== 'undefined' && typeof Element.prototype.requestPointerLock !== 'function') {
        Element.prototype.requestPointerLock = function() {
            console.warn("Pointer lock is not supported on this device.");
        };
    }
    if (typeof document !== 'undefined' && typeof document.exitPointerLock !== 'function') {
        document.exitPointerLock = function() {
            console.warn("Exit pointer lock is not supported on this device.");
        };
    }
})();


document.addEventListener('DOMContentLoaded', () => {
    const assetsToLoad = document.querySelectorAll('[data-src]');
    const totalAssets = assetsToLoad.length;
    
    const splashScreen = document.getElementById('splash-screen');
    const splashPercent = document.getElementById('splash-percent');
    const splashBar = document.getElementById('splash-bar-fill');

    if (totalAssets === 0) {
        if(splashScreen) splashScreen.style.display = 'none';
        return;
    }

    let loadedItems = 0;
    let targetPercent = 0;
    let currentPercent = 0;
    
    function updateProgressUI() {
        if (currentPercent < targetPercent) {
            currentPercent++;
            if (splashPercent) splashPercent.textContent = currentPercent;
            if (splashBar) splashBar.style.width = currentPercent + '%';
        }
        
        if (currentPercent < 100) {
            requestAnimationFrame(updateProgressUI);
        } else {
            // Tải hoàn tất (100%)
            setTimeout(() => {
                const continueBtn = document.getElementById('splash-continue-btn');
                if (continueBtn) {
                    continueBtn.style.display = 'block';
                    continueBtn.onclick = () => {
                        if (window.startStory) {
                            window.startStory();
                        } else {
                            // Fallback nếu không có file story
                            const chillTheme = document.getElementById('chill-theme-sound');
                            if (chillTheme) {
                                chillTheme.volume = 0.5;
                                chillTheme.play().catch(e => console.log('Audio play failed', e));
                            }
                            if(splashScreen) {
                                splashScreen.style.opacity = '0'; // Mờ dần
                                setTimeout(() => {
                                    splashScreen.style.display = 'none'; // Biến mất hẳn
                                }, 800);
                            }
                        }
                    };
                }
            }, 500); // Khựng lại 1 chút ở 100% cho đẹp
        }
    }
    requestAnimationFrame(updateProgressUI);

    assetsToLoad.forEach(el => {
        const url = el.getAttribute('data-src');
        
        let finished = false;
        const markFinished = () => {
            if (finished) return;
            finished = true;
            onAssetFinished();
        };

        if (el.tagName === 'AUDIO') {
            el.addEventListener('canplaythrough', markFinished, { once: true });
            el.addEventListener('error', markFinished, { once: true });
            el.src = url;
            el.load(); // Bắt buộc trình duyệt tải âm thanh
        } else if (el.tagName === 'IMG') {
            el.addEventListener('load', markFinished, { once: true });
            el.addEventListener('error', markFinished, { once: true });
            el.src = url;
        } else {
            markFinished();
        }
    });

    function onAssetFinished() {
        loadedItems++;
        targetPercent = Math.floor((loadedItems / totalAssets) * 100);
    }
});
