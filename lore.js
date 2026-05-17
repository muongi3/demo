// lore.js — Hệ thống Nhiệm vụ Tâm Linh & Mảnh Giấy

// Kho Lore theo độ khó: Càng khó thì thông tin bí ẩn càng tăng chi tiết và hấp dẫn!
const LORE_BY_DIFFICULTY = {
    easy: [
        { idx: 0, text: "\"Vết nứt không gian này đang lớn dần... Nó hút cạn sinh khí của mọi sinh vật tới gần.\"" },
        { idx: 1, text: "\"Những kẻ mất trí nhớ thường lặp lại một câu duy nhất: 'Mắt đỏ... đừng nhìn vào mắt đỏ...'.\"" },
        { idx: 2, text: "\"Thứ đang canh gác trung tâm hòn đảo không phải cỗ máy, mà là một sinh mệnh hấp thụ nỗi đau.\"" }
    ],
    normal: [
        { idx: 0, text: "\"Bản ghi cũ: Bức xạ ở đây làm biến đổi cấu trúc phân tử của sắt. Giáp trụ đang dần hòa làm một với xương thịt.\"" },
        { idx: 1, text: "\"Bản ghi cũ: Hộp tiếp tế không phải từ phe ta thả xuống. Có kẻ đang thao túng chúng ta như những con cờ.\"" },
        { idx: 2, text: "\"Bản ghi cũ: Sinh vật khổng lồ đó mang hình hài của Kẻ Phán Xét. Khi nó gục ngã, một 'Sự Thật' sẽ rơi ra.\"" },
        { idx: 3, text: "\"Bản ghi cũ: Cánh Cửa Đỏ chưa bao giờ đóng lại. Nó chỉ tạm thời bị bão hòa năng lượng khi kẻ canh giữ sụp đổ.\"" },
        { idx: 4, text: "\"Bản ghi cũ: Những người đi trước đã tìm thấy lõi nguồn... nhưng không ai trở về. Lõi nguồn đó hình như có màu đỏ tía...\"" }
    ],
    hard: [
        { idx: 0, text: "\"Mảnh ký ức phân mảnh: 'Dự án Red Gate' không phải tạo ra vũ khí, mà để mở khóa một chiều không gian cao hơn.\"" },
        { idx: 1, text: "\"Mảnh ký ức phân mảnh: Crimson là thứ chất lỏng có linh hồn. Nó chọn vật chủ, không phải ngược lại.\"" },
        { idx: 2, text: "\"Mảnh ký ức phân mảnh: Kẻ được chọn sẽ trải qua 3 giai đoạn tiến hóa. Giai đoạn cuối cùng là mất đi nhân tính hoàn toàn.\"" },
        { idx: 3, text: "\"Mảnh ký ức phân mảnh: Đừng tin vào sự tĩnh lặng của hòn đảo. Lớp sương mù kia thực chất là hàng vạn vi mạch giám sát.\"" },
        { idx: 4, text: "\"Mảnh ký ức phân mảnh: Thực thể cai quản Vòng Lặp có khả năng bóp méo không gian. Hắn ta điều khiển những cột trụ đẫm máu.\"" },
        { idx: 5, text: "\"Mảnh ký ức phân mảnh: Sự sống và cái chết ở đây không tuyến tính. Giết hắn ta có thể chỉ là bắt đầu một vòng lặp tồi tệ hơn.\"" },
        { idx: 6, text: "\"Mảnh ký ức phân mảnh: Sự giải thoát duy nhất nằm ở 'Nghịch lý Dữ liệu'. Bạn phải thu thập đủ mảnh vỡ trước khi thực thể đó bị hủy diệt.\"" }
    ],
    extreme: [
        { idx: 0, text: "\"DỮ LIỆU CẤM: Vòng lặp hiện tại: 849,204. Tỷ lệ đồng hóa vật chủ: 99.8%. Trạng thái: Sắp thức tỉnh.\"" },
        { idx: 1, text: "\"DỮ LIỆU CẤM: Hòn đảo này không tồn tại trên Trái Đất. Nó là một vùng giả lập bị bỏ hoang của một nền văn minh đã diệt vong.\"" },
        { idx: 2, text: "\"DỮ LIỆU CẤM: Bọn quái vật không cố giết bạn. Chúng đang cố ngăn bạn kích hoạt Cánh Cửa Đỏ để bảo vệ vũ trụ bên ngoài.\"" },
        { idx: 3, text: "\"DỮ LIỆU CẤM: Phương trình hỗn mang: Tâm trí nguyên vẹn + Máu Crimson + Sụp đổ Không thời gian = Điểm Kỳ Dị.\"" },
        { idx: 4, text: "\"DỮ LIỆU CẤM: Khi bạn hấp thụ Crimson (Trạng thái Tím), bạn đang dần hợp nhất với tâm trí của Kẻ Gác Cổng.\"" },
        { idx: 5, text: "\"DỮ LIỆU CẤM: Giải mã thành công 'Nghịch lý Dữ liệu' sẽ gây ra một vụ nổ khái niệm, xóa bỏ sự tồn tại của hòn đảo này khỏi mọi dòng thời gian.\"" },
        { idx: 6, text: "\"DỮ LIỆU CẤM: Kẻ mà bạn gọi là 'Boss' thực chất là phiên bản tương lai của chính bạn, kẻ đã chọn hy sinh để làm chốt chặn \"" },
        { idx: 7, text: "\"DỮ LIỆU CẤM: Nếu bạn đọc được dòng này, Cánh Cửa Đỏ đã bắt đầu đảo ngược quy trình. Đừng để hắn ta hoàn thành điệu nhảy tế lễ.\"" },
        { idx: 8, text: "\"DỮ LIỆU CẤM: Chiếc hộp cuối cùng chứa đựng ký ức nguyên thủy của bạn. Mở nó ra đồng nghĩa với việc chấp nhận phá vỡ Vòng Lặp Vĩnh Cửu.\"" }
    ]
};

