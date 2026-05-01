/**
 * spectator.js - v18.2
 * Chuyên trách hệ thống Mạng, Khán giả, Discord và Góp ý
 * Tách biệt để game.js nhẹ hơn và dễ quản lý hơn.
 */

// --- KHỞI TẠO HÀM DEBUG DỰ PHÒNG ---
if (typeof window.debug === 'undefined') {
    window.debug = (msg) => console.log("[Spectator Log] " + msg);
}
// Alias để dùng nhanh trong file này
const debug = window.debug;

// --- CẤU HÌNH WEBHOOK & MẠNG ---
const WEBHOOK_URL = "https://discord.com/api/webhooks/1499169990350471359/SQrGcSeCjvW3JleJv6rfoBpk5ffwmYpojnLlW5HFdS9oRfn7Gg5UvrYPV95TaAY_6pau";

// --- HỆ THỐNG P2P (v18 INDUSTRIAL) ---
function initPeer() {
    if (STATE.peer) return;
    
    let hostId = localStorage.getItem('survival_host_id_v4') || ('survival-' + Math.random().toString(36).substr(2, 6));
    localStorage.setItem('survival_host_id_v4', hostId);
    
    const myId = window.SPECTATOR_MODE ? null : hostId;
    debug("📡 Đang khởi động mạng v18...");

    STATE.peer = new Peer(myId, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun.services.mozilla.com' }
            ],
            iceCandidatePoolSize: 10,
            sdpSemantics: 'unified-plan'
        },
        debug: 1
    });

    STATE.peer.on('open', (id) => {
        debug("✅ Mạng sẵn sàng! ID: " + id);
        if (!window.SPECTATOR_MODE) {
            // Hiện nút SAO CHÉP LINK XEM cho Host
            const copyBtn = document.getElementById('copy-link-btn');
            if (copyBtn) copyBtn.style.setProperty('display', 'inline-block', 'important');
            showHostHUD(id);
            sendLiveNotification(id);
        }
    });

    STATE.peer.on('connection', (conn) => {
        debug("👤 Có khán giả đang vào...");
        STATE.spectatorConns.push(conn);
        conn.on('open', () => {
            debug("🟢 Đã thông nòng!");
            conn.send({
                type: 'WORLD_INIT',
                loot: STATE.loot,
                barrels: STATE.barrels,
                pads: STATE.pads,
                obstacles: STATE.obstacles
            });
        });
        conn.on('close', () => {
            STATE.spectatorConns = STATE.spectatorConns.filter(c => c !== conn);
        });
    });

    STATE.peer.on('error', (err) => {
        debug("❌ LỖI MẠNG: " + err.type);
        if (err.type === 'peer-unavailable' && window.SPECTATOR_MODE) {
            updateSpecStatus("⚠️ KHÔNG THẤY MÁY CHỦ. ĐANG THỬ LẠI...");
        }
    });
}

function showHostHUD(id) {
    if (document.getElementById('host-id-display')) return;
    const div = document.createElement('div');
    div.id = 'host-id-display';
    div.style = 'position:fixed; top:10px; left:10px; background:rgba(0,0,0,0.8); color:#0f0; padding:10px; border-radius:5px; font-family:monospace; z-index:10000; font-size:12px; border:1px solid #0f0; pointer-events:none;';
    div.innerHTML = `<div>🏠 HOST ID: <span style="color:#fff">${id}</span></div><div style="font-size:10px; color:#aaa; margin-top:5px">Đang mở cổng đợi khán giả...</div>`;
    document.body.appendChild(div);
}

function updateSpecStatus(msg) {
    const statusDiv = document.getElementById('spec-status');
    if (statusDiv) statusDiv.innerText = msg;
}

