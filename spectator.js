/**
 * spectator.js - v19.0
 * Discord + Góp ý + Spectator Mode (PeerJS WebRTC)
 */

if (typeof window.debug === 'undefined') {
    window.debug = (msg) => console.log('[Spectator] ' + msg);
}
const debug = window.debug;

// ─── CẤU HÌNH ────────────────────────────────────────────────────────────────
const WEBHOOK_URL = "https://discord.com/api/webhooks/1499169990350471359/SQrGcSeCjvW3JleJv6rfoBpk5ffwmYpojnLlW5HFdS9oRfn7Gg5UvrYPV95TaAY_6pau";
const PEER_CFG = {
    debug: 2,
    config: {
        'iceServers': [
            { 'urls': 'stun:stun.l.google.com:19302' },
            { 'urls': 'stun:stun1.l.google.com:19302' },
            { 'urls': 'stun:stun2.l.google.com:19302' }
        ]
    }
};

// ─── DISCORD ─────────────────────────────────────────────────────────────────
function sendLiveNotification() {
    initSpectatorHost(true); // Khởi spectator và yêu cầu gửi thông báo kèm link
}

function sendStateToSpectators() { /* dùng WebRTC thay thế */ }

function sendExitToDiscord(reason) {
    if (!window.STATE || window.STATE.hasExited) return;
    const time = new Date().toLocaleTimeString('vi-VN');
    fetch(WEBHOOK_URL, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ content:
            `📡 **THOÁT GAME**\n👤 **${window.STATE.playerName}**\n⏰ \`${time}\`\n🚪 \`${reason}\`` }),
        keepalive: true }).catch(() => {});
}

function handlePlayerExit(reason) {
    if (!window.STATE || window.STATE.hasExited) return;
    window.STATE.hasExited = true;
    sendExitToDiscord(reason);
    destroySpectatorHost();
}

function finishGameAndSendToDiscord() {
    const STATE = window.STATE;
    if (STATE && STATE.finalStats) {
        const s = STATE.finalStats;
        const reward = s.reward || (s.win ? 'Chưa quay' : null);
        const rewardLine = s.win ? `\n🎁 **${reward}**` : '';
        fetch(WEBHOOK_URL, { method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ content:
                `🎮 **KẾT QUẢ** 🎮\n👤 **${STATE.playerName}**\n` +
                `🏁 ${s.win ? '🏆 CHIẾN THẮNG' : '💀 THẤT BẠI'}\n` +
                `🔫 Kills: \`${s.kills}\`\n⏱️ \`${s.duration}s\`${rewardLine}` })
        }).finally(() => location.reload());
    } else { location.reload(); }
}

// ─── EXIT LISTENERS ──────────────────────────────────────────────────────────
window.addEventListener('beforeunload', () => handlePlayerExit('tab closed'));
window.addEventListener('pagehide',     () => handlePlayerExit('page hidden'));
window.addEventListener('offline',      () => handlePlayerExit('lost connection'));

let _bgTimer = null;
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        _bgTimer = setTimeout(() => handlePlayerExit('backgrounded 10s'), 10000);
    } else { clearTimeout(_bgTimer); }
});

// ─── SPECTATOR SYSTEM ────────────────────────────────────────────────────────
let _peer           = null;
let _spectatorCount = 0;
let _activeCalls    = [];

/* ── HOST: khởi khi game bắt đầu ── */
function initSpectatorHost(shouldNotifyDiscord = false) {
    if (new URLSearchParams(location.search).get('watch')) return; // tôi là spectator

    if (_peer) {
        if (shouldNotifyDiscord && _peer.open) {
            _sendDiscordLink(_peer.id);
        }
        return;
    }

    // Tạo ID ngắn (6 ký tự) để link gọn hơn
    const shortID = "LIVE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    _peer = new Peer(shortID, PEER_CFG);

    _peer.on('open', function (id) {
        const url = location.href.split('?')[0] + '?watch=' + id;
        window._shareURL = url;
        const btn = document.getElementById('btn-share-screen');
        if (btn) btn.style.display = 'flex';
        debug('Share URL: ' + url);

        if (shouldNotifyDiscord) {
            _sendDiscordLink(id);
        }
    });

    _peer.on('call', function (call) {
        debug('Incoming call from: ' + call.peer);
        const canvas = document.getElementById('glcanvas');
        if (!canvas) {
            debug('Error: glcanvas not found');
            call.close();
            return;
        }

        try {
            const stream = canvas.captureStream(30);
            call.answer(stream);
            debug('Call answered with canvas stream');

            _activeCalls.push(call);
            _spectatorCount++;
            _updateCountUI();

            call.on('stream', function() { });
            call.on('close', function () {
                debug('Spectator disconnected: ' + call.peer);
                _activeCalls = _activeCalls.filter(c => c !== call);
                _spectatorCount = Math.max(0, _spectatorCount - 1);
                _updateCountUI();
            });
            call.on('error', function(err) { debug('Call error: ' + err); });
        } catch (e) {
            debug('Error capturing stream: ' + e);
            call.close();
        }
    });

    _peer.on('error', function (err) {
        debug('Host peer error: ' + err.type);
        if (err.type !== 'peer-unavailable') {
            setTimeout(function () { _peer = null; initSpectatorHost(); }, 4000);
        }
    });
}

function _sendDiscordLink(id) {
    const url = location.href.split('?')[0] + '?watch=' + id;
    const STATE = window.STATE;
    const msg = [
        `🎮 **${STATE.playerName}** đang chiến đấu!`,
        `📺 **XEM NGAY:** ${url}`
    ].join('\n');

    fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msg }),
        keepalive: true
    }).catch(() => { });
}

