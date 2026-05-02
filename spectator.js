/**
 * spectator.js - v20.0
 * CHẾ ĐỘ KHÁN GIẢ (SPECTATOR MODE) - LOGIC CHUẨN P2P
 * Loại bỏ toàn bộ kết nối bên ngoài (Discord/Feedback).
 */

(function() {
    'use strict';

    const debug = (msg) => console.log('[Spectator] ' + msg);
    
    // Cấu hình PeerJS mặc định (Sử dụng Cloud của PeerJS)
    const PEER_CFG = {
        debug: 1,
        config: {
            'iceServers': [
                { 'urls': 'stun:stun.l.google.com:19302' }
            ]
        }
    };

    let _peer = null;
    let _activeCalls = [];

    // ─── KHỞI TẠO ───────────────────────────────────────────────────────────
    window.addEventListener('load', () => {
        const params = new URLSearchParams(location.search);
        const watchID = params.get('watch');

        if (watchID) {
            // TRƯỜNG HỢP: KHÁN GIẢ
            initSpectatorClient(watchID);
        } else {
            // TRƯỜNG HỢP: NGƯỜI CHƠI (HOST)
            // Khởi tạo Peer ngay lập tức để sẵn sàng nhận kết nối
            initSpectatorHost();
        }
    });

    // ─── LOGIC CHO NGƯỜI CHƠI (HOST) ────────────────────────────────────────
    function initSpectatorHost() {
        if (_peer) return;
        
        // Tạo ID ngẫu nhiên cho Host
        _peer = new Peer(undefined, PEER_CFG);

        _peer.on('open', (id) => {
            const url = location.href.split('?')[0] + '?watch=' + id;
            window._shareURL = url;
            debug('Sẵn sàng! ID: ' + id);
            
            // Hiện nút Share nếu game đang chạy
            const btn = document.getElementById('btn-share-screen');
            if (btn) btn.style.display = 'flex';
        });

        _peer.on('call', (call) => {
            debug('Có người xem mới: ' + call.peer);
            const canvas = document.getElementById('glcanvas');
            if (!canvas) return call.close();

            // Trả về stream của Canvas
            const stream = canvas.captureStream(30);
            call.answer(stream);
            _activeCalls.push(call);

            call.on('close', () => {
                _activeCalls = _activeCalls.filter(c => c !== call);
                debug('Người xem đã thoát.');
            });
        });

        _peer.on('error', (err) => {
            if (err.type === 'peer-unavailable') return;
            debug('Lỗi Host: ' + err.type);
        });
    }

    // ─── LOGIC CHO KHÁN GIẢ (CLIENT) ────────────────────────────────────────
    function initSpectatorClient(hostID) {
        // Hiện màn hình chờ
        const view = document.getElementById('spectator-view');
        if (view) view.classList.remove('hidden');
        
        const menu = document.getElementById('main-menu');
        if (menu) menu.classList.add('hidden');

        _peer = new Peer(undefined, PEER_CFG);

        _peer.on('open', () => {
            debug('Đang kết nối tới người chơi: ' + hostID);
            
            // Gọi cho Host (cần gửi kèm một stream giả để bắt đầu WebRTC)
            const dummyStream = createDummyStream();
            const call = _peer.call(hostID, dummyStream);

            if (call) {
                handleCall(call);
            }
        });

        _peer.on('error', (err) => {
            debug('Lỗi Khán giả: ' + err.type);
            alert('Không tìm thấy người chơi này hoặc họ đã thoát game.');
        });
    }

    function handleCall(call) {
        call.on('stream', (remoteStream) => {
            debug('Nhận được hình ảnh từ Host!');
            const video = document.getElementById('spectator-video');
            if (video) {
                video.srcObject = remoteStream;
                const status = document.getElementById('spectator-status-text');
                if (status) status.innerText = 'Đang xem trực tiếp';
                
                video.play().catch(() => {
                    const playBtn = document.getElementById('spectator-play-btn');
                    if (playBtn) playBtn.style.display = 'block';
                });
            }
        });

        call.on('close', () => {
            alert('Người chơi đã kết thúc trận đấu.');
            location.href = location.href.split('?')[0];
        });
    }

    function createDummyStream() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.fillRect(0,0,1,1);
            return canvas.captureStream(1);
        } catch(e) {
            return new MediaStream();
        }
    }

    // ─── UI HELPER ──────────────────────────────────────────────────────────
    window.showShareModal = () => {
        const modal = document.getElementById('share-modal');
        const input = document.getElementById('share-link-input');
        if (modal && input) {
            input.value = window._shareURL || 'Đang khởi tạo...';
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
                btn.innerText = '✅ ĐÃ COPY';
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