// --- CHẾ ĐỘ XEM TRỰC TIẾP (SPECTATOR) ---
function startLiveView(targetId) {
    window.SPECTATOR_MODE = true;
    STATE.isWatching = true;
    document.body.classList.add('spectator-mode');
    
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) { 
        mainMenu.style.setProperty('display', 'none', 'important');
        mainMenu.classList.add('hidden'); 
    }

    const warning = document.getElementById('spectator-warning');
    if (warning) {
        warning.style.display = 'block';
        warning.innerHTML = `<div id="spec-status">📡 ĐANG TÌM MÁY CHỦ: ${targetId}</div>`;
    }

    const tryConnect = () => {
        if (STATE.isConnected) return;
        
        updateSpecStatus("📡 ĐANG BẮT TAY KẾT NỐI...");
        debug("🔗 Thử kết nối tới: " + targetId);
        
        const conn = STATE.peer.connect(targetId, { reliable: true });
        
        const handshakeTimeout = setTimeout(() => {
            if (!STATE.isConnected) {
                debug("⏳ Quá 25s không thấy phản hồi. Thử lại...");
                conn.close();
                setTimeout(tryConnect, 3000);
            }
        }, 25000);

        conn.on('open', () => {
            clearTimeout(handshakeTimeout);
            STATE.isConnected = true;
            updateSpecStatus("🟢 ĐÃ THÔNG! ĐANG TẢI ĐẢO...");
            debug("🟢 Bắt tay thành công!");
        });

                conn.on('data', (data) => {
                    const STATE = window.STATE;
                    if (data.type === 'WORLD_INIT') {
                        STATE.loot = data.loot;
                        STATE.barrels = data.barrels;
                        STATE.pads = data.pads;
                        STATE.obstacles = data.obstacles;
                        STATE.screen = 'game';
                        document.getElementById('ui-layer').style.display = 'block';
                        updateSpecStatus("🔴 ĐANG XEM TRỰC TIẾP");
                        requestAnimationFrame(window.loop);
                    }
                    if (data.type === 'STATE_UPDATE') {
                        if (STATE.player && data.player) {
                            STATE.player.pos = data.player.pos;
                            STATE.camera.rot = data.player.rot;
                            STATE.player.hp = data.player.hp;
                            STATE.player.kills = data.player.kills;
                            STATE.player.weaponIdx = data.player.weaponIdx;
                            if (typeof window.updateHUD === 'function') window.updateHUD();
                        }
                if (data.bots) STATE.bots = data.bots.map(b => ({ pos: b.p, hp: b.h, state: b.s, id: b.i }));
                if (data.boss) {
                    if (!STATE.boss) STATE.boss = { active: true };
                    STATE.boss.pos = data.boss.p;
                    STATE.boss.hp = data.boss.h;
                    STATE.boss.phase = data.boss.ph;
                } else { STATE.boss = null; }
                if (data.action === 'shoot') {
                    if (typeof window.playAudio === 'function') window.playAudio('shoot');
                }
                if (data.type === 'GAME_OVER') {
                    alert("Trận đấu đã kết thúc!");
                    location.reload();
                }
            }
        });

        conn.on('close', () => {
            STATE.isConnected = false;
            updateSpecStatus("🔌 MẤT KẾT NỐI. ĐANG TÌM LẠI...");
            setTimeout(tryConnect, 2000);
        });

        conn.on('error', (err) => {
            debug("❌ LỖI KẾT NỐI: " + err.type);
        });
    };

    if (!STATE.peer) initPeer();
    if (STATE.peer.open) tryConnect();
    else STATE.peer.once('open', tryConnect);
}

// --- ĐỒNG BỘ TRẠNG THÁI (DÀNH CHO HOST) ---
function sendLiveNotification(id) {
    const STATE = window.STATE;
    const watchLink = `https://muongi3.github.io/demo/?playerId=${id}&v=18.2.1`;
    const time = new Date().toLocaleTimeString('vi-VN');
    const bots = STATE.config ? (STATE.config.botCount || 25) : 25;
    const message = [
        `🎮 **${STATE.playerName}** vừa bắt đầu trận!`,
        `━━━━━━━━━━━━━━━`,
        `⏰ Giờ: \`${time}\``,
        `🤖 Số bot: \`${bots}\``,
        `🔗 **[👁️ BẤM VÀO ĐÂY ĐỂ XEM TRỰC TIẾP](${watchLink})**`,
        `━━━━━━━━━━━━━━━`
    ].join('\n');
    fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
        keepalive: true
    }).catch(() => { });
}

function sendStateToSpectators(action = null) {
    const STATE = window.STATE;
    if (!STATE.spectatorConns || STATE.spectatorConns.length === 0) return;

    const syncData = {
        type: 'STATE_UPDATE',
        player: {
            pos: STATE.player.pos,
            rot: STATE.camera.rot,
            hp: STATE.player.hp,
            kills: STATE.player.kills,
            weaponIdx: STATE.player.weaponIdx
        },
        bots: STATE.bots.map(b => ({
            p: b.pos,
            h: b.hp,
            s: b.state,
            i: b.id
        })),
        boss: STATE.boss ? {
            p: STATE.boss.pos,
            h: STATE.boss.hp,
            ph: STATE.boss.phase
        } : null,
        action: action
    };

    STATE.spectatorConns.forEach(conn => {
        if (conn.open) conn.send(syncData);
    });
}


