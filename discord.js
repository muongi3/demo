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
    const diffLabel = window.DIFFICULTY_PRESETS[window.CURRENT_DIFFICULTY].label;
    const message = [
        `🎮 **${STATE.playerName}** vừa bắt đầu trận!`,
        `━━━━━━━━━━━━━━━`,
        `⏰ Giờ: \`${time}\``,
        `🤖 Số bot: \`${bots}\``,
        `⚔️ Chế độ: **${diffLabel}**`,
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
    if (!STATE || STATE.hasExited) return;
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
    if (!STATE || STATE.hasExited) return;
    STATE.hasExited = true;
    sendExitToDiscord(reason);
}

window.logToDiscord = function(msg) {
    fetch(WEBHOOK_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ content: msg }), 
        keepalive: true 
    }).catch(() => { });
};

let hasSentFinalResult = false;
window.sendFinalResultToDiscord = function(forceReload = false) {
    if (hasSentFinalResult) {
        if (forceReload) location.reload();
        return;
    }
    hasSentFinalResult = true;
    const STATE = window.STATE;
    if (STATE) STATE.hasExited = true; // Ngăn chặn gửi thêm thông báo thoát game khi chuyển trang/reload sau khi kết thúc trận

    if (STATE && STATE.finalStats) {
        const s = STATE.finalStats;
        const resultLabel = s.win ? "🏆 CHIẾN THẮNG" : "💀 THẤT BẠI";

        const diffLabel = window.DIFFICULTY_PRESETS ? window.DIFFICULTY_PRESETS[window.CURRENT_DIFFICULTY].label : "Thường";
        fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `🎮 **KẾT QUẢ TRẬN ĐẤU** 🎮\n━━━━━━━━━━━━━━━\n👤 Người chơi: **${STATE.playerName}**\n⚔️ Chế độ: **${diffLabel}**\n🏁 Kết quả: **${resultLabel}**\n🔫 Kills: \`${s.kills}\` mạng\n📦 Hộp đã nhặt: \`${window.QuestManager ? window.QuestManager.totalCollected : 0}/${window.getLoreFragments ? window.getLoreFragments().length : '?'}\` hộp\n✅ Nhiệm vụ hoàn thành: \`${window.QuestManager ? window.QuestManager.totalCompleted : 0}/${window.getLoreFragments ? window.getLoreFragments().length : '?'}\` nhiệm vụ\n⏱️ Thời gian: \`${s.duration} giây\`\n📅 Ngày: \`${s.date}\`\n━━━━━━━━━━━━━━━`
            }),
            keepalive: true
        }).finally(() => {
            if (forceReload) location.reload();
        });
    } else {
        if (forceReload) location.reload();
    }
};

function finishGameAndSendToDiscord() {
    window.sendFinalResultToDiscord(true);
}

// --- EVENT LISTENERS (GLOBAL & MOBILE) ---

// 1. Phát hiện đóng tab / Refresh / Chuyển trang (PC & Mobile)
window.addEventListener('beforeunload', () => handlePlayerExit('Đóng tab hoặc tải lại trang'));

// 2. Phát hiện ẩn trình duyệt / Vuốt thoát ứng dụng (Rất quan trọng trên Mobile)
window.addEventListener('pagehide', (e) => {
    // Nếu không phải là di chuyển trong cùng trang (ví dụ reload)
    handlePlayerExit(e.persisted ? 'Ẩn ứng dụng (vào chế độ ngủ)' : 'Vuốt thoát / Đóng trình duyệt');
});

// 3. Phát hiện mất mạng đột ngột
window.addEventListener('offline', () => handlePlayerExit('Mất kết nối mạng'));

// 4. Phát hiện ẩn/hiện tab (Visibility API)
let backgroundExitTimer = null;
document.addEventListener('visibilitychange', () => {
    const STATE = window.STATE;
    if (document.visibilityState === 'hidden') {
        // Thông báo ngay khi người chơi vừa ẩn game xuống nền
        if (!STATE.hasExited && STATE.screen === 'game') {
             // Chỉ thông báo "Ẩn game" nếu đang trong trận
             sendExitToDiscord('Ẩn game xuống nền (có thể đã thoát)');
        }
        
        // Nếu sau 15 giây không quay lại, coi như đã thoát hẳn
        backgroundExitTimer = setTimeout(() => {
            handlePlayerExit('Thoát game do ở nền quá lâu (15s)');
        }, 15000);
    } else {
        // Nếu quay lại kịp lúc
        if (backgroundExitTimer) {
            clearTimeout(backgroundExitTimer);
            backgroundExitTimer = null;
        }
    }
});

// 5. Page Lifecycle API (Dành cho Mobile hiện đại)
window.addEventListener('freeze', () => handlePlayerExit('Ứng dụng bị hệ thống đóng (Freeze)'));

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
        // Bác thay URL bên dưới bằng link Discord thật của bác nhé!
        window.open('https://discord.gg/YOUR_LINK_HERE', '_blank');
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
