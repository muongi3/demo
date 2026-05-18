/* ==========================================================================
   SPECTATOR.JS — Bộ xử lý Vòng lặp Nội Suy & Camera Khán Giả
   ========================================================================== */

window.SpectatorEngine = {
    stateBuffer: [],
    bufferDelay: 100, // Bộ đệm 100ms để mượt mà hóa (Interpolation Delay)
    lastRenderTime: 0,
    isConnected: false,
    viewerCount: 0,
    ping: 0,

    // KHI BẮT ĐẦU KẾT NỐI
    onConnected: function() {
        this.isConnected = true;
        document.getElementById('spec-loading-screen').style.opacity = '0';
        setTimeout(() => document.getElementById('spec-loading-screen').style.display = 'none', 500);
        document.getElementById('ping-value').innerText = "24ms";
        document.querySelector('.ping-ind').className = "ping-ind";
    },

    onDisconnected: function() {
        this.isConnected = false;
        const loading = document.getElementById('spec-loading-screen');
        loading.style.display = 'flex';
        loading.style.opacity = '1';
        document.querySelector('.loading-text').innerText = "MẤT TÍN HIỆU HOST";
        document.querySelector('.sub-loading-text').innerText = "Đang cố gắng kết nối lại...";
        document.querySelector('.ping-ind').className = "ping-ind dc";
        document.getElementById('ping-value').innerText = "DISCONNECTED";
    },

    onPingUpdated: function(latency) {
        this.ping = latency;
        const ind = document.querySelector('.ping-ind');
        document.getElementById('ping-value').innerText = `${latency}ms`;
        if (latency > 150) ind.className = "ping-ind lag";
        else ind.className = "ping-ind";
    },

    onMetaReceived: function(meta) {
        if (meta.viewerCount !== undefined) {
            this.viewerCount = meta.viewerCount;
            document.getElementById('viewer-count-val').innerText = `${meta.viewerCount} VIEWER${meta.viewerCount > 1 ? 'S' : ''}`;
        }
    },

    // KHI NHẬN GÓI DỮ LIỆU TỪ NETWORK (30 FPS)
    onStateReceived: function(stateData) {
        const now = performance.now();
        this.stateBuffer.push({ ...stateData, localTs: now });
        
        while (this.stateBuffer.length > 30 && (now - this.stateBuffer[0].localTs) > 1000) {
            this.stateBuffer.shift();
        }

        // Cập nhật giao diện HUD Spectator
        if (stateData.player) {
            const p = stateData.player;
            const healthPct = Math.max(0, Math.min(100, (p.hp / (p.maxHp || 100)) * 100));
            document.getElementById('spec-health-fill').style.width = `${healthPct}%`;
            document.getElementById('spec-health-text').innerText = `${Math.round(p.hp)} / ${p.maxHp || 100}`;
            document.getElementById('spec-kills-val').innerText = `${p.kills || 0} KILLS`;
            document.getElementById('spec-alive-val').innerText = `${stateData.stats ? stateData.stats.alive : 25} ALIVE`;
        }
    },

    // VÒNG LẶP CHÍNH (Nội suy vị trí Player, Camera & Bots ở 60 FPS)
    syncLoop: function(now) {
        if (!this.isConnected || this.stateBuffer.length < 2) return;

        const targetTs = now - this.bufferDelay;

        let s0 = null, s1 = null;
        for (let i = 0; i < this.stateBuffer.length - 1; i++) {
            if (this.stateBuffer[i].localTs <= targetTs && this.stateBuffer[i+1].localTs >= targetTs) {
                s0 = this.stateBuffer[i];
                s1 = this.stateBuffer[i+1];
                break;
            }
        }

        if (!s0 || !s1) {
            s0 = this.stateBuffer[this.stateBuffer.length - 2];
            s1 = this.stateBuffer[this.stateBuffer.length - 1];
        }

        let alpha = (targetTs - s0.localTs) / (s1.localTs - s0.localTs);
        alpha = Math.max(0, Math.min(1, alpha));

        // NỘI SUY VỊ TRÍ PLAYER & CAMERA
        if (s0.player && s1.player && window.STATE && window.STATE.player && window.STATE.camera) {
            if (!window.STATE.player.pos) window.STATE.player.pos = { x: 0, y: 0, z: 0 };
            const pos = window.STATE.player.pos;
            const rot = window.STATE.camera.rot;

            pos.x = this.lerp(s0.player.pos.x, s1.player.pos.x, alpha);
            pos.y = this.lerp(s0.player.pos.y, s1.player.pos.y, alpha);
            pos.z = this.lerp(s0.player.pos.z, s1.player.pos.z, alpha);
            rot.x = this.lerp(s0.player.rot.x, s1.player.rot.x, alpha);
            rot.y = this.lerpAngle(s0.player.rot.y, s1.player.rot.y, alpha);

            window.STATE.player.hp = s1.player.hp;
            window.STATE.player.maxHp = s1.player.maxHp;
            window.STATE.player.weaponIdx = s1.player.weaponIdx;

            // Di chuyển camera bám sát Player
            window.STATE.camera.pos.x = pos.x;
            window.STATE.camera.pos.y = pos.y + 1.6; // Mắt nhân vật cao 1.6m
            window.STATE.camera.pos.z = pos.z;
        }

        // NỘI SUY VỊ TRÍ BOTS
        if (s0.bots && s1.bots && window.STATE) {
            if (!window.STATE.bots) window.STATE.bots = [];
            const newBotsList = [];

            s1.bots.forEach(b1 => {
                let existingBot = window.STATE.bots.find(b => b.id === b1.id);
                if (!existingBot) {
                    existingBot = { id: b1.id, pos: { x: b1.pos.x, y: b1.pos.y, z: b1.pos.z }, yaw: b1.yaw, hp: b1.hp, maxHp: b1.maxHp, state: b1.state };
                } else {
                    const b0 = s0.bots.find(b => b.id === b1.id);
                    if (b0) {
                        existingBot.pos.x = this.lerp(b0.pos.x, b1.pos.x, alpha);
                        existingBot.pos.y = this.lerp(b0.pos.y, b1.pos.y, alpha);
                        existingBot.pos.z = this.lerp(b0.pos.z, b1.pos.z, alpha);
                        existingBot.yaw = this.lerpAngle(b0.yaw, b1.yaw, alpha);
                    } else {
                        existingBot.pos.x = b1.pos.x; existingBot.pos.y = b1.pos.y; existingBot.pos.z = b1.pos.z; existingBot.yaw = b1.yaw;
                    }
                    existingBot.hp = b1.hp; existingBot.state = b1.state;
                }
                newBotsList.push(existingBot);
            });
            window.STATE.bots = newBotsList;
        }

        // ĐỒNG BỘ PROJECTILES VÀ LOOT
        if (s1.projectiles && window.STATE) {
            window.STATE.projectiles = s1.projectiles.map(pr => ({ pos: { x: pr.pos.x, y: pr.pos.y, z: pr.pos.z } }));
        }
        if (s1.loot && window.STATE) {
            window.STATE.loot = s1.loot.map(l => ({ pos: { x: l.pos.x, y: l.pos.y, z: l.pos.z }, type: l.type }));
        }
    },

    lerp: function(start, end, amt) {
        return (1 - amt) * start + amt * end;
    },

    lerpAngle: function(a, b, amt) {
        const d = b - a;
        let delta = (d + Math.PI) % (Math.PI * 2) - Math.PI;
        if (delta < -Math.PI) delta += Math.PI * 2;
        return a + delta * amt;
    },

    copyRoomLink: function() {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            const btn = document.getElementById('btn-copy-link');
            btn.innerHTML = "✔️ ĐÃ COPY";
            btn.style.borderColor = "#00e676";
            btn.style.color = "#00e676";
            setTimeout(() => {
                btn.innerHTML = "📋 COPY LINK";
                btn.style.borderColor = "#aa00ff";
                btn.style.color = "#fff";
            }, 2000);
        });
    }
};