function getLoreFragments() {
    const diff = window.CURRENT_DIFFICULTY || 'normal';
    return LORE_BY_DIFFICULTY[diff] || LORE_BY_DIFFICULTY['normal'];
}

// Kho nhiệm vụ động với đúng 8 loại nhiệm vụ hoàn toàn độc lập, khác biệt, cân bằng theo độ khó!
function getQuestPool() {
    const diff = window.CURRENT_DIFFICULTY || 'normal';

    // Cân cấu hình mục tiêu cụ thể theo từng độ khó để đảm bảo chơi vui, dễ thở mà không bị quá tải
    const config = {
        easy: {
            kill: 5,
            barrel_kill: 5,
            ultimate: 1,
            pickup_powerup: 1,
            purple_time: 15,
            survive: 30,
            heal: 400,
            headshot: 20
        },
        normal: {
            kill: 10,
            barrel_kill: 8,
            ultimate: 4,
            pickup_powerup: 2,
            purple_time: 30,
            survive: 60,
            heal: 800,
            headshot: 30
        },
        hard: {
            kill: 15,
            barrel_kill: 12,
            ultimate: 7,
            pickup_powerup: 3,
            purple_time: 45,
            survive: 90,
            heal: 1200,
            headshot: 40
        },
        extreme: {
            kill: 20,
            barrel_kill: 15,
            ultimate: 10,
            pickup_powerup: 4,
            purple_time: 60,
            survive: 130,
            heal: 1600,
            headshot: 50
        }
    };

    const c = config[diff] || config['normal'];

    return [
        { type: 'kill', target: c.kill, desc: `Hạ gục ${c.kill} sinh vật biến dị (bất kỳ cách nào)`, reward: '"Hồi 500 máu"' },
        { type: 'barrel_kill', target: c.barrel_kill, desc: `Gây sát thương bằng thùng nổ lên sinh vật ${c.barrel_kill} lần`, reward: '"Hồi đầy máu"' },
        { type: 'use_ultimate', target: c.ultimate, desc: `Kích hoạt Kỹ năng Nổ (Ultimate) ${c.ultimate} lần`, reward: '"Hồi đầy giáp"' },
        { type: 'pickup_powerup', target: c.pickup_powerup, desc: `Nhặt bình kỹ năng (Loot box cam) ${c.pickup_powerup} lần`, reward: '"Hồi đầy máu & giáp"' },
        { type: 'purple_time', target: c.purple_time, desc: `Duy trì Trạng thái Siêu cấp (Dạng Tím) trong ${c.purple_time}s`, reward: '"Hồi 500 máu"' },
        { type: 'survive', target: c.survive, desc: `Sống sót né tránh hiểm họa trong ${c.survive} giây`, reward: '"Hồi đầy giáp"' },
        { type: 'heal', target: c.heal, desc: `Hấp thụ ${c.heal} máu từ các bình hồi phục cứu sinh`, reward: '"Hồi đầy máu"' },
        { type: 'headshot', target: c.headshot, desc: `Bắn chuẩn xác trúng đầu (Headshot) quái ${c.headshot} lần`, reward: '"Hồi đầy máu & giáp"' }
    ];
}

