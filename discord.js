/**
 * discord.js - v18.2
 * Chuyên trách hệ thống Discord và Góp ý
 */

// --- CẤU HÌNH WEBHOOK ---
const WEBHOOK_URL = "https://discord.com/api/webhooks/1499169990350471359/SQrGcSeCjvW3JleJv6rfoBpk5ffwmYpojnLlW5HFdS9oRfn7Gg5UvrYPV95TaAY_6pau";

// --- THÔNG BÁO VÀO TRẬN ---
function sendLiveNotification() {
    const STATE = window.STATE;
    const time = new Date().toLocaleTimeString('vi-VN');
    const bots = STATE.config ? (STATE.config.botCount || 25) : 25;
    const message = [
        `🎮 **${STATE.playerName}** vừa bắt đầu trận!`,
        `━━━━━━━━━━━━━━━`,
        `⏰ Giờ: \`${time}\``,
        `🤖 Số bot: \`${bots}\``,
        `━━━━━━━━━━━━━━━`
    ].join('\n');
    fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
        keepalive: true
    }).catch(() => { });
}

// --- EXIT DETECTION & DISCORD ---
function sendExitToDiscord(reason) {
    const STATE = window.STATE;
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
    const STATE = window.STATE;
    if (STATE.hasExited) return;
    STATE.hasExited = true;
    sendExitToDiscord(reason);
}

function finishGameAndSendToDiscord() {
    const STATE = window.STATE;
    if (STATE.finalStats) {
        const s = STATE.finalStats;
        const resultLabel = s.win ? "🏆 CHIẾN THẮNG" : "💀 THẤT BẠI";

        fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `🎮 **KẾT QUẢ TRẬN ĐẤU** 🎮\n━━━━━━━━━━━━━━━\n👤 Người chơi: **${STATE.playerName}**\n🏁 Kết quả: **${resultLabel}**\n🔫 Kills: \`${s.kills}\` mạng\n⏱️ Thời gian: \`${s.duration} giây\`\n📅 Ngày: \`${s.date}\`\n━━━━━━━━━━━━━━━`
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

// --- UI HELPERS (MENU & GÓP Ý) ---
document.addEventListener('DOMContentLoaded', () => {
    const STATE = window.STATE;
    const log = (msg) => fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: msg }), keepalive: true }).catch(() => { });

    // Logger cho các nút Menu
    document.getElementById('btn-open-guide')?.addEventListener('click', () => {
        log(`📖 **${STATE.playerName}** đang xem hướng dẫn sinh tồn...`);
    });

    document.getElementById('btn-join-discord')?.addEventListener('click', () => {
        log(`💬 **${STATE.playerName}** định gia nhập Discord cộng đồng!`);
    });

    // Logic Thùng Góp Ý
    const modalFeedback = document.getElementById('feedback-modal');
    const textFeedback = document.getElementById('feedback-text');
    const btnSend = document.getElementById('send-feedback-btn');

    document.getElementById('btn-open-feedback')?.addEventListener('click', () => modalFeedback.classList.remove('hidden'));
    document.getElementById('close-feedback-btn')?.addEventListener('click', () => { modalFeedback.classList.add('hidden'); textFeedback.value = ""; });

    btnSend?.addEventListener('click', () => {
        const content = textFeedback.value.trim();
        if (!content) return alert("Bác chưa nhập gì cả!");
        btnSend.innerText = "ĐANG GỬI...";
        btnSend.disabled = true;
        
        log(`📩 **GÓP Ý MỚI** 📩\n━━━━━━━━━━━━━━━\n👤 Player: **${STATE.playerName}**\n📝 Nội dung: \n> ${content}\n━━━━━━━━━━━━━━━`)
            .then(() => {
                alert("Cảm ơn bác đã góp ý!");
                modalFeedback.classList.add('hidden');
                textFeedback.value = "";
            })
            .finally(() => {
                btnSend.innerText = "GỬI";
                btnSend.disabled = false;
            });
    });
});