function destroySpectatorHost() {
    _activeCalls.forEach(c => { try { c.close(); } catch(e){} });
    if (_peer) { try { _peer.destroy(); } catch(e){} _peer = null; }
}

function _updateCountUI() {
    const badge = document.getElementById('spectator-count-live');
    const modal = document.getElementById('spectator-count-modal');
    const txt   = _spectatorCount > 0 ? '👁 ' + _spectatorCount : '';
    if (badge) badge.textContent = txt;
    if (modal) modal.textContent = _spectatorCount + ' khán giả đang xem';
}

/* ── SPECTATOR: người xem ── */
function _enterSpectatorMode(hostID) {
    // Ẩn menu, hiện spectator view
    const menu = document.getElementById('main-menu');
    const view = document.getElementById('spectator-view');
    if (menu) menu.classList.add('hidden');
    if (view) view.classList.remove('hidden');

    _setStatus('🔌 Đang kết nối...', 'connecting');

    _peer = new Peer(undefined, PEER_CFG);
    _peer.on('open', function () { _callHost(hostID); });
    _peer.on('error', function (err) {
        if (err.type === 'peer-unavailable') {
            _setStatus('❌ Host không online hoặc link đã hết hạn', 'error');
        } else {
            _setStatus('⚠️ ' + err.type + ' — thử lại sau 4s...', 'error');
            setTimeout(function () { _callHost(hostID); }, 4000);
        }
    });
}

function _callHost(hostID) {
    debug('Calling host: ' + hostID);

    // Một số trình duyệt (như Safari) yêu cầu phải gửi ít nhất 1 track để khởi tạo WebRTC
    let dummyStream;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ac = new AudioCtx();
        const dest = ac.createMediaStreamDestination();
        const osc = ac.createOscillator();
        osc.connect(dest);
        osc.start();
        dummyStream = dest.stream;
    } catch (e) {
        dummyStream = new MediaStream();
    }

    const call = _peer.call(hostID, dummyStream);
    if (!call) return;
    _handleSpectatorCall(call, hostID);
}

function _handleSpectatorCall(call, hostID) {
    call.on('stream', function (stream) {
        debug('Stream received');
        const vid = document.getElementById('spectator-video');
        if (!vid) return;
        vid.srcObject = stream;
        
        vid.play().catch(function () {
            const btn = document.getElementById('spectator-play-btn');
            if (btn) btn.style.display = 'flex';
        });
    });

    call.on('close', function () {
        debug('Host disconnected');
    });

    call.on('error', function (err) {
        debug('Call error: ' + err);
    });
}

function _setStatus(msg, state) {
    // Đã loại bỏ theo yêu cầu: "vào thẳng live luôn dell còn hiển thị đang kết nói"
}

// ─── GLOBAL HELPERS (gọi từ HTML) ────────────────────────────────────────────
window.showShareModal = function () {
    const modal = document.getElementById('share-modal');
    const input = document.getElementById('share-link-input');
    if (!modal) return;
    if (input && window._shareURL) input.value = window._shareURL;
    modal.classList.remove('hidden');
};
window.hideShareModal = function () {
    document.getElementById('share-modal').classList.add('hidden');
};
window.copyShareLink = function () {
    const input = document.getElementById('share-link-input');
    if (!input) return;
    input.select(); input.setSelectionRange(0, 99999);
    document.execCommand('copy');
    const btn = document.getElementById('copy-link-btn');
    if (btn) { btn.textContent = '✅ Đã copy!'; setTimeout(() => btn.textContent = '📋 Copy', 2000); }
};
window.spectatorPlay = function () {
    const vid = document.getElementById('spectator-video');
    const btn = document.getElementById('spectator-play-btn');
    if (vid) vid.play();
    if (btn) btn.style.display = 'none';
};

// ─── UI: GÓP Ý ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    // Kiểm tra chế độ Spectator
    const watchID = new URLSearchParams(location.search).get('watch');
    if (watchID) { _enterSpectatorMode(watchID); }

    // Feedback modal
    const $open  = document.getElementById('btn-open-feedback');
    const $modal = document.getElementById('feedback-modal');
    const $close = document.getElementById('close-feedback-btn');
    const $send  = document.getElementById('send-feedback-btn');
    const $text  = document.getElementById('feedback-text');

    if ($open)  $open.addEventListener('click',  () => $modal.classList.remove('hidden'));
    if ($close) $close.addEventListener('click', () => { $modal.classList.add('hidden'); $text.value = ''; });
    if ($send)  $send.addEventListener('click',  function () {
        const content = $text.value.trim();
        if (!content) { alert('Bác chưa nhập gì cả!'); return; }
        $send.textContent = 'ĐANG GỬI...'; $send.disabled = true;
        fetch(WEBHOOK_URL, { method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ content:
                `📩 **GÓP Ý MỚI**\n👤 **${(window.STATE && window.STATE.playerName) || 'Khách'}**\n> ${content}` })
        }).then(() => { alert('Cảm ơn bác!'); $modal.classList.add('hidden'); $text.value = ''; })
          .catch(() => alert('Lỗi mạng!'))
          .finally(() => { $send.textContent = 'GỬI'; $send.disabled = false; });
    });

    // Guide modal
    const btnGuide  = document.getElementById('btn-open-guide');
    const guideModal= document.getElementById('guide-modal');
    const closeGuide= document.getElementById('close-guide-btn');
    if (btnGuide)  btnGuide.addEventListener('click',  () => guideModal.classList.remove('hidden'));
    if (closeGuide) closeGuide.addEventListener('click', () => guideModal.classList.add('hidden'));
});