window.QuestManager = {
    totalCollected: 0,           // Số mảnh giấy đã nhặt
    activeQuests: [],            // Hàng đợi nhiệm vụ đang làm song song
    completedTypes: [],          // Lưu các loại nhiệm vụ đã hoàn thành để KHÔNG trùng lặp
    damageTracker: 0,            // Theo dõi sát thương cho task damage
    cumulativeKills: 0,          // Tích lũy số quái đã tiêu diệt từ đầu trận
    cumulativeBarrelKills: 0,    // Tích lũy số quái nổ bình từ đầu trận
    cumulativeHeadshots: 0,      // Tích lũy số headshots từ đầu trận

    /* --- Gán nhiệm vụ khi nhặt mảnh giấy --- */
    assignQuest: function () {
        if (this.totalCollected >= getLoreFragments().length) return;

        const pool = getQuestPool();
        const available = pool.filter(q =>
            !this.activeQuests.some(a => a.type === q.type) &&
            !this.completedTypes.includes(q.type)
        );
        if (available.length === 0) return;

        const qData = available[Math.floor(Math.random() * available.length)];
        
        // Tích hợp pre-tracked progress từ đầu trận
        let startVal = 0;
        if (qData.type === 'kill') startVal = this.cumulativeKills;
        if (qData.type === 'barrel_kill') startVal = this.cumulativeBarrelKills;

        const quest = {
            id: Date.now(),
            type: qData.type,
            target: qData.target,
            current: Math.min(startVal, qData.target), // Khởi điểm bằng số lượng đã làm từ trước (tối đa bằng target)
            desc: qData.desc,
            reward: qData.reward
        };
        this.activeQuests.push(quest);
        this.checkCompletion(); // Kiểm tra xem nếu đủ rồi thì hoàn thành luôn lập tức
        this.updateUI();
        document.getElementById('quest-tracker-ui').classList.remove('hidden');
    },

    /* --- Gọi mỗi frame --- */
    update: function (dt) {
        let changed = false;
        this.activeQuests.forEach(q => {
            if (q.type === 'survive') {
                q.current += dt;
                if (q.current > q.target) q.current = q.target;
                changed = true;
            }
        });
        this.checkCompletion();
        if (changed) this.updateUI();
    },

    /* --- Hook sự kiện từ game.js --- */
    onEvent: function (type, amount) {
        // Tích lũy sẵn từ đầu trận cho các nhiệm vụ liên quan đến quái (để tránh bị kẹt nếu người chơi giết quái trước khi nhận quest)
        if (type === 'kill') this.cumulativeKills += amount;
        if (type === 'barrel_kill') this.cumulativeBarrelKills += amount;
        if (type === 'headshot') this.cumulativeHeadshots += amount;

        this.activeQuests.forEach(q => {
            if (q.type === type) {
                q.current += amount;
                if (q.current > q.target) q.current = q.target;
            }
        });
        if (type === 'damage') this.damageTracker += amount;
        this.checkCompletion();
        this.updateUI();
    },

    /* --- Kiểm tra hoàn thành --- */
    checkCompletion: function () {
        const done = this.activeQuests.filter(q => q.current >= q.target);
        done.forEach(q => this.completeQuest(q));
    },

    /* --- Hoàn thành 1 nhiệm vụ --- */
    completeQuest: function (quest) {
        this.activeQuests = this.activeQuests.filter(q => q.id !== quest.id);
        if (!this.completedTypes.includes(quest.type)) {
            this.completedTypes.push(quest.type);
        }
        this.totalCollected = Math.min(this.totalCollected + 1, getLoreFragments().length);

        // Thưởng theo loại
        if (window.STATE && window.GAME_CONFIG) {
            const P = window.GAME_CONFIG.player;
            const pl = window.STATE.player;
            if (quest.reward.includes('đầy máu')) pl.hp = P.maxHp;
            else if (quest.reward.includes('500')) pl.hp = Math.min(pl.hp + 500, P.maxHp);
            else if (quest.reward.includes('400')) pl.hp = Math.min(pl.hp + 400, P.maxHp);
            else if (quest.reward.includes('300')) pl.hp = Math.min(pl.hp + 300, P.maxHp);

            if (quest.reward.includes('đầy giáp')) pl.armor = P.maxArmor;
        }

        // Thông báo xanh
        const ann = document.getElementById('global-announcement');
        if (ann) {
            ann.innerText = `✅ HOÀN THÀNH: ${quest.desc} — ${quest.reward}!`;
            ann.style.color = '#00ff88';
            ann.style.opacity = '1';
            setTimeout(() => { ann.style.opacity = '0'; }, 3500);
        }

        // Hiện Lore Fragment
        const frag = getLoreFragments()[this.totalCollected - 1];
        if (frag) {
            const container = document.getElementById('lore-container');
            if (container) {
                container.innerText = frag.text;
                container.classList.remove('hidden');
                setTimeout(() => { container.style.opacity = '1'; }, 100);
                setTimeout(() => {
                    container.style.opacity = '0';
                    setTimeout(() => container.classList.add('hidden'), 2000);
                }, 6000);
            }
        }

        this.updateUI();
        if (this.activeQuests.length === 0)
            document.getElementById('quest-tracker-ui').classList.add('hidden');
    },

    /* --- Cập nhật UI Quest Tracker --- */
    updateUI: function () {
        // Luôn cập nhật bộ đếm mảnh giấy (dù đang trong game hay menu)
        const counter = document.getElementById('lore-counter');
        if (counter) {
            const total = getLoreFragments().length;
            counter.innerText = `📦 ${this.totalCollected} / ${total}`;
            counter.style.color = this.totalCollected >= total ? '#00ff88' : '#ffcc00';
            counter.style.textShadow = this.totalCollected >= total ? '0 0 8px #00ff88' : '';
        }

        // Cập nhật danh sách nhiệm vụ đang làm
        const list = document.getElementById('quest-list');
        if (!list) return;
        list.innerHTML = '';
        this.activeQuests.forEach(q => {
            const div = document.createElement('div');
            div.className = 'quest-item';
            let progressText = '';
            if (q.type === 'survive') {
                progressText = `${Math.floor(q.current)}s / ${q.target}s`;
            } else if (q.type === 'purple_time') {
                progressText = `${Math.floor(q.current)}s / ${q.target}s`;
            } else if (q.type === 'damage') {
                progressText = `${Math.floor(q.current)} / ${q.target}`;
            } else {
                progressText = `${q.current} / ${q.target}`;
            }
            const pct = Math.min(q.current / q.target * 100, 100);
            div.innerHTML = `
                <div class="quest-desc">${q.desc}</div>
                <div class="quest-bar-wrap">
                    <div class="quest-bar-fill" style="width:${pct}%"></div>
                    <span class="quest-progress-txt">${progressText}</span>
                </div>`;
            list.appendChild(div);
        });
    }
};