// --- EXIT DETECTION & DISCORD ---
function sendExitToDiscord(reason) {
    if (STATE.hasExited) return;
    const time = new Date().toLocaleTimeString('vi-VN');
    const message = `📡 **NGƯỜI CHƠI THOÁT GAME**\n━━━━━━━━━━━━━━━\n👤 Player: **${STATE.playerName}**\n⏰ Time: \`${time}\` \n🚪 Reason: \`${reason}\`\n━━━━━━━━━━━━━━━`;
    fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
        keepalive: true
    }).catch(() => { });
}

function handlePlayerExit(reason) {
    if (STATE.hasExited) return;
    STATE.hasExited = true;
    sendExitToDiscord(reason);
}

function finishGameAndSendToDiscord() {
    if (STATE.finalStats) {
        const s = STATE.finalStats;
        const reward = s.reward || (s.win ? "Chưa quay" : null);
        const resultLabel = s.win ? "🏆 CHIẾN THẮNG" : "💀 THẤT BẠI";
        const rewardSection = s.win ? `\n🎁 Phần thưởng: **${reward}**` : "";

        fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `🎮 **KẾT QUẢ TRẬN ĐẤU** 🎮\n━━━━━━━━━━━━━━━\n👤 Người chơi: **${STATE.playerName}**\n🏁 Kết quả: **${resultLabel}**\n🔫 Kills: \`${s.kills}\` mạng\n⏱️ Thời gian: \`${s.duration} giây\`${rewardSection}\n📅 Ngày: \`${s.date}\`\n━━━━━━━━━━━━━━━`
            })
        }).finally(() => location.reload());
    } else {
        location.reload();
    }
}

// --- EVENT LISTENERS (GLOBAL) ---
window.addEventListener('beforeunload', () => handlePlayerExit('tab closed / refreshed'));
window.addEventListener('pagehide', () => handlePlayerExit('page hidden'));
window.addEventListener('offline', () => handlePlayerExit('lost connection'));

let backgroundExitTimer = null;
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        backgroundExitTimer = setTimeout(() => {
            handlePlayerExit('app backgrounded (10s)');
        }, 10000);
    } else {
        if (backgroundExitTimer) clearTimeout(backgroundExitTimer);
    }
});

// --- UI HELPERS ---
function setupCopyBtn() {
    const copyBtn = document.getElementById('copy-link-btn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            if (!STATE.peer) initPeer();
            let hostId = localStorage.getItem('survival_host_id_v4');
            const link = `https://muongi3.github.io/demo/?playerId=${hostId}&v=18`;
            navigator.clipboard.writeText(link).then(() => {
                copyBtn.innerText = "✅ ĐÃ SAO CHÉP!";
                setTimeout(() => copyBtn.innerText = "🔗 SAO CHÉP LINK XEM", 2000);
            }).catch(() => {
                alert("Link của bác đây: " + link);
            });
        };
    }
}

// Logic cho Thùng Góp Ý
document.addEventListener('DOMContentLoaded', () => {
    setupCopyBtn();
    
    const btnOpenFeedback = document.getElementById('btn-open-feedback');
    const modalFeedback = document.getElementById('feedback-modal');
    const btnCloseFeedback = document.getElementById('close-feedback-btn');
    const btnSendFeedback = document.getElementById('send-feedback-btn');
    const textFeedback = document.getElementById('feedback-text');

    if (btnOpenFeedback) {
        btnOpenFeedback.addEventListener('click', () => {
            modalFeedback.classList.remove('hidden');
        });
    }

    if (btnCloseFeedback) {
        btnCloseFeedback.addEventListener('click', () => {
            modalFeedback.classList.add('hidden');
            textFeedback.value = "";
        });
    }

    if (btnSendFeedback) {
        btnSendFeedback.addEventListener('click', () => {
            const content = textFeedback.value.trim();
            if (!content) { alert("Bác chưa nhập gì cả!"); return; }
            btnSendFeedback.innerText = "ĐANG GỬI...";
            btnSendFeedback.disabled = true;
            fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `📩 **GÓP Ý / BÁO LỖI MỚI** 📩\n━━━━━━━━━━━━━━━\n👤 Người chơi: **${STATE.playerName || "Khách"}**\n📝 Nội dung: \n> ${content}\n━━━━━━━━━━━━━━━`
                })
            }).then(() => {
                alert("Cảm ơn bác đã góp ý!");
                modalFeedback.classList.add('hidden');
                textFeedback.value = "";
            }).catch(() => {
                alert("Lỗi mạng, chưa gửi được góp ý!");
            }).finally(() => {
                btnSendFeedback.innerText = "GỬI";
                btnSendFeedback.disabled = false;
            });
        });
    }
});
