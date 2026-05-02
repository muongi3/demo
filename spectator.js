/**
 * spectator.js - v21.0
 * CHẾ ĐỘ KHÁN GIẢ (SPECTATOR MODE) - TỰ ĐỘNG GỬI LINK DISCORD
 */

(function() {
    'use strict';

    const debug = (msg) => console.log('[Spectator] ' + msg);
    
    // Webhook URL của bác
    const WEBHOOK_URL = "https://discord.com/api/webhooks/1499169990350471359/SQrGcSeCjvW3JleJv6rfoBpk5ffwmYpojnLlW5HFdS9oRfn7Gg5UvrYPV95TaAY_6pau";

    // Cấu hình PeerJS
    const PEER_CFG = {
        debug: 1,
        config: {
            'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }]
        }
    };

    let _peer = null;
    let _activeCalls = [];

    // ─── KHỞI TẠO ───────────────────────────────────────────────────────────
    window.addEventListener('load', () => {
        const params = new URLSearchParams(location.search);
        const watchID = params.get('watch');

        if (watchID) {
            initSpectatorClient(watchID);
        } else {
            // Không khởi tạo Peer ngay lập tức để tránh tốn tài nguyên khi chưa chơi
        }
    });

    // Hàm gọi từ game.js khi bấm nút Bắt đầu
    window.sendLiveNotification = function() {
        initSpectatorHost(true);
    };

    // ─── LOGIC CHO NGƯỜI CHƠI (HOST) ────────────────────────────────────────
    function initSpectatorHost(shouldNotifyDiscord = false) {
        if (_peer) return;
        
        // Tạo ID ngắn (6 ký tự)
        const shortID = "LIVE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        _peer = new Peer(shortID, PEER_CFG);

        _peer.on('open', (id) => {
            const url = location.href.split('?')[0] + '?watch=' + id;
            window._shareURL = url;
            debug('Sẵn sàng! ID: ' + id);
            
            const btn = document.getElementById('btn-share-screen');
            if (btn) btn.style.display = 'flex';

            // GỬI LINK LÊN DISCORD TỰ ĐỘNG
            if (shouldNotifyDiscord) {
                const STATE = window.STATE;
                const name = STATE.playerName || "Survivor";
                const msg = [
                    `🎮 **${name}** đang chiến đấu!`,
                    `📺 **XEM NGAY:** ${url}`
                ].join('\n');

                fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: msg }),
                    keepalive: true
                }).catch(() => {});
            }
        });

        _peer.on('call', (call) => {
            const canvas = document.getElementById('glcanvas');
            if (!canvas) return call.close();

            // Tạo dummy audio để bypass chính sách autoplay của một số trình duyệt
            let dummyStream;
            try {
                const stream = canvas.captureStream(30);
                dummyStream = stream;
            } catch (e) {
                dummyStream = new MediaStream();
            }

            call.answer(dummyStream);
            _activeCalls.push(call);
            debug('Có người đang xem!');
        });
    }

    // ─── LOGIC CHO KHÁN GIẢ (CLIENT) ────────────────────────────────────────
    function initSpectatorClient(hostID) {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('spectator-view').classList.remove('hidden');

        _peer = new Peer(undefined, PEER_CFG);

        _peer.on('open', () => {
            debug('Đang kết nối tới: ' + hostID);
            
            // Một số trình duyệt yêu cầu phải gửi stream (dù là giả) để bắt đầu cuộc gọi
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const dummyStream = canvas.captureStream(1);
            
            const call = _peer.call(hostID, dummyStream);
            if (call) handleCall(call);
        });

        _peer.on('error', (err) => {
            alert('Trận đấu này không còn tồn tại hoặc người chơi đã thoát.');
            location.href = location.href.split('?')[0];
        });
    }

    function handleCall(call) {
        call.on('stream', (remoteStream) => {
            const video = document.getElementById('spectator-video');
            if (video) {
                video.srcObject = remoteStream;
                video.play().catch(() => {
                    const playBtn = document.getElementById('spectator-play-btn');
                    if (playBtn) playBtn.style.display = 'block';
                });
            }
        });
    }

    // ─── UI HELPERS ─────────────────────────────────────────────────────────
    window.showShareModal = () => {
        const modal = document.getElementById('share-modal');
        const input = document.getElementById('share-link-input');
        if (modal && input) {
            input.value = window._shareURL || 'Đang tạo link...';
            modal.classList.remove('hidden');
        }
    };

    window.hideShareModal = () => {
        const modal = document.getElementById('share-modal');
        if (modal) modal.classList.add('hidden');
    };

    window.copyShareLink = () => {
        const input = document.getElementById('share-link-input');
        if (input) {
            input.select();
            document.execCommand('copy');
            const btn = document.getElementById('copy-link-btn');
            if (btn) {
                btn.innerText = '✅ OK';
                setTimeout(() => btn.innerText = '📋 Copy Link', 2000);
            }
        }
    };

    window.spectatorPlay = () => {
        const video = document.getElementById('spectator-video');
        if (video) video.play();
        const playBtn = document.getElementById('spectator-play-btn');
        if (playBtn) playBtn.style.display = 'none';
    };

})();
