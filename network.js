/* ==========================================================================
   NETWORK.JS — Hệ thống Mạng PeerJS P2P State Sync (Host & Viewer)
   ========================================================================== */

window.SpectatorNetwork = {
    peer: null,
    connections: new Map(), // Danh sách khán giả đang kết nối (Host mode)
    hostConn: null, // Kết nối tới Host (Viewer mode)
    roomId: null,
    isHost: false,
    pingInterval: null,
    latency: 0,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    lastHeartbeat: 0,

    // KHỞI TẠO HOST (Máy Người Chơi)
    initHost: function() {
        this.isHost = true;
        // Tạo ID phòng ngẫu nhiên (VD: LIR-8492)
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        this.roomId = `LIR-${randomNum}`;
        window.SPECTATOR_ROOM_ID = this.roomId;

        // Khởi tạo PeerJS kết nối với Cloud
        this.peer = new Peer(this.roomId, {
            debug: 1,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }] }
        });

        this.peer.on('open', id => {
            console.log(`[NETWORK HOST] Phòng Broadcast đã mở thành công! ID: ${id}`);
        });

        this.peer.on('connection', conn => {
            console.log(`[NETWORK HOST] Khán giả mới kết nối: ${conn.peer}`);
            
            conn.on('open', () => {
                this.connections.set(conn.peer, conn);
                this.broadcastMeta(); // Gửi lại danh sách viewer count cho tất cả
            });

            conn.on('data', data => {
                if (data.type === 'ping') {
                    conn.send({ type: 'pong', ts: data.ts });
                }
            });

            conn.on('close', () => {
                console.log(`[NETWORK HOST] Khán giả ngắt kết nối: ${conn.peer}`);
                this.connections.delete(conn.peer);
                this.broadcastMeta();
            });

            conn.on('error', err => {
                this.connections.delete(conn.peer);
                this.broadcastMeta();
            });
        });

        this.peer.on('error', err => {
            console.error('[NETWORK HOST ERROR]', err);
        });
    },

    // KHỞI TẠO VIEWER (Máy Khán Giả)
    initViewer: function(targetRoomId) {
        this.isHost = false;
        this.roomId = targetRoomId;

        this.peer = new Peer({
            debug: 1,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        this.peer.on('open', id => {
            console.log(`[NETWORK VIEWER] Đã tạo định danh khán giả: ${id}, đang gọi Host ${targetRoomId}...`);
            this.connectToHost();
        });

        this.peer.on('error', err => {
            console.error('[NETWORK VIEWER ERROR]', err);
            this.handleDisconnect();
        });
    },

    // THỰC HIỆN KẾT NỐI (Viewer -> Host)
    connectToHost: function() {
        if (!this.peer || !this.roomId) return;
        
        console.log(`[NETWORK VIEWER] Đang thiết lập DataChannel tới ${this.roomId}...`);
        this.hostConn = this.peer.connect(this.roomId, { reliable: false }); // Reliable=false để ưu tiên tốc độ (UDP style)

        this.hostConn.on('open', () => {
            console.log('[NETWORK VIEWER] ĐÃ KẾT NỐI THÀNH CÔNG TỚI HOST!');
            this.reconnectAttempts = 0;
            if (window.SpectatorEngine) window.SpectatorEngine.onConnected();
            this.startHeartbeat();
        });

        this.hostConn.on('data', packet => {
            this.lastHeartbeat = performance.now();
            if (packet.type === 'pong') {
                this.latency = Math.round((performance.now() - packet.ts) / 2);
                if (window.SpectatorEngine) window.SpectatorEngine.onPingUpdated(this.latency);
            } else if (packet.type === 'state') {
                if (window.SpectatorEngine) window.SpectatorEngine.onStateReceived(packet.data);
            } else if (packet.type === 'meta') {
                if (window.SpectatorEngine) window.SpectatorEngine.onMetaReceived(packet.data);
            }
        });

        this.hostConn.on('close', () => this.handleDisconnect());
        this.hostConn.on('error', () => this.handleDisconnect());
    },

    // HEARTBEAT & PING CALCULATION
    startHeartbeat: function() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
            if (this.hostConn && this.hostConn.open) {
                this.hostConn.send({ type: 'ping', ts: performance.now() });
            }
            // Nếu 5 giây không nhận được tín hiệu -> Đứt mạng
            if (performance.now() - this.lastHeartbeat > 5000 && this.lastHeartbeat > 0) {
                console.warn('[NETWORK VIEWER] Quá giờ Heartbeat, đang thử kết nối lại...');
                this.handleDisconnect();
            }
        }, 1500);
    },

    // AUTO RECONNECT
    handleDisconnect: function() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (window.SpectatorEngine) window.SpectatorEngine.onDisconnected();

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 5000);
            console.log(`[NETWORK VIEWER] Đứt kết nối. Thử kết nối lại lần ${this.reconnectAttempts} sau ${delay}ms...`);
            setTimeout(() => this.connectToHost(), delay);
        } else {
            console.error('[NETWORK VIEWER] Vượt quá giới hạn kết nối lại. Bỏ cuộc.');
        }
    },

    // BROADCAST GAME STATE (Host gửi đi 30 FPS)
    broadcastState: function(gameStateData) {
        if (!this.isHost || this.connections.size === 0) return;
        const packet = { type: 'state', data: gameStateData };
        for (const [id, conn] of this.connections) {
            if (conn.open) conn.send(packet);
        }
    },

    // BROADCAST META DATA (Viewer count, Room info)
    broadcastMeta: function() {
        if (!this.isHost) return;
        const metaPacket = { type: 'meta', data: { viewerCount: this.connections.size } };
        for (const [id, conn] of this.connections) {
            if (conn.open) conn.send(metaPacket);
        }
    }
};
