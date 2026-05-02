let canClickContinue = false;
const isMobile = window.matchMedia("(max-width: 800px), (pointer: coarse)").matches;
const isFacebookApp = /FBAN|FBAV|Messenger/i.test(navigator.userAgent);

// 1. NHẬN DIỆN VAI TRÒ NGAY LẬP TỨC

const V3 = {
    create: (x = 0, y = 0, z = 0) => ({ x, y, z }),
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
    sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    mul: (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
    len: (a) => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z),
    norm: (a) => { let l = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); return l > 0 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 0, y: 0, z: 0 }; },
    dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
    cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
    dist: (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2),
    clone: (a) => ({ x: a.x, y: a.y, z: a.z })
};

window.GAME_CONFIG = {
    // ==========================================================================================
    // 👤 THÔNG SỐ NGƯỜI CHƠI (PLAYER STATS)
    // ==========================================================================================
    player: {
        maxHp: 1000,                // Máu tối đa. Tăng -> Trâu hơn, khó chết. Giảm -> Dễ "bay màu".
        maxArmor: 500,              // Giáp tối đa. Giáp đỡ sát thương trước máu. Tăng -> Chống chịu tốt hơn.
        walkSpeed: 8,               // Tốc độ chạy/đi bộ bình thường.
        sprintMultiplier: 2.0,      // Hệ số chạy nhanh khi giữ Shift. (vd: 8 x 2.0 = 16 đơn vị tốc độ).
        jumpPower: 10,              // Lực nhảy cao (Phím Space).
        sniperSpeed: 6,             // Tốc độ khi cầm súng bắn tỉa (Sniper) - Súng nặng nên đi chậm hơn.
        powerupSpeedMultiplier: 1.8 // Hệ số tăng tốc khi nhặt được "Bùa Tốc Độ" (màu xanh).
    },

    // ==========================================================================================
    // 🤖 THÔNG SỐ QUÁI VẬT (BOT AI STATS)
    // ==========================================================================================
    bot: {
        hpLv1: 200,          // Máu quái thường (Lv1).
        hpLv2: 250,          // Máu quái hóa đỏ (Lv2). (+50 máu)
        hpLv3: 400,          // Máu 3 con cuối (Lv3). (+200 máu so với Lv1)

        speedLv1: 7,         // Tốc độ quái Lv1.
        speedLv2: 11,        // Tốc độ quái khi hóa đỏ (Lv2).
        speedLv3: 15.5,        // Tốc độ quái 3 con cuối (Lv3).

        baseDamage: 10,       // Sát thương cào Lv1.
        enragedDamageLv2: 30, // Sát thương quái khi hóa đỏ (Lv2).
        enragedDamageLv3: 60, // Sát thương quái 3 con cuối (Lv3).
        detectRadius: 40,     // Tầm nhìn của quái.
        attackRange: 2.5,     // Khoảng cách quái có thể cào.
        attackCD: 0.8,        // Hồi chiêu cào (giây).
        evolveTime: 2.0       // Thời gian gồng hóa Lv3.
    },

    // ==========================================================================================
    // 👹 THÔNG SỐ TRÙM CUỐI (NIGHTMARE BOSS - HAKARI)
    // ==========================================================================================
    boss: {
        hp: 8000,             // Máu của Boss. Tăng -> Trận đấu kéo dài và khó hơn.
        passiveDamage: 100,   // Sát thương áp sát. Đứng quá gần Boss sẽ tự mất máu (mỗi giây).
        skillCD: 5,           // Thời gian hồi chiêu giữa các đòn đánh. Giảm -> Boss ra chiêu liên tục.
        postSkillRest: 3,     // Thời gian Boss đứng yên nghỉ sau mỗi chiêu. Tăng -> Cho người chơi dễ thở.

        // CHIÊU 1: LƯỚT (DASH) - Boss lao thẳng vào người chơi
        skill1: {
            damage: 400,      // Sát thương khi bị tông trúng.
            prepareTime: 1.0, // Thời gian rặn trước khi lướt. Tăng -> Boss lướt chậm hơn.
            activeTime: 0.8,  // Thời gian trong khi lướt.
            speed: 110,       // Tốc độ lướt. Tăng -> Boss lướt như tia chớp.
            width: 8          // Độ rộng vùng sát thương. Tăng -> Khó né hơn.
        },
        // CHIÊU 2: ĐẠI BÁC (SHOOT) - Boss nhắm laser và bắn chuỗi đạn
        skill2: {
            damage: 200,      // Sát thương mỗi viên đạn.
            prepareTime: 1.0, // Thời gian laser nhắm bắn. Tăng -> Dễ né hơn.
            shotCount: 15,    // Số lượng đạn bắn ra mỗi đợt.
            interval: 0.1,    // Thời gian giữa mỗi viên đạn. Giảm -> Đạn xả như mưa.
            speed: 100,       // Tốc độ bay của đạn.
        },
        // CHIÊU 3: NHẢY DẬM (JUMP/SLAM) - Boss nhảy lên và dậm mạnh xuống đất
        skill3: {
            damage: 600,      // Sát thương khi Boss dậm trúng.
            prepareTime: 2.0, // Thời gian rặn trước khi nhảy.
            range: 25,        // Tầm nổ của cú dậm. Tăng -> Vùng ảnh hưởng rộng hơn.
            jumpPower: 45,    // Độ cao cú nhảy.
            gravity: 50       // Trọng lực kéo Boss xuống. Tăng -> Boss rơi xuống nhanh hơn.
        },
        // CHIÊU 4: CỘT MÁU (CRIMSON PILLARS) - Triệu hồi các cột lửa từ dưới đất
        skill4: {
            damage: 300,      // Sát thương mỗi cột lửa.
            prepareTime: 2.5, // Thời gian vòng đỏ hiện lên trước khi nổ. Tăng -> Dễ né.
            count: 20,        // Số lượng cột lửa triệu hồi. Tăng -> Kín bản đồ.
            pillarRange: 9,   // Bán kính nổ của mỗi cột.
            pillarTimer: 2.0  // Thời gian cột nổ từ lúc hiện cảnh báo.
        },
        // CHIÊU 5: DỊCH CHUYỂN (TELEPORT STRIKE) - Boss chìm xuống đất và trồi lên đập
        skill5: {
            damage: 400,      // Sát thương cú đập khi trồi lên.
            prepareTime: 2.0, // Thời gian Boss chìm xuống đất.
            activeTime: 3.0,  // Tổng thời gian chiêu thức (Boss biến mất).
            range: 33         // Tầm đập của chiêu này. Tăng -> Rất khó né.
        }
    },

    // ==========================================================================================
    // ⚙️ THÔNG SỐ KHÁC (MISC STATS)
    // ==========================================================================================
    misc: {
        barrelHp: 20,               // Máu của thùng xăng. Giảm -> Bắn phát nổ ngay.
        barrelExplosionDamage: 200,  // Sát thương nổ thùng.
        barrelExplosionRange: 12,    // Tầm nổ của thùng.
        playerProjectileSpeed: 100   // Tốc độ đạn của người chơi.
    }
};

window.STATE = {
    screen: 'menu', lastTime: 0, camera: { pos: V3.create(0, 10, 20), rot: { x: 0, y: 0 } }, keys: {},
    mouse: { x: 0, y: 0, down: false, rightDown: false }, projectiles: [], particles: [], loot: [], powerups: [], bots: [], barrels: [], pads: [], obstacles: [],

    player: { pos: null, vel: V3.create(0, 0, 0), hp: window.GAME_CONFIG.player.maxHp, maxHp: window.GAME_CONFIG.player.maxHp, armor: 0, maxArmor: window.GAME_CONFIG.player.maxArmor, grounded: false, weaponIdx: 0, recoil: 0, kills: 0, alive: true, streak: 0, lastKillTime: 0, powerup: { type: null, time: 0 } },
    weapons: [
        { name: "Pistol", damage: 60, rate: 300, spread: 0.05, range: 50, ammo: 12, maxAmmo: 12, res: 129, type: 0 }, // Súng lục: Sát thương vừa, ổn định.
        { name: "SMG", damage: 40, rate: 180, spread: 0.1, range: 40, ammo: 30, maxAmmo: 30, res: 90, type: 1 },      // SMG: Bắn cực nhanh (rate thấp), sát thương thấp mỗi viên.
        { name: "Sniper", damage: 100, rate: 1000, spread: 0.001, range: 200, ammo: 5, maxAmmo: 5, res: 10, type: 2 } // Sniper: Sát thương cực cao, bắn xa, nhưng nạp đạn lâu.
    ],
    lastShot: 0, shake: 0, config: { botCount: 20, zoneSpeed: 5 },
    inputLocked: false,
    bossTriggered: false,
    isAiming: false,
    aimLerp: 0,
    boss: { active: false, pos: V3.create(0, 0, 0), vel: V3.create(0, 0, 0), hp: window.GAME_CONFIG.boss.hp, maxHp: window.GAME_CONFIG.boss.hp, state: 'idle', skillCD: window.GAME_CONFIG.boss.skillCD, targetPos: null, shotCount: 0, skillIndex: 0, pillarSpots: [], armLift: 0, bodyY: 0, bodyRot: 0, fanMesh: null, hasHit: false },
    startTime: 0,
    gameEnded: false,
    playerName: localStorage.getItem('savedPlayerName') || "Người chơi",
    enragedAnnounced: false,
    hasExited: false
};
const STATE = window.STATE;

// Hệ thống log thay thế cho debug
const logger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
};
window.onerror = (msg, url, line) => console.error(`❌ LỖI: ${msg} tại ${line}`);

const M4 = {
    identity: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    perspective: (fovy, aspect, near, far) => {
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, (2 * far * near) * nf, 0]);
    },
    lookAt: (eye, center, up) => {
        const z = V3.norm(V3.sub(eye, center));
        const x = V3.norm(V3.cross(up, z));
        const y = V3.cross(z, x);
        return new Float32Array([
            x.x, y.x, z.x, 0,
            x.y, y.y, z.y, 0,
            x.z, y.z, z.z, 0,
            -V3.dot(x, eye), -V3.dot(y, eye), -V3.dot(z, eye), 1
        ]);
    },
    multiply: (a, b) => {
        const out = new Float32Array(16);
        for (let r = 0; r < 4; ++r) for (let c = 0; c < 4; ++c) {
            let sum = 0; for (let k = 0; k < 4; ++k) sum += a[k * 4 + r] * b[c * 4 + k];
            out[c * 4 + r] = sum;
        }
        return out;
    },
    translation: (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]),
    scaling: (x, y, z) => new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]),
    rotationY: (rad) => {
        const s = Math.sin(rad), c = Math.cos(rad);
        return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
    },
    rotationX: (rad) => {
        const s = Math.sin(rad), c = Math.cos(rad);
        return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
    }
};

let gl;
window.addEventListener('load', () => {
    gl = document.getElementById('glcanvas').getContext('webgl2');
    if (!gl) {
        console.log("❌ WebGL2 KHÔNG HỖ TRỢ!");
        alert("Thiết bị của bác không hỗ trợ WebGL2. Vui lòng dùng trình duyệt khác!");
        return;
    }
    console.log("✅ WebGL2 OK");
    // Cập nhật kích thước canvas ngay khi load
    gl.canvas.width = window.innerWidth;
    gl.canvas.height = window.innerHeight;
    console.log("🎨 Khởi tạo Graphics...");
    initGraphics();
    console.log("📦 Khởi tạo Assets...");
    initAssets();
    console.log("🚀 Game initialized successfully!");

    console.log("🔍 Chế độ: NGƯỜI CHƠI (HOST)");
});

const VS_SOURCE = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in vec3 aColor;
layout(location=3) in mat4 aInstMod;

uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
uniform bool uInstanced;

out vec3 vNorm;
out vec3 vPos;
out vec3 vColor;
out float vDist;
out float vY;

void main() {
    mat4 model = uInstanced ? aInstMod : uModel;
    vec4 worldPos = model * vec4(aPos, 1.0);
    vPos = worldPos.xyz;
    vY = aPos.y;
    vNorm = mat3(model) * aNorm;
    vColor = aColor;
    gl_Position = uProj * uView * worldPos;
    vDist = gl_Position.w;
}`;

const FS_SOURCE = `#version 300 es
precision highp float;
in vec3 vNorm;
in vec3 vPos;
in vec3 vColor;
in float vDist;
in float vY;

uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec3 uFogColor;
uniform vec3 uEmitColor;
uniform float uTime;
uniform bool uIsWater;
uniform bool uIsSky;

out vec4 outColor;

void main() {
    if(uIsSky) {
        vec3 skyTop = vec3(0.01, 0.0, 0.0);
        vec3 skyBottom = vec3(0.05, 0.01, 0.01);
        float h = normalize(vPos - uCamPos).y * 0.5 + 0.5;
        outColor = vec4(mix(skyBottom, skyTop, h), 1.0);
        return;
    }

    vec3 N = normalize(vNorm);
    vec3 L = normalize(uSunDir);
    vec3 V = normalize(uCamPos - vPos);
    
    vec3 baseColor = vColor;
    
    if(uIsWater) {
        float wave = sin(vPos.x * 0.5 + uTime) * cos(vPos.z * 0.5 + uTime) * 0.1;
        baseColor = vec3(0.0, 0.4, 0.8);
        N = normalize(N + vec3(wave, 0.0, wave));
    }

    float diff = dot(N, L);
    float light = smoothstep(-0.2, 0.5, diff) * 0.6 + 0.4;
    
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), uIsWater ? 128.0 : 32.0);
    float specMask = smoothstep(0.7, 0.8, spec) * (uIsWater ? 0.8 : 0.3);
    
    float rim = 1.0 - max(dot(V, N), 0.0);
    rim = pow(rim, 4.0) * 0.4;
    
    vec3 finalColor = baseColor * light + vec3(specMask) + vec3(rim) + uEmitColor;
    
    // Giảm density từ 0.008 xuống 0.005 để nhìn rõ phía trước, tối dần về phía sau
    float fogFactor = 1.0 - exp(-vDist * 0.005);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    
    float alpha = uIsWater ? 0.7 : 1.0;
    outColor = vec4(mix(finalColor, uFogColor, fogFactor), alpha);
}`;

function createShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
}

let prog, locs;

function initGraphics() {
    prog = gl.createProgram();
    gl.attachShader(prog, createShader(VS_SOURCE, gl.VERTEX_SHADER));
    gl.attachShader(prog, createShader(FS_SOURCE, gl.FRAGMENT_SHADER));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(prog));

    locs = {
        proj: gl.getUniformLocation(prog, "uProj"),
        view: gl.getUniformLocation(prog, "uView"),
        model: gl.getUniformLocation(prog, "uModel"),
        camPos: gl.getUniformLocation(prog, "uCamPos"),
        sunDir: gl.getUniformLocation(prog, "uSunDir"),
        fogColor: gl.getUniformLocation(prog, "uFogColor"),
        emitColor: gl.getUniformLocation(prog, "uEmitColor"),
        instanced: gl.getUniformLocation(prog, "uInstanced"),
        time: gl.getUniformLocation(prog, "uTime"),
        isWater: gl.getUniformLocation(prog, "uIsWater"),
        isSky: gl.getUniformLocation(prog, "uIsSky"),
    };
}

function createMesh(verts, norms, cols) {
    const vao = gl.createVertexArray();
    const buffers = [];
    gl.bindVertexArray(vao);
    [[verts, 0, 3], [norms, 1, 3], [cols, 2, 3]].forEach(([data, loc, size]) => {
        const buf = gl.createBuffer();
        buffers.push(buf);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(loc);
    });
    return { vao, count: verts.length / 3, buffers };
}

function deleteMesh(mesh) {
    if (!mesh) return;
    if (mesh.vao) gl.deleteVertexArray(mesh.vao);
    if (mesh.buffers) mesh.buffers.forEach(b => gl.deleteBuffer(b));
}

function getCube(color = [1, 1, 1], sx = 1, sy = 1, sz = 1, ox = 0, oy = 0, oz = 0) {
    let v = [], n = [], c = [];
    let P = [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]];
    let idxs = [0, 1, 2, 0, 2, 3, 5, 4, 7, 5, 7, 6, 3, 2, 6, 3, 6, 7, 4, 5, 1, 4, 1, 0, 1, 5, 6, 1, 6, 2, 4, 0, 3, 4, 3, 7];
    let normals = [[0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]];
    for (let i = 0; i < idxs.length; i++) {
        let pt = P[idxs[i]];
        v.push(pt[0] * sx + ox, pt[1] * sy + oy, pt[2] * sz + oz);
        let nm = normals[Math.floor(i / 6)];
        n.push(...nm);
        c.push(...color);
    }
    return { v, n, c };
}

function genTreeMesh() {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    push(getCube([0.4, 0.25, 0.1], 0.5, 2, 0.5, 0, 1, 0));
    push(getCube([0.1, 0.5, 0.1], 2.5, 2, 2.5, 0, 2.5, 0));
    push(getCube([0.2, 0.6, 0.2], 1.8, 2, 1.8, 0, 4.0, 0));
    return createMesh(V, N, C);
}

function genHouseMesh() {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    const wallCol = [0.4, 0.4, 0.45]; // Tối tăm, mốc meo
    const roofCol = [0.3, 0.1, 0.1]; // Mái ngói vỡ nát
    const woodCol = [0.2, 0.15, 0.1]; // Gỗ mục

    push(getCube(wallCol, 5, 4, 5, 0, 2, 0));
    push(getCube([0.1, 0.1, 0.1], 1.5, 2.5, 5.1, 1.5, 1.25, 0)); // Vết thủng lớn

    push(getCube(roofCol, 5.2, 0.3, 5.2, 0, 4.15, 0));
    push(getCube(roofCol, 4.0, 0.3, 4.0, -0.5, 4.45, 0)); // Mái sụp xô lệch
    push(getCube(roofCol, 2.0, 0.3, 2.0, 0, 4.75, 0));

    push(getCube(woodCol, 1.2, 2.5, 0.2, 0, 1.25, 2.5));
    push(getCube(woodCol, 2.0, 0.2, 0.2, 2.5, 0.1, 3.0));
    push(getCube(woodCol, 0.2, 0.2, 1.5, -3.0, 0.1, -2.0));

    return createMesh(V, N, C);
}

function genCarMesh() {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    const rustCol = [0.4, 0.2, 0.1];
    const darkMetal = [0.2, 0.2, 0.2];
    const glassCol = [0.1, 0.1, 0.15];

    push(getCube(rustCol, 2.0, 0.8, 4.5, 0, 0.6, 0));
    push(getCube(rustCol, 1.8, 0.7, 2.2, 0, 1.35, -0.2));
    push(getCube(glassCol, 1.9, 0.6, 2.3, 0, 1.35, -0.2));
    push(getCube(darkMetal, 0.4, 0.6, 0.6, -1.0, 0.3, 1.5));
    push(getCube(darkMetal, 0.4, 0.6, 0.6, 1.0, 0.3, 1.5));
    push(getCube(darkMetal, 0.4, 0.6, 0.6, -1.0, 0.3, -1.5));
    push(getCube(darkMetal, 0.4, 0.6, 0.6, 1.0, 0.3, -1.5));

    return createMesh(V, N, C);
}

function genRockMesh() {
    return createMesh(getCube([0.5, 0.5, 0.5], 1.5, 1, 1.5, 0, 0.5, 0).v, getCube([0.5, 0.5, 0.5], 1, 1, 1).n, getCube([0.5, 0.5, 0.5], 1, 1, 1).c);
}

function genCharMesh(color, isHorror = false, isEnraged = false, isFinal = false) {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };

    if (isHorror) {
        // --- BOT KINH DỊ (PALE CREEPER) ---
        const pale = [0.85, 0.85, 0.85];
        const blood = [0.4, 0, 0];
        const brightBlood = [0.7, 0, 0];

        // Thân dài, gầy guộc
        push(getCube(pale, 0.4, 1.2, 0.2, 0, 0.6, 0));

        // Vết máu trên thân (MỚI - Lv1 đã có máu)
        push(getCube(blood, 0.15, 0.4, 0.05, 0.05, 0.6, 0.11)); // Vết máu loang lổ trên ngực
        if (isEnraged || isFinal) {
            push(getCube(blood, 0.25, 0.6, 0.06, -0.05, 0.5, 0.11)); // Thêm vết máu lớn hơn cho Lv2, Lv3
        }

        // Thêm xương sườn nhô ra (kinh dị hơn)
        for (let i = 0; i < 3; i++) {
            const ribCol = isFinal ? blood : pale; // Lv3 xương sườn đẫm máu
            push(getCube(ribCol, 0.45, 0.05, 0.25, 0, 0.8 + i * 0.15, 0.1));
        }

        // Đầu biến dạng to hơn chút
        push(getCube(pale, 0.4, 0.5, 0.4, 0, 1.35, 0));

        // Vết máu trên đầu (MỚI)
        push(getCube(blood, 0.1, 0.2, 0.41, 0.15, 1.45, 0)); // Máu chảy từ đỉnh đầu xuống
        if (isFinal) {
            push(getCube(blood, 0.42, 0.1, 0.42, 0, 1.58, 0)); // Lv3 cả đầu đẫm máu
        }

        // Mắt đỏ rực to phát sáng
        push(getCube([1, 0, 0], 0.15, 0.15, 0.05, -0.15, 1.45, 0.21));
        push(getCube([1, 0, 0], 0.15, 0.15, 0.05, 0.15, 1.45, 0.21));

        // Miệng máu đáng sợ
        push(getCube([0, 0, 0], 0.25, 0.15, 0.05, 0, 1.25, 0.21));
        push(getCube(brightBlood, 0.3, 0.08, 0.05, 0, 1.18, 0.21)); // Máu tươi từ miệng

        if (isEnraged || isFinal) {
            // CUỒNG BẠO: 2 tay giơ thẳng lên trước (Z hướng tới người chơi)
            const armCol = isFinal ? [0.6, 0, 0] : pale;
            push(getCube(armCol, 0.1, 0.1, 1.0, -0.3, 1.1, 0.4));
            push(getCube(armCol, 0.1, 0.1, 1.0, 0.3, 1.1, 0.4));

            // Máu dính trên tay (MỚI)
            push(getCube(blood, 0.12, 0.12, 0.6, -0.3, 1.1, 0.5));
            push(getCube(blood, 0.12, 0.12, 0.6, 0.3, 1.1, 0.5));

            push(getCube(blood, 0.2, 0.8, 0.2, 0, 0.8, 0.1)); // Dính máu trên ngực
            // Móng vuốt chĩa về trước
            push(getCube(brightBlood, 0.05, 0.05, 0.4, -0.3, 1.1, 1.0)); // Móng vuốt đỏ rực dài hơn
            push(getCube(brightBlood, 0.05, 0.05, 0.4, 0.3, 1.1, 1.0));
        } else {
            // THƯỜNG: Tay dài chạm đất
            push(getCube(pale, 0.1, 1.0, 0.1, -0.3, 0.5, 0));
            push(getCube(pale, 0.1, 1.0, 0.1, 0.3, 0.5, 0));

            // Vết máu trên tay thường (MỚI)
            push(getCube(blood, 0.11, 0.5, 0.11, -0.3, 0.3, 0));
            push(getCube(blood, 0.11, 0.5, 0.11, 0.3, 0.3, 0));

            // Móng vuốt chạm đất
            push(getCube(blood, 0.05, 0.4, 0.05, -0.3, -0.2, 0));
            push(getCube(blood, 0.05, 0.4, 0.05, 0.3, -0.2, 0));
        }
    } else {
        // --- NGƯỜI CHƠI (SỐNG SÓT) ---
        push(getCube(color, 0.6, 0.9, 0.3, 0, 0.45, 0));
        const skinColor = [1.0, 0.82, 0.75];
        push(getCube(skinColor, 0.45, 0.45, 0.45, 0, 1.08, 0));
        push(getCube([1, 1, 1], 0.12, 0.12, 0.05, -0.12, 1.15, 0.21));
        push(getCube([1, 1, 1], 0.12, 0.12, 0.05, 0.12, 1.15, 0.21));
        push(getCube([0.1, 0.1, 0.1], 0.06, 0.06, 0.02, -0.12, 1.15, 0.24));
        push(getCube([0.1, 0.1, 0.1], 0.06, 0.06, 0.02, 0.12, 1.15, 0.24));
        push(getCube([0.2, 0.2, 0.2], 0.5, 0.7, 0.4, 0, 0.45, -0.25));
        push(getCube([0.2, 0.2, 0.2], 0.48, 0.1, 0.48, 0, 1.32, 0));
        push(getCube([0.2, 0.2, 0.2], 0.48, 0.05, 0.6, 0, 1.28, 0.1));
    }
    return createMesh(V, N, C);
}

function genCrateMesh(color = [0.7, 0.4, 0.2]) {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    push(getCube(color, 1, 1, 1, 0, 0.5, 0));
    return createMesh(V, N, C);
}


function genPistolMesh() {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    const gray = [0.15, 0.15, 0.15], dark = [0.1, 0.1, 0.1];
    push(getCube(gray, 0.12, 0.2, 0.6, 0, 0, 0)); // Slide
    push(getCube(dark, 0.1, 0.35, 0.2, 0, -0.22, -0.15)); // Grip
    push(getCube(dark, 0.1, 0.05, 0.22, 0, -0.1, 0.05)); // Trigger guard
    push(getCube([0, 1, 0], 0.02, 0.05, 0.02, 0, 0.12, 0.25)); // Front sight (Glow)
    push(getCube(dark, 0.11, 0.08, 0.1, 0, 0, -0.25)); // Hammer
    return createMesh(V, N, C);
}


function genSMGMesh() {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    const gray = [0.2, 0.2, 0.2], dark = [0.08, 0.08, 0.08];
    push(getCube(gray, 0.15, 0.25, 1.0, 0, 0, 0)); // Receiver
    push(getCube(dark, 0.12, 0.6, 0.15, 0, -0.3, 0.1)); // Magazine
    push(getCube(dark, 0.1, 0.35, 0.18, 0, -0.25, -0.3)); // Grip
    push(getCube(gray, 0.08, 0.08, 0.5, 0, 0, 0.6)); // Barrel
    push(getCube(dark, 0.15, 0.3, 0.4, 0, -0.1, -0.6)); // Stock
    push(getCube([1, 0, 0], 0.04, 0.06, 0.04, 0, 0.15, 0.4)); // Red Dot Sight
    return createMesh(V, N, C);
}


function genSniperMesh() {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    const gray = [0.25, 0.25, 0.25], dark = [0.05, 0.05, 0.05];
    push(getCube(gray, 0.18, 0.22, 1.8, 0, 0, -0.2)); // Long Body
    push(getCube(dark, 0.14, 0.25, 0.5, 0, 0.25, 0.2)); // Scope Body
    push(getCube([0, 0.4, 0.8], 0.1, 0.1, 0.05, 0, 0.25, 0.45)); // Lens
    push(getCube(dark, 0.12, 0.4, 0.2, 0, -0.3, -0.6)); // Sniper Stock
    push(getCube(dark, 0.1, 0.5, 0.1, 0, -0.4, 0.3)); // Mag
    push(getCube(gray, 0.08, 0.08, 1.2, 0, 0, 1.2)); // Long Barrel
    push(getCube(dark, 0.05, 0.5, 0.05, 0.1, -0.4, 0.8)); // Bipod L
    push(getCube(dark, 0.05, 0.5, 0.05, -0.1, -0.4, 0.8)); // Bipod R
    return createMesh(V, N, C);
}

// Hàm tạo hình cầu cơ bản cho Boss và các vật thể tròn
function getSphere(color, r, res, ox, oy, oz) {
    let v = [], n = [], c = [];
    for (let i = 0; i <= res; i++) {
        let lat = Math.PI * i / res, sinLat = Math.sin(lat), cosLat = Math.cos(lat);
        for (let j = 0; j <= res; j++) {
            let lon = 2 * Math.PI * j / res, sinLon = Math.sin(lon), cosLon = Math.cos(lon);
            let x = cosLon * sinLat, y = cosLat, z = sinLon * sinLat;
            v.push(ox + x * r, oy + y * r, oz + z * r);
            n.push(x, y, z);
            c.push(...color);
        }
    }
    let V = [], N = [], C = [];
    for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
            let p1 = i * (res + 1) + j, p2 = p1 + res + 1;
            const pushV = (idx) => { V.push(v[idx * 3], v[idx * 3 + 1], v[idx * 3 + 2]); N.push(n[idx * 3], n[idx * 3 + 1], n[idx * 3 + 2]); C.push(...color); };
            pushV(p1); pushV(p2); pushV(p1 + 1);
            pushV(p1 + 1); pushV(p2); pushV(p2 + 1);
        }
    }
    return { v: V, n: N, c: C };
}

// Hàm tạo trăng đỏ giống thật nhưng tối giản để mượt trên Mobile
function genMoonMesh(color, r, res) {
    let V = [], N = [], C = [];
    const darkCol = [color[0] * 0.25, 0, 0]; // Vết thẫm màu máu bầm

    for (let i = 0; i < res; i++) {
        let lat1 = Math.PI * i / res, lat2 = Math.PI * (i + 1) / res;
        for (let j = 0; j < res; j++) {
            let lon1 = 2 * Math.PI * j / res, lon2 = 2 * Math.PI * (j + 1) / res;

            const getPos = (la, lo) => [Math.cos(lo) * Math.sin(la) * r, Math.cos(la) * r, Math.sin(lo) * Math.sin(la) * r];
            let p1 = getPos(lat1, lon1), p2 = getPos(lat1, lon2), p3 = getPos(lat2, lon1), p4 = getPos(lat2, lon2);

            // Tạo vết đen (Maria) diện tích lớn giống trăng thật
            let nx = p1[0] / r, ny = p1[1] / r, nz = p1[2] / r;
            let noise = Math.sin(nx * 2.5) * Math.cos(ny * 2.5) * Math.sin(nz * 2.5);
            let col = (noise > 0.2) ? darkCol : color;

            V.push(...p1, ...p2, ...p3, ...p3, ...p2, ...p4);
            for (let k = 0; k < 6; k++) { N.push(nx, ny, nz); C.push(...col); }
        }
    }
    return createMesh(V, N, C);
}


function genBossBody() {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    const charcoal = [0.03, 0.03, 0.05], crimson = [0.8, 0, 0], bone = [0.85, 0.85, 0.8], blood = [0.5, 0, 0];

    // --- THÂN (Torso) ---
    push(getCube(charcoal, 4.5, 1.5, 2.5, 0, 16, 0));
    push(getCube(charcoal, 1.2, 7, 1.2, 0, 13, 0));
    for (let i = 0; i < 5; i++) {
        const y = 15.5 - i * 1.3;
        push(getCube(charcoal, 3.5 - i * 0.4, 0.4, 2, 0, y, 0));
        push(getCube(blood, 0.3, 0.8, 0.3, 2 - i * 0.2, y - 0.5, 1.2));
    }

    // --- ĐẦU (Head) ---
    const hw = 1.3, hh = 1.6, hd = 1.3;
    push(getCube(bone, hw * 2, hh * 2, hd * 2, 0, 19, 0));
    push(getCube([0, 0, 0], 2.2, 2.5, 0.5, 0, 19.5, 1.1));
    for (let i = 0; i < 3; i++) {
        const ey = 20.2 - i * 0.8;
        push(getCube(crimson, 0.4, 0.4, 0.4, -0.6, ey, 1.4));
        push(getCube(crimson, 0.4, 0.4, 0.4, 0.6, ey, 1.4));
    }
    push(getCube(charcoal, 2.4, 1.2, 2.2, 0, 17.5, 0.3));
    for (let i = 0; i < 8; i++) {
        const tx = (i - 3.5) * 0.3;
        push(getCube([1, 1, 1], 0.1, 0.8, 0.1, tx, 18, 1.3));
        push(getCube([1, 1, 1], 0.1, 0.8, 0.1, tx, 17.5, 1.3));
    }
    push(getCube(blood, 2.6, 0.5, 0.5, 0, 17.8, 1.4));

    // Thêm các quả cầu nhỏ tại 8 góc để "bo tròn" cạnh
    const corners = [-1, 1];
    corners.forEach(cx => corners.forEach(cy => corners.forEach(cz => {
        const s = getSphere(bone, 0.5, 6, cx * hw, 19 + cy * hh, cz * hd);
        push({ v: s.v, n: s.n, c: s.c });
    })));

    // Vệt máu dài từ mắt và miệng
    for (let i = 0; i < 4; i++) {
        push(getCube(blood, 0.15, 3, 0.15, (i - 1.5) * 0.8, 17, 1.3));
    }

    // --- CHÂN (Legs) ---
    const drawLeg = (side) => {
        const x = side * 1.5;
        push(getCube(charcoal, 0.8, 11, 0.8, x, 5.5, 0));
        const j = getSphere(crimson, 0.6, 8, x, 0.5, 0.2);
        push({ v: j.v, n: j.n, c: j.c });
    };
    drawLeg(-0.5); drawLeg(0.5);
    push(getCube([1, 0, 0], 1.8, 1.8, 1.8, 0, 14, 0.6));
    return createMesh(V, N, C);
}

function genBossArm() {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    const charcoal = [0.03, 0.03, 0.05], crimson = [0.8, 0, 0], blood = [0.5, 0, 0];

    const j1 = getSphere(crimson, 0.6, 8, 0, 0, 0); push({ v: j1.v, n: j1.n, c: j1.c }); // Khớp vai
    push(getCube(charcoal, 0.7, 7, 0.7, 0, -3.5, 0.5)); // Bắp tay
    const j2 = getSphere(crimson, 0.6, 8, 0, -6.5, 1); push({ v: j2.v, n: j2.n, c: j2.c }); // Khớp khuỷu
    push(getCube(charcoal, 0.6, 9, 0.6, 0, -10.5, 2.5)); // Cẳng tay
    for (let i = 0; i < 3; i++) push(getCube(blood, 0.2, 3, 0.2, (i - 1) * 0.4, -14.5, 3.5)); // Móng vuốt
    return createMesh(V, N, C);
}




function genBossProjectileMesh() {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    push(getCube([1, 0, 0], 2, 2, 2, 0, 0, 0)); // Large Red Cube
    push(getCube([0.5, 0, 0], 2.5, 2.5, 2.5, 0, 0, 0)); // Outer Glow
    return createMesh(V, N, C);
}





// Hàm tạo vạch lướt bám theo địa hình (Chiêu 1) - Chỉ là đường thẳng
function genTerrainDashMesh(cx, cz, ang, w, l) {
    let V = [], N = [], C = [];
    const resL = 12, resW = 4;
    const stepL = l / resL, stepW = w / resW;
    const cosA = Math.cos(ang), sinA = Math.sin(ang);

    for (let i = 0; i < resL; i++) {
        for (let j = 0; j < resW; j++) {
            const l1 = i * stepL, w1 = (j - resW / 2) * stepW;
            const l2 = l1 + stepL, w2 = w1 + stepW;
            const getPt = (ll, ww) => {
                const rx = ww * cosA + ll * sinA, rz = -ww * sinA + ll * cosA;
                const wx = cx + rx, wz = cz + rz;
                // Hạ thấp offset xuống 0.05 để bám sát mặt đất hơn
                return [wx, getHeight(wx, wz) + 0.05, wz];
            };
            const p11 = getPt(l1, w1), p12 = getPt(l1, w2), p21 = getPt(l2, w1), p22 = getPt(l2, w2);
            V.push(...p11, ...p12, ...p21, ...p21, ...p12, ...p22);
            for (let k = 0; k < 6; k++) { N.push(0, 1, 0); C.push(1, 0, 0); }
        }
    }
    return createMesh(V, N, C);
}

// Hàm tạo vòng tròn bám theo địa hình (Chiêu 3)
function genTerrainFollowMesh(cx, cz, r) {
    let V = [], N = [], C = [];
    const res = 12; // Giảm độ phân giải để tối ưu hiệu năng, tránh crash
    const step = (r * 2) / res;
    for (let i = 0; i < res; i++) {
        for (let j = 0; j < res; j++) {
            const x1 = cx - r + i * step, z1 = cz - r + j * step;
            const x2 = x1 + step, z2 = z1 + step;
            const d1 = Math.sqrt((x1 - cx) ** 2 + (z1 - cz) ** 2);
            if (d1 > r) continue;
            const y11 = getHeight(x1, z1) + 0.05, y21 = getHeight(x2, z1) + 0.05;
            const y12 = getHeight(x1, z2) + 0.05, y22 = getHeight(x2, z2) + 0.05;
            V.push(x1, y11, z1, x1, y12, z2, x2, y11, z1);
            V.push(x2, y11, z1, x1, y12, z2, x2, y22, z2);
            for (let k = 0; k < 6; k++) { N.push(0, 1, 0); C.push(1, 0, 0); } // Đỏ rực
        }
    }
    return createMesh(V, N, C);
}

function genIndicatorMesh() {
    // Tạo một hình vuông dẹt 1x1 làm vạch cảnh báo
    let V = [-0.5, 0, -0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0, 0.5];
    let N = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    let C = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];
    return createMesh(V, N, C);
}

function genDashIndicatorMesh() {
    const w = 4, l = 50;
    // Chỉnh lại oz thành l/2 để hình chữ nhật kéo dài về phía trước (+z) thay vì phía sau (-z)
    let m = getCube([1, 0, 0], w, 0.1, l, 0, 0, l / 2);
    return createMesh(m.v, m.n, m.c);
}



function genArmMesh() {

    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    const skinColor = [1.0, 0.82, 0.75];
    push(getCube(skinColor, 0.18, 0.18, 0.8, 0, 0, 0));
    return createMesh(V, N, C);
}


function genBarrelMesh() {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    push(getCube([0.8, 0.1, 0.1], 0.8, 1.2, 0.8, 0, 0.6, 0));
    push(getCube([0.3, 0.3, 0.3], 0.85, 0.1, 0.85, 0, 1.15, 0));
    return createMesh(V, N, C);
}

function genGrassMesh() {
    let V = [], N = [], C = [];
    const blades = 20, h = 0.5, w = 1, tipScale = 0.15;
    const addPlane = (angle) => {
        const c = Math.cos(angle), s = Math.sin(angle);
        const bx1 = -w * c, bz1 = -w * s, bx2 = w * c, bz2 = w * s;
        const tx1 = -w * tipScale * c, tz1 = -w * tipScale * s, tx2 = w * tipScale * c, tz2 = w * tipScale * s;
        V.push(bx1, 0, bz1, bx2, 0, bz2, tx2, h, tz2, bx1, 0, bz1, tx2, h, tz2, tx1, h, tz1);
        for (let i = 0; i < 6; i++) { N.push(0, 1, 0); C.push(0.12, 0.45 + Math.random() * 0.25, 0.12); }
    };
    for (let i = 0; i < blades; i++) addPlane((i / blades) * Math.PI);
    return createMesh(V, N, C);
}

function genJumpPadMesh() {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };
    push(getCube([0.2, 0.2, 0.2], 1.5, 0.2, 1.5, 0, 0.1, 0));
    push(getCube([0.0, 1.0, 0.0], 1.3, 0.1, 1.3, 0, 0.25, 0));
    return createMesh(V, N, C);
}

function genTerrainFanMesh(x, z, startAng, arc, r) {
    let V = [], N = [], C = [];
    const res = 8; // Số phân đoạn của hình quạt (giảm để tối ưu)
    for (let i = 0; i < res; i++) {
        const a1 = startAng + (i / res) * arc;
        const a2 = startAng + ((i + 1) / res) * arc;
        const p1 = { x: x, z: z };
        const p2 = { x: x + Math.sin(a1) * r, z: z + Math.cos(a1) * r };
        const p3 = { x: x + Math.sin(a2) * r, z: z + Math.cos(a2) * r };
        const y1 = getHeight(p1.x, p1.z) + 0.2, y2 = getHeight(p2.x, p2.z) + 0.2, y3 = getHeight(p3.x, p3.z) + 0.2;
        V.push(p1.x, y1, p1.z, p2.x, y2, p2.z, p3.x, y3, p3.z);
        for (let k = 0; k < 3; k++) { N.push(0, 1, 0); C.push(1, 0, 0); }
    }
    return createMesh(V, N, C);
}

const ASSETS = {};
function initAssets() {
    ASSETS.tree = genTreeMesh(); ASSETS.rock = genRockMesh(); ASSETS.house = genHouseMesh(); ASSETS.car = genCarMesh();
    ASSETS.char = genCharMesh([0.2, 0.2, 0.8], false); // Người chơi
    ASSETS.bot = genCharMesh([0.5, 0.5, 0.5], true, false);  // Bot kinh dị
    ASSETS.botEnraged = genCharMesh([0.5, 0.5, 0.5], true, true);  // Bot cuồng bạo
    ASSETS.botFinal = genCharMesh([0.4, 0, 0], true, true, true);  // Bot máu me (Giai đoạn cuối)
    ASSETS.crate = genCrateMesh([0.7, 0.4, 0.2]);
    ASSETS.lootAmmo = genCrateMesh([0.9, 0.8, 0.1]);
    ASSETS.lootHP = genCrateMesh([0.1, 0.8, 0.1]);
    ASSETS.lootArmor = genCrateMesh([0.1, 0.3, 0.9]);
    ASSETS.lootWeapon = genCrateMesh([0.9, 0.4, 0.1]);
    ASSETS.lootSniper = genCrateMesh([0.6, 0.1, 0.9]);

    ASSETS.ground = genTerrain(); ASSETS.barrel = genBarrelMesh();
    ASSETS.pad = genJumpPadMesh(); ASSETS.grass = genGrassMesh(); ASSETS.water = genWaterMesh();
    ASSETS.sky = genSkyMesh();
    ASSETS.pistol = genPistolMesh(); ASSETS.smg = genSMGMesh(); ASSETS.sniper = genSniperMesh();
    ASSETS.arm = genArmMesh(); ASSETS.bossBody = genBossBody(); ASSETS.bossArm = genBossArm(); ASSETS.bossProj = genBossProjectileMesh(); ASSETS.indicator = genIndicatorMesh();

    ASSETS.bloodMoon = genMoonMesh([1, 0, 0], 1, 24); // Giảm resolution xuống 24 để mượt trên Mobile
    ASSETS.dashInd = genDashIndicatorMesh();
}








function genWaterMesh() {
    let V = [], N = [], C = [];
    const S = MAP_SIZE * 2;
    V.push(-S, -9.5, -S, -S, -9.5, S, S, -9.5, -S, S, -9.5, -S, -S, -9.5, S, S, -9.5, S);
    for (let i = 0; i < 6; i++) { N.push(0, 1, 0); C.push(0, 0.5, 1); }
    return createMesh(V, N, C);
}

function genSkyMesh() {
    const S = 800; const m = getCube([1, 1, 1], S, S, S); return createMesh(m.v, m.n, m.c);
}

const MAP_SIZE = 400, MAP_RES = 64;
function getHeight(x, z) {
    const nx = x * 0.02, nz = z * 0.02;
    let y = Math.sin(nx) * Math.cos(nz) * 8 + Math.sin(nx * 3 + nz) * 2;
    const d = Math.sqrt(x * x + z * z) / (MAP_SIZE / 2);
    y -= d * d * 20; return y < -10 ? -10 : y;
}

function genTerrain() {
    let V = [], N = [], C = [];
    const step = MAP_SIZE / MAP_RES, offset = -MAP_SIZE / 2;
    for (let i = 0; i < MAP_RES; i++) {
        for (let j = 0; j < MAP_RES; j++) {
            const x = offset + i * step, z = offset + j * step, x1 = x + step, z1 = z + step;
            const y00 = getHeight(x, z), y10 = getHeight(x1, z), y01 = getHeight(x, z1), y11 = getHeight(x1, z1);
            // Màu đất bùn, máu khô và đá tối
            const c = y00 < -8 ? [0.15, 0.05, 0.05] : (y00 < 5 ? [0.12, 0.08, 0.08] : [0.08, 0.08, 0.08]);
            V.push(x, y00, z, x, y01, z1, x1, y10, z, x1, y10, z, x, y01, z1, x1, y11, z1);
            for (let k = 0; k < 6; k++) { N.push(0, 1, 0); C.push(...c); }
        }
    }
    return createMesh(V, N, C);
}











document.addEventListener("contextmenu", e => e.preventDefault());



const OIIA_CAT = { spawned: false, active: false };

function startGame() {
    const nameInput = document.getElementById('player-name-input');
    const name = nameInput.value.trim();
    if (!name) {
        alert("VUI LÒNG NHẬP TÊN TRƯỚC KHI BẮT ĐẦU!");
        nameInput.focus();
        return;
    }
    STATE.playerName = name;
    localStorage.setItem('savedPlayerName', name); // Lưu tên vào trình duyệt
    STATE.screen = 'game';
    STATE.player.hp = window.GAME_CONFIG.player.maxHp;
    STATE.player.maxHp = window.GAME_CONFIG.player.maxHp;
    STATE.player.armor = 0;
    STATE.player.maxArmor = window.GAME_CONFIG.player.maxArmor;



    STATE.startTime = Date.now(); STATE.gameEnded = false;
    if (typeof sendLiveNotification === 'function') sendLiveNotification();


    STATE.player.pos = V3.create(0, getHeight(0, 0) + 100, 0); STATE.player.vel = V3.create(0, -1, 0); STATE.player.alive = true; STATE.player.kills = 0; STATE.player.streak = 0; STATE.player.damageFlash = 0;

    STATE.bots = []; STATE.loot = []; STATE.barrels = []; STATE.pads = []; STATE.projectiles = []; STATE.particles = []; STATE.shake = 0; STATE.obstacles = [];
    // Reset game state

    const minimap = document.getElementById('minimap');
    if (minimap) { minimap.width = 200; minimap.height = 200; }

    for (let i = 0; i < STATE.config.botCount; i++) {
        let x, z, y;
        do {
            const angle = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * (MAP_SIZE * 0.45);
            x = Math.cos(angle) * dist;
            z = Math.sin(angle) * dist;
            y = getHeight(x, z);
        } while (y <= -8.5); // Đảm bảo bot không spawn dưới nước

        STATE.bots.push({ pos: V3.create(x, y + 1, z), hp: window.GAME_CONFIG.bot.hpLv1, target: null, state: 'roam', nextMove: 0, fireCD: 0, id: i });
    }
    for (let i = 0; i < (isMobile ? 50 : 300); i++) {
        let x, z, y;
        do {
            x = (Math.random() - 0.5) * MAP_SIZE * 0.9;
            z = (Math.random() - 0.5) * MAP_SIZE * 0.9;
            y = getHeight(x, z);
        } while (y <= -8.5);
        // 0: Đạn, 1: Máu, 2: Giáp, 3: Random Powerup
        STATE.loot.push({ pos: V3.create(x, y + 0.5, z), type: i % 4 });
    }

    for (let i = 0; i < (isMobile ? 5 : 20); i++) {
        let x, z, y;
        do {
            x = (Math.random() - 0.5) * MAP_SIZE * 0.8;
            z = (Math.random() - 0.5) * MAP_SIZE * 0.8;
            y = getHeight(x, z);
        } while (y <= -8.5);
        STATE.barrels.push({ pos: V3.create(x, y, z), hp: 20 });
    }
    for (let i = 0; i < (isMobile ? 10 : 40); i++) {
        let x, z, y;
        do {
            x = (Math.random() - 0.5) * MAP_SIZE * 0.8;
            z = (Math.random() - 0.5) * MAP_SIZE * 0.8;
            y = getHeight(x, z);
        } while (y <= -8.5);
        STATE.pads.push({ pos: V3.create(x, y, z) });
    }

    // Khởi tạo Vật cản (Cây, Nhà, Xe)
    for (let i = 0; i < (isMobile ? 20 : 60); i++) {
        const x = Math.sin(i * 132.1) * MAP_SIZE * 0.4;
        const z = Math.cos(i * 52.3) * MAP_SIZE * 0.4;
        const y = getHeight(x, z);
        if (y > -8.5) STATE.obstacles.push({ type: 'tree', pos: { x, y: y - 0.5, z }, radius: 1.0, scale: 1.5 + Math.sin(i) * 0.5, rot: 0 });
    }
    for (let i = 0; i < (isMobile ? 5 : 12); i++) {
        let x, z, y;
        do {
            x = (Math.random() - 0.5) * MAP_SIZE * 0.8;
            z = (Math.random() - 0.5) * MAP_SIZE * 0.8;
            y = getHeight(x, z);
        } while (y <= -8.5);
        STATE.obstacles.push({ type: 'house', pos: { x, y: y - 1.0, z }, radius: 4.5, rot: Math.random() * Math.PI, scale: 1 });
    }
    for (let i = 0; i < (isMobile ? 8 : 20); i++) {
        let x, z, y;
        do {
            x = (Math.random() - 0.5) * MAP_SIZE * 0.8;
            z = (Math.random() - 0.5) * MAP_SIZE * 0.8;
            y = getHeight(x, z);
        } while (y <= -8.5);
        STATE.obstacles.push({ type: 'car', pos: { x, y: y - 0.5, z }, radius: 2.5, rot: Math.random() * Math.PI, scale: 1 });
    }
    // Đã xóa vòng lặp spawn STATE.powerups để chỉ giữ lại 4 loại hòm cơ bản (STATE.loot)

    document.getElementById('main-menu').classList.add('hidden'); document.getElementById('game-over-screen').classList.add('hidden'); document.getElementById('ui-layer').style.display = 'block';

    // Tự động xoay ngang và full màn hình trên Mobile
    if (isMobile) {
        const docElm = document.documentElement;
        if (docElm.requestFullscreen) docElm.requestFullscreen().catch(e => console.log(e));
        else if (docElm.webkitRequestFullscreen) docElm.webkitRequestFullscreen().catch(e => console.log(e));
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(e => console.log(e));
        }
    }

    if (typeof sendLiveNotification === 'function') sendLiveNotification();
    gl.canvas.requestPointerLock(); requestAnimationFrame(window.loop);

}

function update(dt) {
    if (STATE.screen === 'pause' || STATE.inputLocked) return;
    STATE.shake *= 0.9;
    if (STATE.player.damageFlash > 0) STATE.player.damageFlash -= dt;
    const prevCount = STATE.bots.length;

    const p = STATE.player;
    let speedMult = 1.0, dmgMult = 1.0;
    if (p.powerup) {
        if (p.powerup.type === 0 || p.powerup.type === 3) speedMult = window.GAME_CONFIG.player.powerupSpeedMultiplier;
        if (p.powerup.type === 1 || p.powerup.type === 3) dmgMult = 2.0;
    }
    if (STATE.keys['ShiftLeft']) speedMult *= window.GAME_CONFIG.player.sprintMultiplier;
    // GIẢM TỐC ĐỘ: Đi bộ 8, Chạy nhanh 12 (8 * 1.5)
    const moveSpeed = (p.weaponIdx === 2 ? window.GAME_CONFIG.player.sniperSpeed : window.GAME_CONFIG.player.walkSpeed) * speedMult;
    let move = V3.create(0, 0, 0); if (STATE.keys['KeyW']) move.z -= 1; if (STATE.keys['KeyS']) move.z += 1; if (STATE.keys['KeyA']) move.x -= 1; if (STATE.keys['KeyD']) move.x += 1;
    if (V3.len(move) > 0) move = V3.norm(move);

    // Quán tính (Lerp) di chuyển
    p.currentMove = p.currentMove || V3.create(0, 0, 0);
    p.currentMove.x += (move.x - p.currentMove.x) * 15 * dt;
    p.currentMove.z += (move.z - p.currentMove.z) * 15 * dt;

    if (Math.abs(p.currentMove.x) > 0.001 || Math.abs(p.currentMove.z) > 0.001) {
        const yaw = STATE.camera.rot.y, forward = V3.create(Math.sin(yaw), 0, -Math.cos(yaw)), right = V3.create(Math.cos(yaw), 0, Math.sin(yaw));
        let finalMove = V3.add(V3.mul(forward, -p.currentMove.z), V3.mul(right, p.currentMove.x));
        p.pos.x += finalMove.x * moveSpeed * dt; p.pos.z += finalMove.z * moveSpeed * dt;

        // Xử lý va chạm với vật cản
        for (let obs of STATE.obstacles) {
            // Cho phép nhảy lên nóc xe/nhà nếu nhân vật ở trên cao
            if ((obs.type === 'car' && p.pos.y > obs.pos.y + 1.2) ||
                (obs.type === 'house' && p.pos.y > obs.pos.y + 3.0)) continue;

            let dx = p.pos.x - obs.pos.x;
            let dz = p.pos.z - obs.pos.z;
            let distSq = dx * dx + dz * dz;
            let rSq = obs.radius * obs.radius;
            if (distSq < rSq) {
                let dist = Math.sqrt(distSq);
                if (dist === 0) { dx = 1; dist = 1; }
                let pushAmt = obs.radius - dist;
                p.pos.x += (dx / dist) * pushAmt;
                p.pos.z += (dz / dist) * pushAmt;
            }
        }

        // Sửa lỗi Bức tường tàng hình (Giới hạn ranh giới bản đồ)
        p.pos.x = Math.max(-200, Math.min(200, p.pos.x));
        p.pos.z = Math.max(-200, Math.min(200, p.pos.z));
    }
    p.vel.y -= 25 * dt; p.pos.y += p.vel.y * dt;
    let floorH = getHeight(p.pos.x, p.pos.z);
    for (let obs of STATE.obstacles) {
        let dx = p.pos.x - obs.pos.x;
        let dz = p.pos.z - obs.pos.z;
        // Chỉ tính là mặt sàn nếu nhân vật đã thực sự nhảy vượt qua độ cao của trần nhà/xe trừ đi một khoảng sai số nhỏ
        if (dx * dx + dz * dz <= obs.radius * obs.radius) {
            if (obs.type === 'car' && p.pos.y >= obs.pos.y + 1.0) floorH = Math.max(floorH, obs.pos.y + 1.7); // Nóc xe
            if (obs.type === 'house' && p.pos.y >= obs.pos.y + 3.0) floorH = Math.max(floorH, obs.pos.y + 4.5); // Nóc nhà
        }
    }
    let onPad = false; for (let pad of STATE.pads) if (V3.dist(p.pos, pad.pos) < 3 && Math.abs(p.pos.y - pad.pos.y) < 2) { p.vel.y = 30; p.grounded = false; onPad = true; playAudio('jump'); break; }
    if (!onPad && p.pos.y < floorH) { p.pos.y = floorH; p.vel.y = 0; p.grounded = true; } else if (!onPad) p.grounded = false;
    if (STATE.keys['Space'] && p.grounded) { p.vel.y = window.GAME_CONFIG.player.jumpPower; p.grounded = false; }
    const now = performance.now(), weapon = STATE.weapons[p.weaponIdx];
    if (STATE.mouse.down && now - STATE.lastShot > weapon.rate && weapon.ammo > 0) { fireWeapon(p, STATE.camera.rot, weapon, true); weapon.ammo--; STATE.lastShot = now; p.recoil = 0.1; }
    p.recoil *= 0.8; if (STATE.keys['Digit1']) p.weaponIdx = 0; if (STATE.keys['Digit2']) p.weaponIdx = 1; if (STATE.keys['Digit3']) p.weaponIdx = 2;
    // Nạp đạn dùng maxAmmo theo loại súng (Pistol:12, SMG:30, Sniper:5)
    if (STATE.keys['KeyR'] && weapon.ammo < weapon.maxAmmo) { let needed = weapon.maxAmmo - weapon.ammo; if (weapon.res >= needed) { weapon.res -= needed; weapon.ammo = weapon.maxAmmo; } else { weapon.ammo += weapon.res; weapon.res = 0; } }
    STATE.projectiles.forEach((proj, i) => {
        // Ưu tiên dùng tốc độ tùy chỉnh (proj.speed), nếu không mới dùng mặc định
        const speed = proj.speed || (proj.isBoss ? 40 : window.GAME_CONFIG.misc.playerProjectileSpeed);
        const step = V3.mul(proj.dir, speed * dt), nextPos = V3.add(proj.pos, step);

        STATE.barrels.forEach(b => { if (b.hp > 0 && V3.dist(nextPos, V3.add(b.pos, V3.create(0, 0.6, 0))) < 2.5) { b.hp -= proj.dmg; playAudio('hit'); showHitMarker(); spawnParticles(nextPos, 5, [1, 0.5, 0]); proj.dead = true; if (b.hp <= 0) createExplosion(b.pos); } });

        if (proj.isPlayer) {
            // Hitbox quái thường (bot) - Nhắm vào tâm thân mình (y + 0.65)
            STATE.bots.forEach(bot => { if (!bot.isEvolvingLv3 && V3.dist(nextPos, V3.add(bot.pos, V3.create(0, 0.65, 0))) < (isMobile ? 2.5 : 1.0)) { bot.hp -= proj.dmg; playAudio('hit'); showHitMarker(); spawnParticles(nextPos, 5, [1, 0, 0]); proj.dead = true; } });

            // Hitbox Boss hình trụ
            if (STATE.boss && STATE.boss.active) {
                const dx = nextPos.x - STATE.boss.pos.x, dz = nextPos.z - STATE.boss.pos.z, dy = nextPos.y - STATE.boss.pos.y;
                if (Math.sqrt(dx * dx + dz * dz) < 4 && dy > -5 && dy < 15) {
                    STATE.boss.hp -= proj.dmg; playAudio('hit'); showHitMarker(); proj.dead = true;
                }
            }
        }
        else {
            // Đạn địch trúng người chơi (hitbox người chơi < 1.5)
            if (V3.dist(nextPos, V3.add(p.pos, V3.create(0, 1, 0))) < 1.5) {
                takeDamage(p, proj.dmg);
                proj.dead = true;
            }
        }
        proj.pos = nextPos; proj.life -= dt; if (proj.life < 0) proj.dead = true;
    });
    STATE.projectiles = STATE.projectiles.filter(p => !p.dead);
    STATE.bots.forEach((bot, i) => {
        if (bot.hp <= 0) return; bot.fireCD -= dt; const dist = V3.dist(bot.pos, p.pos);

        // --- VA CHẠM GIỮA CÁC BOT (Tránh dính chùm) ---
        for (let j = i + 1; j < STATE.bots.length; j++) {
            const b2 = STATE.bots[j];
            if (b2.hp <= 0) continue;
            const dx = bot.pos.x - b2.pos.x, dz = bot.pos.z - b2.pos.z;
            const dSq = dx * dx + dz * dz;
            if (dSq < 5) { // Khoảng cách va chạm ~2.2m
                const d = Math.sqrt(dSq) || 0.1, push = (2.2 - d) * 0.5;
                bot.pos.x += (dx / d) * push; bot.pos.z += (dz / d) * push;
                b2.pos.x -= (dx / d) * push; b2.pos.z -= (dz / d) * push;
            }
        }

        // --- 3 GIAI ĐOẠN TIẾN HÓA CỦA BOT ---
        const botCount = STATE.bots.length;
        const initialCount = STATE.config.botCount || 25;
        const isEnragedLv2 = botCount <= initialCount * 0.4; // Cuồng bạo 40%
        const isEnragedLv3 = botCount <= 3; // 3 con cuối cùng (Giai đoạn cuối)

        // [MỚI] Tăng máu khi tiến hóa
        if (isEnragedLv2 && !bot.hasEvolvedLv2) {
            bot.hasEvolvedLv2 = true;
            bot.hp += (window.GAME_CONFIG.bot.hpLv2 - window.GAME_CONFIG.bot.hpLv1);
        }
        if (isEnragedLv3 && !bot.hasEvolvedLv3) {
            bot.hasEvolvedLv3 = true;
            // Nếu đã là Lv2 thì tăng thêm (Lv3 - Lv2), nếu chưa kịp là Lv2 (nhảy vọt) thì tăng (Lv3 - Lv1)
            const currentBaseHp = bot.hasEvolvedLv2 ? window.GAME_CONFIG.bot.hpLv2 : window.GAME_CONFIG.bot.hpLv1;
            bot.hp += (window.GAME_CONFIG.bot.hpLv3 - currentBaseHp);

            bot.isEvolvingLv3 = true;
            bot.evolveTimer = window.GAME_CONFIG.bot.evolveTime;
            playAudio('hit');
        }

        bot.isHorror = isEnragedLv2 || isEnragedLv3;
        bot.isFinal = isEnragedLv3; // Cờ cho Lv3

        if (bot.isEvolvingLv3) {
            bot.evolveTimer -= dt;
            if (Math.random() < 0.4) {
                spawnParticles(V3.add(bot.pos, V3.create((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2)), 2, [1.0, 0.2, 0.2]);
                spawnParticles(V3.add(bot.pos, V3.create((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2)), 1, [1.0, 0.8, 0.0]);
            }
            if (bot.evolveTimer <= 0) {
                bot.isEvolvingLv3 = false;
                spawnParticles(bot.pos, 50, [1.0, 0.0, 0.0]); // Nổ hiệu ứng
                STATE.shake = 3.0; // Rung màn hình
                playAudio('shoot');
            }
        } else if (isEnragedLv2 || isEnragedLv3 || dist < window.GAME_CONFIG.bot.detectRadius) {
            const dir = V3.norm(V3.sub(p.pos, bot.pos));
            // TỐC ĐỘ: Tinh chỉnh theo từng cấp độ
            const speed = isEnragedLv3 ? window.GAME_CONFIG.bot.speedLv3 : (isEnragedLv2 ? window.GAME_CONFIG.bot.speedLv2 : window.GAME_CONFIG.bot.speedLv1);
            const dist2D = Math.sqrt(Math.pow(p.pos.x - bot.pos.x, 2) + Math.pow(p.pos.z - bot.pos.z, 2));
            if (dist2D > 1.5) {
                bot.pos.x += dir.x * speed * dt;
                bot.pos.z += dir.z * speed * dt;
            }
            if (dist2D < window.GAME_CONFIG.bot.attackRange && Math.abs(p.pos.y - bot.pos.y) < 3.0 && bot.fireCD <= 0) {
                // Sát thương: Lv1=10, Lv2=30, Lv3=60
                let damage = window.GAME_CONFIG.bot.baseDamage;
                if (isEnragedLv3) damage = window.GAME_CONFIG.bot.enragedDamageLv3;
                else if (isEnragedLv2) damage = window.GAME_CONFIG.bot.enragedDamageLv2;

                takeDamage(p, damage);
                playAudio('hit');
                bot.fireCD = window.GAME_CONFIG.bot.attackCD;
            }

            // AI Nhảy: Nếu bị kẹt ở xe/nhà nhưng người chơi ở trên cao
            if (dist2D < 3.5 && p.pos.y > bot.pos.y + 1.5 && bot.grounded) {
                bot.velY = 16;
                bot.grounded = false;
            }
        }
        else { bot.nextMove -= dt; if (bot.nextMove <= 0) { bot.targetDir = V3.create(Math.random() - 0.5, 0, Math.random() - 0.5); bot.nextMove = 2 + Math.random() * 3; } if (bot.targetDir) { bot.pos.x += bot.targetDir.x * 3 * dt; bot.pos.z += bot.targetDir.z * 3 * dt; } }

        // [YÊU CẦU] Giới hạn bot không ra khỏi đảo (Bán kính 190m)
        const dFromCenterSq = bot.pos.x * bot.pos.x + bot.pos.z * bot.pos.z;
        if (dFromCenterSq > 190 * 190) {
            const dFromCenter = Math.sqrt(dFromCenterSq);
            const push = (dFromCenter - 190) / dFromCenter;
            bot.pos.x -= bot.pos.x * push;
            bot.pos.z -= bot.pos.z * push;
            bot.targetDir = null; // Đổi hướng khi đụng biên đảo
        }

        // Vật lý và Va chạm cho Bot
        for (let obs of STATE.obstacles) {
            if ((obs.type === 'car' && bot.pos.y > obs.pos.y + 1.2) ||
                (obs.type === 'house' && bot.pos.y > obs.pos.y + 3.0)) continue;
            let dx = bot.pos.x - obs.pos.x;
            let dz = bot.pos.z - obs.pos.z;
            let distSq = dx * dx + dz * dz;
            let rSq = obs.radius * obs.radius;
            if (distSq < rSq) {
                let dist = Math.sqrt(distSq);
                if (dist === 0) { dx = 1; dist = 1; }
                let pushAmt = obs.radius - dist;
                bot.pos.x += (dx / dist) * pushAmt;
                bot.pos.z += (dz / dist) * pushAmt;
            }
        }

        bot.velY = bot.velY || 0;
        bot.velY -= 25 * dt;
        bot.pos.y += bot.velY * dt;

        let bFloor = getHeight(bot.pos.x, bot.pos.z);
        for (let obs of STATE.obstacles) {
            let dx = bot.pos.x - obs.pos.x;
            let dz = bot.pos.z - obs.pos.z;
            // Tương tự, chỉ tính nóc xe/nhà là mặt sàn nếu bot đã thực sự bật nhảy vượt qua chiều cao đó
            if (dx * dx + dz * dz <= obs.radius * obs.radius) {
                if (obs.type === 'car' && bot.pos.y >= obs.pos.y + 1.0) bFloor = Math.max(bFloor, obs.pos.y + 1.7);
                if (obs.type === 'house' && bot.pos.y >= obs.pos.y + 3.0) bFloor = Math.max(bFloor, obs.pos.y + 4.5);
            }
        }

        if (bot.pos.y < bFloor) {
            bot.pos.y = bFloor;
            bot.velY = 0;
            bot.grounded = true;
        } else {
            bot.grounded = false;
        }
    });
    STATE.bots = STATE.bots.filter(b => b.hp > 0);
    // Tự động kích hoạt Boss CHỈ khi diệt sạch bot
    if (prevCount > 0 && STATE.bots.length === 0 && !STATE.bossTriggered) {
        triggerBossEvent();
    }
    STATE.barrels = STATE.barrels.filter(b => b.hp > 0);

    if (STATE.bots.length < prevCount) {
        const killsMade = prevCount - STATE.bots.length; p.kills += killsMade; const n = performance.now(); if (n - p.lastKillTime < 5000) p.streak += killsMade; else p.streak = killsMade; p.lastKillTime = n;
        const sm = document.getElementById('streak-msg'); if (p.streak > 1) { sm.innerText = p.streak === 2 ? "DOUBLE KILL!" : (p.streak === 3 ? "TRIPLE KILL!" : "RAMPAGE!"); sm.style.transform = "translate(-50%, -50%) scale(1.5)"; setTimeout(() => sm.style.transform = "translate(-50%, -50%) scale(0)", 1500); }
        const feed = document.getElementById('kill-feed'); feed.innerHTML += `<div>Enemy eliminated</div>`; setTimeout(() => feed.removeChild(feed.firstChild), 3000);
        spawnParticles(p.pos, 20, [Math.random(), Math.random(), Math.random()]);
    }
    let closeLoot = null; STATE.loot.forEach(l => { if (V3.dist(p.pos, l.pos) < 2) closeLoot = l; });
    const msg = document.getElementById('interaction-msg');
    msg.style.display = 'none'; // Ẩn thông báo bấm E vì giờ nhặt tự động

    // Cập nhật hạt (Particles)
    STATE.particles.forEach(p => {
        p.pos.x += p.vel.x * dt; p.pos.y += p.vel.y * dt; p.pos.z += p.vel.z * dt;
        p.vel.y -= 20 * dt; // Trọng lực cho hạt
        p.life -= dt;
    });
    STATE.particles = STATE.particles.filter(p => p.life > 0);

    if (closeLoot) {
        let pickedName = "";
        if (closeLoot.type === 0) { STATE.weapons[p.weaponIdx].res += 30; pickedName = "NHẬN ĐẠN"; }
        else if (closeLoot.type === 1) {
            p.hp = Math.min(p.maxHp, p.hp + 200);
            p.damageFlash = 0; // [YÊU CẦU] Ăn máu thì hết đỏ ngay
            pickedName = "HỒI MÁU";
        }
        else if (closeLoot.type === 2) { p.armor = Math.min(p.maxArmor, p.armor + 150); pickedName = "NHẬN GIÁP"; }
        else if (closeLoot.type === 3) {
            const puType = Math.random() < 0.5 ? 0 : 1;
            p.powerup = { type: puType, time: 10 };
            pickedName = puType === 0 ? "TĂNG TỐC!" : "X2 SÁT THƯƠNG!";
        }
        const pMsg = document.getElementById('pickup-msg'); pMsg.innerText = pickedName; pMsg.style.opacity = 1; setTimeout(() => pMsg.style.opacity = 0, 2000);

        // Hồi lại hòm sau 20s
        const respawnPos = { ...closeLoot.pos }, respawnType = closeLoot.type;
        setTimeout(() => {
            STATE.loot.push({ pos: respawnPos, type: respawnType });
        }, 20000);

        STATE.loot = STATE.loot.filter(l => l !== closeLoot);
        playAudio('pickup');
    }

    // Đã xóa vòng lặp nhặt STATE.powerups

    if (p.powerup && p.powerup.time > 0) p.powerup.time -= dt; else if (p.powerup) p.powerup.type = null;
    if (p.streak >= 3) document.getElementById('damage-overlay').style.boxShadow = `inset 0 0 100px rgba(255, 204, 0, 0.2)`;

    // Boss AI Logic
    if (STATE.boss && STATE.boss.active) {

        const b = STATE.boss;
        const dist = V3.dist(b.pos, p.pos);
        b.skillCD -= dt;

        // --- HỒI PHỤC ANIMATION (Smoothing back to idle) ---
        if (b.state === 'fight' || b.state === 'idle') {
            b.armLift += (0 - b.armLift) * 5 * dt;
            b.bodyY += (0 - b.bodyY) * 5 * dt;
            b.bodyRot += (0 - b.bodyRot) * 5 * dt;
        }

        if (b.state === 'fight') {
            if (b.skillCD <= 0) {
                // --- DANH SÁCH CHIÊU THỨC --- 
                if (!b.skillSequence) {
                    let availableSkills = [
                        'chiêu 3', // Nhảy dậm (Slam)
                        'chiêu 1', // Lướt (Dash)
                        'chiêu 2', // Đại bác (Triple Shot)
                        'chiêu 4', // Cột máu (Crimson Pillars)
                        'chiêu 5', // Dịch chuyển (Teleport Strike)
                    ];
                    for (let i = availableSkills.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [availableSkills[i], availableSkills[j]] = [availableSkills[j], availableSkills[i]];
                    }
                    b.skillSequence = availableSkills;
                }
                const skill = b.skillSequence[b.skillIndex % b.skillSequence.length];
                b.skillIndex++;

                if (skill === 'chiêu 5') {
                    // [CHỈNH SỬA CHIÊU 5] Thời gian Boss "chìm" xuống (rặn chiêu)
                    b.state = 'teleport_start'; b.skillCD = window.GAME_CONFIG.boss.skill5.prepareTime;
                } else if (skill === 'chiêu 4') {
                    // [CHỈNH SỬA CHIÊU 4] Thời gian Boss gồng tay (hiện vòng cảnh báo)
                    b.state = 'pillar_prepare'; b.skillCD = window.GAME_CONFIG.boss.skill4.prepareTime; b.pillarSpots = [];
                    b.shotCount = 0;
                } else if (skill === 'chiêu 3') {
                    // [CHỈNH SỬA CHIÊU 3] Thời gian Boss rặn trước khi nhảy
                    b.state = 'jump_start'; b.skillCD = window.GAME_CONFIG.boss.skill3.prepareTime;
                    const tx = p.pos.x, tz = p.pos.z;
                    b.targetPos = V3.create(tx, getHeight(tx, tz), tz);
                    if (b.indicatorMesh) deleteMesh(b.indicatorMesh);
                    // Đồng bộ bán kính 30 với tầm sát thương
                    b.indicatorMeshParams = { x: b.targetPos.x, z: b.targetPos.z, r: window.GAME_CONFIG.boss.skill3.range };
                    b.indicatorMesh = genTerrainFollowMesh(b.indicatorMeshParams.x, b.indicatorMeshParams.z, b.indicatorMeshParams.r);
                } else if (skill === 'chiêu 1') {
                    // [CHỈNH SỬA CHIÊU 1] Thời gian rặn trước khi lướt
                    b.state = 'dash_prepare'; b.skillCD = window.GAME_CONFIG.boss.skill1.prepareTime;
                    b.targetDir = V3.norm(V3.sub(p.pos, b.pos));
                    b.targetAng = Math.atan2(b.targetDir.x, b.targetDir.z);
                    if (b.dashMesh) deleteMesh(b.dashMesh);
                    // Rộng hơn (8) và Dài hơn (150)
                    b.dashMeshParams = { x: b.pos.x, z: b.pos.z, ang: b.targetAng, w: window.GAME_CONFIG.boss.skill1.width, l: 150 };
                    b.dashMesh = genTerrainDashMesh(b.dashMeshParams.x, b.dashMeshParams.z, b.dashMeshParams.ang, b.dashMeshParams.w, b.dashMeshParams.l);
                } else if (skill === 'chiêu 2') {
                    // [CHỈNH SỬA CHIÊU 2] Thời gian rặn trước khi bắn
                    b.state = 'shoot_prepare'; b.skillCD = window.GAME_CONFIG.boss.skill2.prepareTime;
                }
            } else {
                const isRage = b.hp < b.maxHp * 0.4;
                const speed = isRage ? 15 : window.GAME_CONFIG.bot.speedLv1; // Sử dụng tốc độ cấp 1 cho Boss lúc thường

                const dir = V3.norm(V3.sub(p.pos, b.pos));
                b.pos.x += dir.x * speed * dt; b.pos.z += dir.z * speed * dt;
                b.pos.y = getHeight(b.pos.x, b.pos.z);

                // Animation đi bộ mượt mà (Sway body & arms)
                const walkCycle = Math.sin(performance.now() * 0.006) * 0.15;
                b.bodyRot += (walkCycle - b.bodyRot) * 0.1;
                b.armLift += (walkCycle * 2 - b.armLift) * 0.1;

                if (isRage && Math.random() < 0.2) spawnParticles(b.pos, 2, [1, 0, 0]);
            }
            // Xoay mặt mượt mà về phía người chơi
            const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z;
            b.targetAng = Math.atan2(dx, dz);
            let diff = b.targetAng - b.rotY;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            b.rotY += diff * 0.1;

        } else if (b.state === 'jump_start') {
            b.bodyRot += (0.4 - b.bodyRot) * 0.1; // Cúi người lấy đà hơi hơi thôi
            b.armLift += (1.4 - b.armLift) * 0.1; // Vung 2 tay ra sau lấy đà (POSITIVE là ra sau)
            if (b.skillCD <= 0) {
                const gravity = window.GAME_CONFIG.boss.skill3.gravity;
                b.state = 'jumping';
                const v0y = window.GAME_CONFIG.boss.skill3.jumpPower;
                b.vel.y = v0y;
                const dy = b.pos.y - b.targetPos.y;
                const airTime = (v0y + Math.sqrt(v0y * v0y + 2 * gravity * dy)) / gravity;
                b.vel.x = (b.targetPos.x - b.pos.x) / airTime;
                b.vel.z = (b.targetPos.z - b.pos.z) / airTime;
                b.armLift = -1.2; // Nhảy lên giơ 2 tay ra phía trước (NEGATIVE là ra trước)
                b.bodyRot = 0.2; // Bay người thẳng, hơi đổ tới xíu
            }
        } else if (b.state === 'jumping') {
            b.armLift = -1.2;
            b.bodyRot = 0.2;
            b.vel.y -= window.GAME_CONFIG.boss.skill3.gravity * dt; b.pos.x += b.vel.x * dt; b.pos.z += b.vel.z * dt; b.pos.y += b.vel.y * dt;
            if (b.pos.y <= getHeight(b.pos.x, b.pos.z)) {
                b.pos.y = getHeight(b.pos.x, b.pos.z);
                b.state = 'recover'; b.skillCD = 0.5;
                b.bodyRot = 0.6; b.armLift = -0.2; // Chạm đất tay chống đất phía trước (-0.2), người hơi cúi (0.6)
                const dmgDist = window.GAME_CONFIG.boss.skill3.range;
                const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z;
                if (Math.sqrt(dx * dx + dz * dz) < dmgDist) {
                    takeDamage(p, window.GAME_CONFIG.boss.skill3.damage);
                    STATE.shake = 5.0;
                }
                spawnParticles(b.pos, isMobile ? 30 : 300, [1, 0, 0], 2.5);
                STATE.shake = 10.0;
            }
        } else if (b.state === 'recover') {
            b.bodyRot += (0.6 - b.bodyRot) * 0.2;
            b.armLift += (-0.2 - b.armLift) * 0.2;
            if (b.skillCD <= 0) {
                b.state = 'fight';
                b.skillCD = 1.0;
            }
        } else if (b.state === 'dash_prepare') {
            const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z;
            b.targetAng = Math.atan2(dx, dz);
            b.bodyRot = 0;
            // Boss rung nhanh 2 bên trước khi lướt
            b.pos.x += (Math.random() - 0.5) * 1.5;
            b.pos.z += (Math.random() - 0.5) * 1.5;
            if (b.skillCD <= 0) {
                b.state = 'dashing'; b.skillCD = 0.8;
                playAudio('shoot');
            }
        } else if (b.state === 'dashing') {
            const speed = window.GAME_CONFIG.boss.skill1.speed;
            b.pos.x += b.targetDir.x * speed * dt;
            b.pos.z += b.targetDir.z * speed * dt;
            b.pos.y = getHeight(b.pos.x, b.pos.z);
            if (!b.hasHit) {
                const dist = V3.dist(b.pos, p.pos);
                if (dist < window.GAME_CONFIG.boss.skill1.width) {
                    takeDamage(p, window.GAME_CONFIG.boss.skill1.damage);
                    b.hasHit = true;
                }
            }
            if (b.skillCD <= 0) {
                b.state = 'fight'; b.skillCD = window.GAME_CONFIG.boss.postSkillRest;
                if (b.dashMesh) { deleteMesh(b.dashMesh); b.dashMesh = null; }
            }
        } else if (b.state === 'pillar_prepare') {
            b.armLift += (2.5 - b.armLift) * 0.1;
            if (b.pillarSpots.length < window.GAME_CONFIG.boss.skill4.count) {
                let ok = false, tx, tz;
                for (let attempt = 0; attempt < 50; attempt++) {
                    const ang = Math.random() * Math.PI * 2;
                    const d = Math.random() * 70;
                    tx = p.pos.x + Math.sin(ang) * d;
                    tz = p.pos.z + Math.cos(ang) * d;
                    let tooClose = false;
                    for (let s of b.pillarSpots) if (Math.sqrt((tx - s.x) ** 2 + (tz - s.z) ** 2) < 18) tooClose = true;
                    if (!tooClose) { ok = true; break; }
                }
                if (ok) {
                    const mesh = genTerrainFollowMesh(tx, tz, window.GAME_CONFIG.boss.skill4.pillarRange);
                    // Dùng timer nhỏ ngẫu nhiên để các cột máu trồi lên liên tiếp thay vì cùng lúc
                    b.pillarSpots.push({ x: tx, z: tz, h: getHeight(tx, tz), active: false, hasHit: false, timer: Math.random() * 0.5, mesh: mesh });
                }
            }
            if (b.skillCD <= 0) {
                b.state = 'pillar_active';
                // Sử dụng pillarTimer làm thời gian tồn tại của cột máu
                b.skillCD = window.GAME_CONFIG.boss.skill4.pillarTimer;
                b.armLift = 0;
                b.bodyRot = 0.5;
            }
        } else if (b.state === 'pillar_active') {
            b.bodyRot += (0 - b.bodyRot) * 0.1;
            b.pillarSpots.forEach(s => {
                if (!s.active) {
                    s.timer -= dt;
                    if (s.timer <= 0) {
                        s.active = true;
                        spawnParticles({ x: s.x, y: s.h, z: s.z }, 50, [1, 0, 0], 1.5);
                        STATE.shake = 1.5;
                    }
                }
                if (s.active && !s.hasHit) {
                    const d = Math.sqrt((p.pos.x - s.x) ** 2 + (p.pos.z - s.z) ** 2);
                    if (d < window.GAME_CONFIG.boss.skill4.pillarRange) {
                        takeDamage(p, window.GAME_CONFIG.boss.skill4.damage);
                        s.hasHit = true;
                    }
                }
            });
            if (b.skillCD <= 0) {
                b.state = 'fight'; b.skillCD = window.GAME_CONFIG.boss.postSkillRest;
                b.pillarSpots.forEach(s => { if (s.mesh) deleteMesh(s.mesh); });
                b.pillarSpots = [];
            }
        } else if (b.state === 'teleport_start') {
            b.bodyY -= 15 * dt;
            b.armLift += (0 - b.armLift) * 0.1; // Chìm xuống đứng yên không giơ tay làm gì
            if (b.skillCD > 1.0) {
                b.targetPos = V3.create(p.pos.x, 0, p.pos.z);
                b.targetPos.y = getHeight(b.targetPos.x, b.targetPos.z);

                b.indicatorUpdateTimer = (b.indicatorUpdateTimer || 0) - dt;
                if (b.indicatorUpdateTimer <= 0) {
                    if (b.indicatorMesh) deleteMesh(b.indicatorMesh);
                    b.indicatorMeshParams = { x: b.targetPos.x, z: b.targetPos.z, r: 25 };
                    b.indicatorMesh = genTerrainFollowMesh(b.indicatorMeshParams.x, b.indicatorMeshParams.z, b.indicatorMeshParams.r);
                    b.indicatorUpdateTimer = 0.1;
                }
            }
            if (b.skillCD <= 0) {
                // [YÊU CẦU] Dịch chuyển và quay mặt về phía người chơi
                b.state = 'teleport_strike'; b.skillCD = 3.0;
                if (b.targetPos) {
                    b.pos.x = b.targetPos.x; b.pos.z = b.targetPos.z; b.pos.y = b.targetPos.y;
                    // Quay mặt về phía người chơi ngay khi trồi lên
                    const toP = V3.norm(V3.sub(p.pos, b.pos));
                    b.rotY = Math.atan2(toP.x, toP.z);
                }
                b.bodyY = -25; b.bodyRot = 0; b.hasHit = false; // Chìm sâu hơn (-25)
                if (b.fanMesh) deleteMesh(b.fanMesh);
                const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z;
                b.fanMeshParams = { x: b.pos.x, z: b.pos.z, ang: Math.atan2(dx, dz) - 1.2, arc: 2.4, r: 25 };
                b.fanMesh = genTerrainFanMesh(b.fanMeshParams.x, b.fanMeshParams.z, b.fanMeshParams.ang, b.fanMeshParams.arc, b.fanMeshParams.r);
            }
        } else if (b.state === 'teleport_strike') {
            // --- THỜI GIAN CHIÊU 5 (Đếm ngược từ 3.0 về 0) ---

            // 1. THỜI GIAN TRỒI LÊN: Khi skillCD giảm từ 3.0 xuống 2.5 (mất 0.5 giây)
            if (b.skillCD > 2.5) {
                b.bodyY += 40 * dt; if (b.bodyY > 0) b.bodyY = 0;
                b.armLift += (-1.8 - b.armLift) * 0.1; // Tay giơ cao chuẩn bị đập

                // 2. THỜI GIAN GỒNG CHỜ: Khi skillCD từ 2.5 xuống 1.0 (rặn trong 1.5 giây)
            } else if (b.skillCD > 1.0) {
                b.armLift = -1.8;

                // 3. VUNG TAY ĐẬP XUỐNG: Khi skillCD < 1.0
            } else {
                b.armLift += (-0.2 - b.armLift) * 0.4; // Tay phải đập thẳng xuống chạm đất phía trước
                b.bodyRot += (0.6 - b.bodyRot) * 0.2; // Hơi cúi người thôi

                const toP = V3.norm(V3.sub(p.pos, b.pos));
                const bYaw = Math.atan2(toP.x, toP.z);
                const handX = b.pos.x + Math.sin(bYaw) * 15;
                const handZ = b.pos.z + Math.cos(bYaw) * 15;

                if (Math.random() < 0.7) {
                    spawnParticles({ x: handX, y: b.pos.y + 10, z: handZ }, 5, [1, 0, 0], 1.5);
                }

                // 4. THỜI ĐIỂM GÂY SÁT THƯƠNG: Khoảng 0.15s sau khi bắt đầu đập (1.0 - 0.15 = 0.85)
                if (b.skillCD < 0.85 && !b.hasHit) {
                    // Hiệu ứng đất gãy, vỡ vụn tại vị trí tay đập
                    spawnParticles({ x: handX, y: getHeight(handX, handZ), z: handZ }, 100, [0.8, 0.4, 0.1], 3.0); // Bụi đất cam
                    spawnParticles({ x: handX, y: getHeight(handX, handZ), z: handZ }, 150, [0.2, 0.2, 0.2], 2.0); // Đá vỡ vụn xám
                    spawnParticles({ x: handX, y: getHeight(handX, handZ), z: handZ }, 50, [2.0, 0, 0], 1.5); // Tia đỏ xé toạc
                    STATE.shake = 15; // Rung màn hình cực mạnh

                    const d = V3.dist(b.pos, p.pos);
                    const pAng = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
                    let diff = Math.abs(pAng - bYaw);
                    if (diff > Math.PI) diff = 2 * Math.PI - diff;

                    // Kiểm tra hướng và tầm đánh (Hình quạt 30m, góc 1.2 rad)
                    if (d < 30 && diff < 1.2) {
                        takeDamage(p, window.GAME_CONFIG.boss.skill5.damage);
                        spawnParticles(p.pos, 50, [1, 0, 0], 2.0);
                        playAudio('hit');
                    }
                    b.hasHit = true;
                }
            }
            if (b.skillCD <= 0) {
                b.state = 'fight';
                // [QUAN TRỌNG] Thời gian Boss nghỉ (3s) sau cú đập Jump/Teleport
                b.skillCD = 3;
                if (b.indicatorMesh) gl.deleteVertexArray(b.indicatorMesh.vao); b.indicatorMesh = null;
                if (b.fanMesh) gl.deleteVertexArray(b.fanMesh.vao); b.fanMesh = null;
            }

        } else if (b.state === 'shoot_prepare') {
            b.pos.x += (Math.random() - 0.5) * 0.4; b.pos.z += (Math.random() - 0.5) * 0.4;
            // HIỆU ỨNG: Tia laser nhắm bắn
            const targetPoint = V3.add(p.pos, { x: 0, y: 1.5, z: 0 });
            // Tính toạ độ ngực chính xác (giống mChest trong draw: y=16, z=3)
            const spawnPoint = V3.create(b.pos.x + Math.sin(b.rotY) * 3, b.pos.y + (b.bodyY || 0) + 16, b.pos.z + Math.cos(b.rotY) * 3);
            const dir = V3.norm(V3.sub(targetPoint, spawnPoint));
            const ang = Math.atan2(dir.x, dir.z);
            if (b.dashMesh) gl.deleteVertexArray(b.dashMesh.vao);
            // Dùng mesh của chiêu 1 nhưng cực mảnh (0.2) để làm tia laser
            b.dashMesh = genTerrainDashMesh(spawnPoint.x, spawnPoint.z, ang, 0.4, 200);

            if (b.skillCD <= 0) {
                b.state = 'shooting'; b.skillCD = 0.15; b.shotCount = 15; // Bắn nhanh hơn (0.15s) và nhiều hơn (8 viên)
            }
        } else if (b.state === 'shooting') {
            b.bodyY = Math.sin(Date.now() * 0.1) * 0.3; // Giật lùi nhẹ khi bắn
            if (b.skillCD <= 0) {
                const targetPoint = V3.add(p.pos, { x: 0, y: 1.5, z: 0 });
                const spawnPoint = V3.create(b.pos.x + Math.sin(b.rotY) * 3, b.pos.y + (b.bodyY || 0) + 16, b.pos.z + Math.cos(b.rotY) * 3);
                const dir = V3.norm(V3.sub(targetPoint, spawnPoint));
                // [CHỈNH SỬA CHIÊU 2] Sát thương mỗi viên đạn (Bác vừa chỉnh xuống 200)
                STATE.projectiles.push({ pos: spawnPoint, dir: dir, dmg: window.GAME_CONFIG.boss.skill2.damage, speed: window.GAME_CONFIG.boss.skill2.speed, life: 3, isPlayer: false, dead: false, isBoss: true });

                // HIỆU ỨNG: Té lửa tại đầu nòng
                spawnParticles(spawnPoint, 15, [1, 0.5, 0]);
                playAudio('shoot');
                b.shotCount--;
                b.skillCD = 0.1;
                if (b.shotCount <= 0) {
                    b.state = 'fight';
                    // [QUAN TRỌNG] Thời gian Boss nghỉ (3s) sau khi bắn hết đạn
                    b.skillCD = window.GAME_CONFIG.boss.postSkillRest;
                }
            }
        }






        if (b.state === 'fight' && dist < 10) takeDamage(p, window.GAME_CONFIG.boss.passiveDamage * dt);

        if (b.hp <= 0 && !b.dead) {
            b.dead = true;
            b.active = false;
            // DỌN DẸP MESH KHI BOSS CHẾT
            if (b.indicatorMesh) { deleteMesh(b.indicatorMesh); b.indicatorMesh = null; }
            if (b.dashMesh) { deleteMesh(b.dashMesh); b.dashMesh = null; }
            if (b.fanMesh) { deleteMesh(b.fanMesh); b.fanMesh = null; }
            if (b.pillarSpots) {
                b.pillarSpots.forEach(s => { if (s.mesh) deleteMesh(s.mesh); });
                b.pillarSpots = [];
            }
            document.getElementById('boss-hp-container').style.display = 'none';
            spawnOiiaCat(); playBossSound(); showClickAnywhere(10000);
        }
        if (b.active) {
            const bossHpContainer = document.getElementById('boss-hp-container');
            if (bossHpContainer) bossHpContainer.style.display = 'block';
            document.getElementById('boss-hp-fill').style.width = (b.hp / b.maxHp) * 100 + '%';
        }
    }

    // Xóa vòng lặp đạn bị thừa




    if (STATE.player.hp <= 0) endGame(false);


}

function createExplosion(pos) { STATE.shake = 0.5; playAudio('shoot'); spawnParticles(pos, 30, [1, 0.5, 0]); const range = window.GAME_CONFIG.misc.barrelExplosionRange; if (V3.dist(pos, STATE.player.pos) < range) takeDamage(STATE.player, window.GAME_CONFIG.misc.barrelExplosionDamage); STATE.bots.forEach(b => { if (!b.isEvolvingLv3 && V3.dist(pos, b.pos) < range) b.hp -= window.GAME_CONFIG.misc.barrelExplosionDamage; }); }

function fireWeapon(shooter, rot, weapon, isPlayer, dirOverride) {
    let dir; if (isPlayer) { const yaw = rot.y, pitch = rot.x; dir = V3.create(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); } else dir = V3.norm(dirOverride);
    const spread = (isPlayer && isMobile) ? 0 : weapon.spread; // Không tản đạn trên mobile
    dir.x += (Math.random() - 0.5) * spread; dir.y += (Math.random() - 0.5) * spread; dir.z += (Math.random() - 0.5) * spread; dir = V3.norm(dir);
    STATE.projectiles.push({ pos: V3.add(shooter.pos, V3.create(0, 0.5, 0)), dir: dir, dmg: weapon.damage * (shooter.powerup && shooter.powerup.type === 1 ? 2 : 1), life: 2.0, isPlayer: isPlayer, dead: false });
    playAudio('shoot');
}

function takeDamage(p, amt) {
    // FIX CRASH: Kiểm tra p.powerup tồn tại trước khi truy cập type
    if (STATE.gameEnded || (p.powerup && p.powerup.time > 0 && p.powerup.type === 2)) amt *= 0.2;
    if (STATE.gameEnded) return;
    if (p.armor > 0) {
        const armDmg = amt * 0.7;
        p.armor -= armDmg;
        p.hp -= amt * 0.3;
        if (p.armor < 0) { p.hp += p.armor; p.armor = 0; }
    } else p.hp -= amt;

    if (!isMobile) STATE.shake = Math.min(1.5, STATE.shake + amt * 0.08);
    playAudio('hit');

    p.damageFlash = 1.0; // [YÊU CẦU] Nháy đỏ trong 1 giây

    // Hiệu ứng Horror khi trúng đòn
    document.body.classList.add('taking-damage');
    setTimeout(() => document.body.classList.remove('taking-damage'), 100);

    const overlay = document.getElementById('damage-overlay');
    if (overlay) {
        overlay.style.opacity = Math.max(0.4, 1.2 - p.hp / 1000);
        overlay.style.background = `radial-gradient(circle, transparent 15%, rgba(${120 + Math.random() * 135}, 0, 0, 0.7) 100%)`;
    }
}

function showHitMarker() { const el = document.getElementById('hit-marker'); el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 100); }
function spawnParticles(pos, count, color, speedMult = 1.0) {
    // Giới hạn particles trên mobile để giữ FPS
    if (isMobile) count = Math.min(count, 8);
    for (let i = 0; i < count; i++) {
        STATE.particles.push({
            pos: { x: pos.x, y: pos.y, z: pos.z },
            vel: {
                x: (Math.random() - 0.5) * 15 * speedMult,
                y: Math.random() * 20 * speedMult,
                z: (Math.random() - 0.5) * 15 * speedMult
            },
            color: color,
            life: (1.0 + Math.random()) * (speedMult > 1 ? 1.5 : 1.0)
        });
    }
}
function endGame(win) {
    if (STATE.gameEnded) return;
    STATE.gameEnded = true;

    // STATE.gameEnded = true; (đã có ở trên)
    STATE.screen = 'end'; document.exitPointerLock(); document.getElementById('ui-layer').style.display = 'none';
    const duration = Math.floor((Date.now() - STATE.startTime) / 1000);
    STATE.finalStats = { win, kills: STATE.player.kills, duration, date: new Date().toLocaleString('vi-VN') };

    const gameOver = document.getElementById('game-over-screen'), playAgainBtn = document.getElementById('play-again-btn');
    gameOver.classList.remove('hidden');
    if (win) {
        document.getElementById('end-title').innerText = "VICTORY";
        document.getElementById('end-title').style.color = "#ffd700";
    } else {
        document.getElementById('end-title').innerText = "THUA RỒI AK CỐ LÊN!!";
        document.getElementById('end-title').style.color = "#ff0000";
    }
    if (playAgainBtn) playAgainBtn.style.display = 'inline-block';
    document.getElementById('end-stats').innerText = `Kills: ${STATE.player.kills} | Thời gian: ${duration}s`;
}




document.addEventListener('DOMContentLoaded', () => {
    // Logic Cài đặt HUD

    const btnSettings = document.getElementById('btn-settings');
    const modalSettings = document.getElementById('settings-modal');
    const btnSaveHud = document.getElementById('btn-save-hud');
    const btnResetHud = document.getElementById('btn-reset-hud');
    const mobileBtns = [
        'btn-shoot', 'btn-aim', 'btn-jump', 'btn-reload', 'btn-sprint',
        'mobile-weapons', 'health-bar-container', 'armor-bar-container',
        'ammo-display', 'stats-display', 'loot-legend'
    ];
    let draggedBtn = null;

    const savedHUD = JSON.parse(localStorage.getItem('hudSettings'));
    if (savedHUD) {
        mobileBtns.forEach(id => {
            const btn = document.getElementById(id);
            if (btn && savedHUD[id]) {
                Object.assign(btn.style, savedHUD[id]);
                if (savedHUD[id].scale) btn.style.setProperty('--btn-scale', savedHUD[id].scale);
            }
        });
    }

    let activeEditBtn = null;
    const slider = document.getElementById('hud-scale-slider');
    const scaleVal = document.getElementById('hud-scale-val');

    function selectEditBtn(btn) {
        if (activeEditBtn) activeEditBtn.classList.remove('selected-edit-btn');
        activeEditBtn = btn;
        if (btn) {
            btn.classList.add('selected-edit-btn');
            const currentScale = btn.style.getPropertyValue('--btn-scale') || '1.0';
            if (slider) {
                slider.value = currentScale;
                scaleVal.innerText = Math.round(currentScale * 100) + '%';
            }
        }
    }

    if (slider) {
        slider.addEventListener('input', (e) => {
            if (!activeEditBtn) return;
            const scale = e.target.value;
            scaleVal.innerText = Math.round(scale * 100) + '%';
            activeEditBtn.style.setProperty('--btn-scale', scale);
        });
    }

    window.aimSensitivity = parseFloat(localStorage.getItem('aimSensitivity')) || 1.0;
    const sensSlider = document.getElementById('sensitivity-slider');
    const sensVal = document.getElementById('sensitivity-val');
    if (sensSlider) {
        sensSlider.value = window.aimSensitivity;
        sensVal.innerText = window.aimSensitivity.toFixed(1);
        sensSlider.addEventListener('input', (e) => {
            window.aimSensitivity = parseFloat(e.target.value);
            sensVal.innerText = window.aimSensitivity.toFixed(1);
            localStorage.setItem('aimSensitivity', window.aimSensitivity);
        });
    }

    let preEditHUD = {};
    if (btnSettings) {
        const handleSettingsOpen = (e) => {
            e.preventDefault();
            window.isEditingHUD = true;
            if (STATE.screen === 'game') STATE.screen = 'pause'; // Tạm dừng
            modalSettings.classList.remove('hidden');
            preEditHUD = {};
            mobileBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    preEditHUD[id] = {
                        top: btn.style.top, left: btn.style.left,
                        bottom: btn.style.bottom, right: btn.style.right,
                        position: btn.style.position,
                        scale: btn.style.getPropertyValue('--btn-scale') || '1.0'
                    };
                    btn.classList.add('editing-btn');
                    btn.style.pointerEvents = 'auto'; // Cho phép touch khi edit
                }
            });
            // Tự động chọn nút Bắn mặc định
            const btnShoot = document.getElementById('btn-shoot');
            if (btnShoot) selectEditBtn(btnShoot);
        };
        btnSettings.addEventListener('click', handleSettingsOpen);
        btnSettings.addEventListener('touchstart', handleSettingsOpen);
    }

    const btnCancelHud = document.getElementById('btn-cancel-hud');
    if (btnCancelHud) {
        btnCancelHud.addEventListener('click', () => {
            window.isEditingHUD = false;
            if (STATE.screen === 'pause') STATE.screen = 'game'; // Tiếp tục
            modalSettings.classList.add('hidden');
            if (activeEditBtn) activeEditBtn.classList.remove('selected-edit-btn');
            activeEditBtn = null;

            mobileBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn && preEditHUD[id]) {
                    btn.classList.remove('editing-btn');
                    if (!['btn-shoot', 'btn-aim', 'btn-jump', 'btn-reload', 'btn-sprint', 'mobile-weapons'].includes(id)) {
                        btn.style.pointerEvents = ''; // Trả về mặc định
                    }
                    btn.style.top = preEditHUD[id].top;
                    btn.style.left = preEditHUD[id].left;
                    btn.style.bottom = preEditHUD[id].bottom;
                    btn.style.right = preEditHUD[id].right;
                    btn.style.position = preEditHUD[id].position;
                    btn.style.setProperty('--btn-scale', preEditHUD[id].scale);
                }
            });
        });
    }

    if (btnSaveHud) {
        btnSaveHud.addEventListener('click', () => {
            window.isEditingHUD = false;
            if (STATE.screen === 'pause') STATE.screen = 'game'; // Tiếp tục
            modalSettings.classList.add('hidden');
            if (activeEditBtn) activeEditBtn.classList.remove('selected-edit-btn');
            activeEditBtn = null;
            let newHUD = {};
            mobileBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.classList.remove('editing-btn');
                    if (!['btn-shoot', 'btn-aim', 'btn-jump', 'btn-reload', 'btn-sprint', 'mobile-weapons'].includes(id)) {
                        btn.style.pointerEvents = ''; // Trả về mặc định
                    }
                    newHUD[id] = {
                        top: btn.style.top, left: btn.style.left,
                        bottom: btn.style.bottom, right: btn.style.right,
                        position: 'fixed',
                        scale: btn.style.getPropertyValue('--btn-scale') || '1.0'
                    };
                }
            });
            localStorage.setItem('hudSettings', JSON.stringify(newHUD));
        });
    }

    if (btnResetHud) {
        btnResetHud.addEventListener('click', () => {
            mobileBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.style.top = ''; btn.style.left = ''; btn.style.bottom = ''; btn.style.right = '';
                    btn.style.position = ''; btn.style.transform = '';
                    btn.style.removeProperty('--btn-scale');
                }
            });
            localStorage.removeItem('hudSettings');
            if (activeEditBtn) {
                if (slider) { slider.value = 1.0; scaleVal.innerText = '100%'; }
            }
        });
    }

    document.addEventListener('touchstart', (e) => {
        if (!window.isEditingHUD) return;
        let targetId = null;
        for (let id of mobileBtns) {
            if (e.target.closest('#' + id)) {
                targetId = id;
                break;
            }
        }
        if (targetId) {
            draggedBtn = document.getElementById(targetId);
            selectEditBtn(draggedBtn);
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (!window.isEditingHUD || !draggedBtn) return;
        e.preventDefault();
        const t = e.changedTouches[0];
        draggedBtn.style.position = 'fixed';
        draggedBtn.style.bottom = 'auto'; draggedBtn.style.right = 'auto';
        draggedBtn.style.left = (t.clientX - draggedBtn.offsetWidth / 2) + 'px';
        draggedBtn.style.top = (t.clientY - draggedBtn.offsetHeight / 2) + 'px';
        draggedBtn.style.transform = 'scale(var(--btn-scale, 1.0))'; // Bỏ các transform khác khi drag
    }, { passive: false });

    document.addEventListener('touchend', () => { draggedBtn = null; });
});








// showClickToContinue() đã thay bằng showClickAnywhere() — đã xóa




// Giảm grass trên mobile để giảm draw call
const GRASS_PATCHES = []; for (let i = 0; i < (isMobile ? 30 : 200); i++) { const x = Math.sin(i * 12.989) * MAP_SIZE * 0.45, z = Math.cos(i * 78.233) * MAP_SIZE * 0.45, y = getHeight(x, z), scale = 0.6 + Math.random() * 0.6; GRASS_PATCHES.push({ x, y, z, scale }); }

function draw() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const p = STATE.player;
    if (!p || !p.pos) return;

    // CHUYỂN ĐỔI KHÔNG KHÍ: Chiều tà (Bot) vs Kinh dị (Boss)
    let fogCol = [0.6, 0.3, 0.2]; // Trả lại màu cam chiều tà mặc định (u ám)
    let bgCol = [0.7, 0.4, 0.3];  // Trả lại bầu trời buổi chiều cũ

    if (STATE.boss && STATE.boss.active) {
        const dist = V3.dist(p.pos, STATE.boss.pos);
        const intensity = Math.max(0, 1 - dist / 50);
        // Bầu trời máu nhấp nháy u ám (Hell Vibe)
        const skyPulse = 0.05 + Math.sin(Date.now() * 0.0015) * 0.04;
        fogCol = [0.6 + intensity * 0.3, 0.2, 0.2]; // Tăng mạnh độ sáng sương mù
        bgCol = [0.4 + skyPulse, 0.1, 0.1];         // Tăng mạnh độ sáng bầu trời
        // CSS filter: Trả lại độ tối u ám cũ
        if (!isMobile) document.body.style.filter = intensity > 0.4 ? `contrast(${140 + intensity * 60}%) brightness(${0.7 - intensity * 0.25})` : 'brightness(0.7) contrast(1.2)';
        if (!isMobile && intensity > 0.6) STATE.shake += intensity * 0.2;
    } else {
        // GIAI ĐOẠN CHIỀU TÀ (Trả lại độ tối u ám)
        fogCol = [0.6, 0.3, 0.2];
        bgCol = [0.7, 0.4, 0.3];
        if (!isMobile) document.body.style.filter = 'brightness(0.7) contrast(1.2)';
    }

    gl.clearColor(bgCol[0], bgCol[1], bgCol[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK); gl.frontFace(gl.CCW); gl.useProgram(prog);

    // Xử lý Aim Lerp (Mượt mà)
    STATE.aimLerp += ((STATE.isAiming ? 1 : 0) - STATE.aimLerp) * 0.2;

    const aspect = gl.canvas.width / gl.canvas.height;
    const zoomFactor = [0.3, 0.6, 0.95][p.weaponIdx];
    const fov = 1.2 - (STATE.aimLerp * zoomFactor);

    const proj = M4.perspective(fov, aspect, 0.1, 1000);
    const yaw = STATE.camera.rot.y, pitch = STATE.camera.rot.x;

    // Giật cam chỉ trên PC (mobile tắt để mượt hơn)
    const shakeAmt = isMobile ? 0 : STATE.shake;
    const eye = V3.create(p.pos.x + (Math.random() - 0.5) * shakeAmt, p.pos.y + 1.1 + (Math.random() - 0.5) * shakeAmt, p.pos.z);
    const forward = V3.create(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)), center = V3.add(eye, forward), view = M4.lookAt(eye, center, V3.create(0, 1, 0));

    gl.uniformMatrix4fv(locs.proj, false, proj);
    gl.uniformMatrix4fv(locs.view, false, view);
    gl.uniform3f(locs.camPos, eye.x, eye.y, eye.z);
    gl.uniform3f(locs.sunDir, 0.5, 0.8, 0.3);
    gl.uniform3f(locs.fogColor, fogCol[0], fogCol[1], fogCol[2]);
    gl.uniform3f(locs.emitColor, 0, 0, 0); // Reset emissive color
    gl.uniform1f(locs.time, performance.now() / 1000);

    const drawMeshActual = (mesh, pos, scale = 1, rotY = 0) => {
        let m = M4.translation(pos.x, pos.y, pos.z);
        m = M4.multiply(m, M4.rotationY(rotY));
        m = M4.multiply(m, M4.scaling(scale, scale, scale));
        gl.uniformMatrix4fv(locs.model, false, m);
        gl.bindVertexArray(mesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    };
    const drawMeshRaw = (mesh, matrix) => {
        gl.uniformMatrix4fv(locs.model, false, matrix);
        gl.bindVertexArray(mesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    };

    gl.disable(gl.DEPTH_TEST);
    gl.uniform1i(locs.isSky, true);
    gl.uniform1i(locs.isWater, false);
    gl.uniform1i(locs.instanced, false);
    drawMeshActual(ASSETS.sky, eye, 1, 0);

    // Trăng máu: khán giả bỏ hào quang BLEND tốn GPU, chỉ vẽ mặt trăng tĩnh
    if (STATE.boss && STATE.boss.active) {
        gl.uniform1i(locs.isSky, false);
        const moonPos = { x: eye.x + 200, y: eye.y + 180, z: eye.z - 400 };
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        const pulse = 0.9 + Math.sin(Date.now() * 0.001) * 0.1;
        gl.uniform3f(locs.fogColor, 0.4 * pulse, 0, 0);
        drawMeshActual(ASSETS.bloodMoon, moonPos, 100, 0);
        gl.disable(gl.BLEND);
        gl.uniform3f(locs.fogColor, 2.0, 0, 0);
        drawMeshActual(ASSETS.bloodMoon, moonPos, 80, 0);
        gl.uniform3f(locs.fogColor, fogCol[0], fogCol[1], fogCol[2]);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.uniform1i(locs.isSky, false);

    gl.uniformMatrix4fv(locs.model, false, M4.identity()); gl.bindVertexArray(ASSETS.ground.vao); gl.drawArrays(gl.TRIANGLES, 0, ASSETS.ground.count);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1i(locs.isWater, true); gl.uniformMatrix4fv(locs.model, false, M4.identity()); gl.bindVertexArray(ASSETS.water.vao); gl.drawArrays(gl.TRIANGLES, 0, ASSETS.water.count); gl.uniform1i(locs.isWater, false); gl.disable(gl.BLEND);
    const drawShadow = (pos, size) => { let h = getHeight(pos.x, pos.z) + 0.05, m = M4.translation(pos.x, h, pos.z); m = M4.multiply(m, M4.scaling(size, 0.01, size)); gl.uniformMatrix4fv(locs.model, false, m); gl.bindVertexArray(ASSETS.crate.vao); gl.drawArrays(gl.TRIANGLES, 0, ASSETS.crate.count); };
    if (!isMobile) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform3f(locs.fogColor, 0, 0, 0);
        STATE.bots.forEach(b => drawShadow(b.pos, 1.5)); drawShadow(p.pos, 1.5);
        gl.uniform3f(locs.fogColor, fogCol[0], fogCol[1], fogCol[2]);
        gl.disable(gl.BLEND);
    }
    STATE.bots.forEach(b => {
        const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, ang = Math.atan2(dx, dz);

        const botCount = STATE.bots.length;
        const initialCount = STATE.config.botCount || 25;
        const isLv2 = botCount <= initialCount * 0.4;
        const isLv3 = botCount <= 3;

        let mesh = ASSETS.bot;
        let scale = 1.0;
        let drawPos = { ...b.pos };

        if (b.isEvolvingLv3) {
            const pulse = (Math.sin(performance.now() * 0.05) > 0) ? 2.0 : 0.0;
            gl.uniform3f(locs.fogColor, pulse, pulse * 0.5, pulse * 0.5);
            drawPos.x += (Math.random() - 0.5) * 0.4;
            drawPos.z += (Math.random() - 0.5) * 0.4;
            scale = 1.0 + (2.0 - Math.max(0, b.evolveTimer)) * 0.5;
            mesh = ASSETS.botEnraged;
        } else if (isLv3) {
            // [GIAI ĐOẠN 3] To gấp đôi và máu me
            mesh = ASSETS.botFinal;
            scale = 2.0;
        } else if (isLv2) {
            // [GIAI ĐOẠN 2] Hóa kinh dị
            mesh = ASSETS.botEnraged;
            scale = 1.0;
        }

        drawMeshActual(mesh, drawPos, scale, ang);
        if (b.isEvolvingLv3) gl.uniform3f(locs.fogColor, fogCol[0], fogCol[1], fogCol[2]);
    });
    STATE.barrels.forEach(b => drawMeshActual(ASSETS.barrel, b.pos, 3, 0));
    // Grass:
    if (GRASS_PATCHES.length > 0) { gl.disable(gl.CULL_FACE); GRASS_PATCHES.forEach(g => drawMeshActual(ASSETS.grass, { x: g.x, y: g.y, z: g.z }, g.scale, 0)); gl.enable(gl.CULL_FACE); }
    STATE.pads.forEach(p => drawMeshActual(ASSETS.pad, p.pos, 2, 0));

    // Vẽ vật cản (Cây, Nhà, Xe)
    STATE.obstacles.forEach(obs => {
        if (obs.type === 'tree') drawMeshActual(ASSETS.tree, obs.pos, obs.scale, 0);
        else if (obs.type === 'house') drawMeshActual(ASSETS.house, obs.pos, obs.scale, obs.rot);
        else if (obs.type === 'car') drawMeshActual(ASSETS.car, obs.pos, obs.scale, obs.rot);
    });

    STATE.loot.forEach(l => {
        let mesh = ASSETS.lootAmmo; // Default Yellow
        if (l.type === 1) mesh = ASSETS.lootHP; // Green
        else if (l.type === 2) mesh = ASSETS.lootArmor; // Blue
        else if (l.type === 3) mesh = ASSETS.lootWeapon; // Orange (Powerup)
        drawMeshActual(mesh, { x: l.pos.x, y: l.pos.y + Math.sin(performance.now() / 200) * 0.2, z: l.pos.z }, 0.5, performance.now() / 1000);
    });

    // Effects & Boss Indicators
    STATE.projectiles.forEach(p => {
        if (p.isBoss) drawMeshActual(ASSETS.bossProj, p.pos, 1, 0);
        else drawMeshActual(ASSETS.crate, p.pos, 0.1, 0);
    });
    STATE.particles.forEach(p => {
        gl.uniform3f(locs.fogColor, p.color[0], p.color[1], p.color[2]);
        drawMeshActual(ASSETS.crate, p.pos, 0.2 * p.life, 0);
    });
    gl.uniform3f(locs.fogColor, fogCol[0], fogCol[1], fogCol[2]);

    // Boss Rendering
    if (STATE.boss && STATE.boss.active) {
        const b = STATE.boss;
        const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z;
        const ang = Math.atan2(dx, dz);

        // Boss Body (Static for spectators)
        let mBody = M4.translation(b.pos.x, b.pos.y + b.bodyY, b.pos.z);
        mBody = M4.multiply(mBody, M4.rotationY(b.rotY || ang));
        mBody = M4.multiply(mBody, M4.rotationX(b.bodyRot));
        gl.uniformMatrix4fv(locs.model, false, mBody);
        gl.bindVertexArray(ASSETS.bossBody.vao);
        gl.drawArrays(gl.TRIANGLES, 0, ASSETS.bossBody.count);

        // Hiệu ứng tụ năng lượng ở ngực (Chiêu 2)
        if (b.state === 'shoot_prepare' || b.state === 'shooting') {
            const pulse = 0.8 + Math.sin(performance.now() * 0.02) * 0.2;
            gl.uniform3f(locs.emitColor, 1.5, 0.6, 0); // Cam rực (Emissive)
            let mChest = M4.multiply(mBody, M4.translation(0, 16, 3));
            mChest = M4.multiply(mChest, M4.scaling(3 * pulse, 3 * pulse, 3 * pulse));
            drawMeshRaw(ASSETS.crate, mChest);
            gl.uniform3f(locs.emitColor, 0, 0, 0);
        }

        // Boss Arms - HIỆU ỨNG TAY TÙY BIẾN CHO CẢ 5 SKILL
        const drawArm = (side) => {
            let armScale = 1.0;
            let armColor = null;
            let lift = b.armLift || 0;
            let forward = 0;

            // Skill 2: SHOOT (Bắn) - Hai tay đưa về phía trước nhắm bắn
            if (b.state === 'shoot_prepare' || b.state === 'shooting') {
                lift = Math.PI * 0.45;
                forward = 1.5;
            }
            // Skill 3: JUMP (Nhảy dậm) - Cả 3 giai đoạn tay đều to và đỏ
            else if (b.state === 'jump_start' || b.state === 'jumping' || b.state === 'recover') {
                armScale = 2.0; armColor = [1.5, 0, 0];
            }
            // Skill 4: PILLAR (Cột máu) - Hai tay hóa đỏ, giơ thẳng lên trời
            else if (b.state === 'pillar_prepare') {
                armColor = [1.5, 0, 0];
                lift = -Math.PI * 0.7; // Giơ tay lên trời vừa phải
            }
            // Skill 5: TELEPORT STRIKE (Chìm/Trồi đập) - Tay phải đập cực mạnh
            else if (b.state === 'teleport_strike') {
                if (side === 1) { // Tay phải
                    armColor = [2.0, 0, 0];
                    armScale = b.skillCD > 1.0 ? 1.3 : 1.8;
                    lift = b.armLift; // Sử dụng giá trị b.armLift từ AI (mượt mà)
                } else { // Tay trái hạ xuống tự nhiên
                    lift = 0.5; // Hơi đưa ra sau lưng
                }
            } else if (b.state === 'teleport_start') {
                lift = b.armLift; // Cả hai tay giơ lên khi chìm xuống
            }

            // Gắn chặt tay vào vai (Kế thừa vị trí và góc nghiêng của thân)
            let mArm = M4.translation(b.pos.x, b.pos.y + b.bodyY, b.pos.z);
            mArm = M4.multiply(mArm, M4.rotationY(b.rotY || ang));
            mArm = M4.multiply(mArm, M4.rotationX(b.bodyRot)); // Thân gập, vai gập theo
            mArm = M4.multiply(mArm, M4.translation(side * 3.5, 16, forward)); // Gắn chết vào khớp vai (có hỗ trợ vươn tay forward)
            mArm = M4.multiply(mArm, M4.rotationX(lift)); // Cử động cánh tay từ khớp vai
            mArm = M4.multiply(mArm, M4.scaling(armScale, armScale, armScale)); // Phóng to cánh tay từ khớp

            if (armColor) gl.uniform3f(locs.emitColor, armColor[0], armColor[1], armColor[2]);
            gl.uniformMatrix4fv(locs.model, false, mArm);
            gl.bindVertexArray(ASSETS.bossArm.vao); gl.drawArrays(gl.TRIANGLES, 0, ASSETS.bossArm.count);
            if (armColor) gl.uniform3f(locs.emitColor, 0, 0, 0);
        };
        drawArm(-1); drawArm(1);

        // Ground Indicators - ONLY FOR PLAYER
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
        gl.uniform3f(locs.fogColor, 0.6 + Math.sin(Date.now() * 0.015) * 0.4, 0, 0);

        if (b.indicatorMesh) {
            gl.uniformMatrix4fv(locs.model, false, M4.identity());
            gl.bindVertexArray(b.indicatorMesh.vao);
            gl.drawArrays(gl.TRIANGLES, 0, b.indicatorMesh.count);
        }
        if (b.fanMesh && b.state === 'teleport_strike' && b.skillCD > 0.8) {
            gl.uniformMatrix4fv(locs.model, false, M4.identity());
            gl.bindVertexArray(b.fanMesh.vao);
            gl.drawArrays(gl.TRIANGLES, 0, b.fanMesh.count);
        }
        if (b.dashMesh && (b.state === 'dash_prepare' || b.state === 'dashing' || b.state === 'shoot_prepare')) {
            gl.uniformMatrix4fv(locs.model, false, M4.identity());
            gl.bindVertexArray(b.dashMesh.vao);
            gl.drawArrays(gl.TRIANGLES, 0, b.dashMesh.count);
        }
        b.pillarSpots.forEach(s => {
            if (!s.active && s.mesh) {
                gl.uniformMatrix4fv(locs.model, false, M4.identity());
                gl.bindVertexArray(s.mesh.vao);
                gl.drawArrays(gl.TRIANGLES, 0, s.mesh.count);
            } else if (s.active) {
                gl.uniform3f(locs.fogColor, 1, 0, 0);
                const mMat = M4.multiply(M4.translation(s.x, s.h - 1, s.z), M4.scaling(4, 25, 4));
                gl.uniformMatrix4fv(locs.model, false, mMat);
                gl.bindVertexArray(ASSETS.crate.vao); gl.drawArrays(gl.TRIANGLES, 0, ASSETS.crate.count);
            }
        });
        gl.depthMask(true); gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.disable(gl.BLEND);


        // RESET TRẠNG THÁI RENDER
        gl.uniform3f(locs.fogColor, fogCol[0], fogCol[1], fogCol[2]);
    }






    // Draw View Model (Arms + Current Weapon)
    if (STATE.screen === 'game') {
        gl.clear(gl.DEPTH_BUFFER_BIT);
        const weaponMesh = [ASSETS.pistol, ASSETS.smg, ASSETS.sniper][p.weaponIdx];
        const bob = Math.sin(performance.now() * 0.01) * 0.015 * (1 - STATE.aimLerp * 0.8); // Giảm rung khi ngắm
        const kick = p.recoil * 0.4;
        const vmProj = M4.perspective(fov, aspect, 0.01, 10);
        gl.uniformMatrix4fv(locs.proj, false, vmProj);
        gl.uniformMatrix4fv(locs.view, false, M4.identity());

        // Free Fire style scope for ALL weapons
        const isFFScope = STATE.aimLerp > 0.9;

        const scopeEl = document.getElementById('scope-overlay');

        if (isFFScope) {
            scopeEl.style.display = 'block';
            scopeEl.style.opacity = (STATE.aimLerp - 0.9) * 10;
        } else {
            scopeEl.style.display = 'none';
        }

        if (!isFFScope) {
            // Right Arm
            let armX = 0.35 - STATE.aimLerp * 0.35;
            let armY = -0.4 + bob + STATE.aimLerp * 0.05;
            let mArm = M4.translation(armX, armY, -0.5);
            mArm = M4.multiply(mArm, M4.rotationY(-0.3 * (1 - STATE.aimLerp)));
            drawMeshRaw(ASSETS.arm, mArm);

            // Weapon ADS Positioning
            let targetWepY = -0.12;
            if (p.weaponIdx === 1) targetWepY = -0.15;
            if (p.weaponIdx === 2) targetWepY = -0.25;

            let wepX = 0.25 - STATE.aimLerp * 0.25;
            let wepY = -0.3 + bob + STATE.aimLerp * (targetWepY + 0.3);
            let wepZ = -0.6 - kick - STATE.aimLerp * 0.2;
            let mWep = M4.translation(wepX, wepY, wepZ);
            mWep = M4.multiply(mWep, M4.rotationY(-0.15 * (1 - STATE.aimLerp)));
            if (STATE.aimLerp < 0.9) mWep = M4.multiply(mWep, M4.rotationX(0.05 * (1 - STATE.aimLerp)));
            mWep = M4.multiply(mWep, M4.scaling(1 + STATE.aimLerp * 0.1, 1 + STATE.aimLerp * 0.1, 1 + STATE.aimLerp * 0.1));
            drawMeshRaw(weaponMesh, mWep);
        }


    }


    drawMinimap(p, STATE.bots);

}

function drawMinimap(p, bots) {
    const ctx = document.getElementById('minimap').getContext('2d'), w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // [YÊU CẦU] Tăng độ sáng minimap mạnh hơn nữa
    ctx.fillStyle = "rgba(100, 100, 100, 0.5)"; // Nền xám sáng trung tính
    ctx.fillRect(0, 0, w, h);

    // Tỉ lệ để bản đồ bao quát vừa đủ MAP_SIZE
    const scale = w / MAP_SIZE;
    const cx = w / 2, cy = h / 2;

    // Vẽ viền trắng rõ nét
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, w, h);

    // Vị trí người chơi và hướng nhìn
    const px = cx + p.pos.x * scale, py = cy + p.pos.z * scale, yaw = STATE.camera.rot.y;

    // Vẽ mũi tên người chơi sáng rực
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(yaw);
    ctx.fillStyle = "#00ffaa";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00ffaa";

    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(-8, 10); ctx.lineTo(0, 5); ctx.lineTo(8, 10); ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Vẽ quân địch (Chấm đỏ sáng)
    ctx.fillStyle = "#ff5555";
    bots.forEach(b => {
        if (b.hp <= 0) return;
        const bx = cx + b.pos.x * scale, by = cy + b.pos.z * scale;
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fill();
    });

    if (STATE.boss && STATE.boss.active) {
        ctx.fillStyle = "#ff00ff";
        ctx.shadowBlur = 10; ctx.shadowColor = "#ff00ff";
        const bx = cx + STATE.boss.pos.x * scale, by = cy + STATE.boss.pos.z * scale;
        ctx.beginPath();
        ctx.arc(bx, by, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}


function showGlobalAnnouncement(text, duration = 3000) {
    const el = document.getElementById('global-announcement');
    if (!el) return;
    el.innerText = text;
    el.classList.add('show');
    setTimeout(() => {
        el.classList.remove('show');
    }, duration);
}

function updateHUD() {
    const p = STATE.player, hpPercent = Math.max(0, (p.hp / p.maxHp) * 100), armorPercent = Math.max(0, (p.armor / p.maxArmor) * 100);

    // [YÊU CẦU] Xử lý nháy đỏ khi mất máu
    const overlay = document.getElementById('damage-overlay');
    if (overlay) {
        if (p.damageFlash > 0) {
            const hpRatio = 1.0 - (p.hp / p.maxHp);
            const intensity = p.damageFlash * (0.3 + hpRatio * 0.4);
            overlay.style.display = 'block';
            overlay.style.opacity = Math.min(0.6, intensity);
            overlay.style.background = `radial-gradient(circle, transparent 20%, rgba(${150 + hpRatio * 105}, 0, 0, 0.7) 100%)`;
        } else {
            overlay.style.display = 'none';
        }
    }

    document.getElementById('health-fill').style.width = hpPercent + '%'; document.getElementById('armor-fill').style.width = armorPercent + '%';
    document.getElementById('ammo-current').innerText = STATE.weapons[p.weaponIdx].ammo; document.getElementById('ammo-reserve').innerText = STATE.weapons[p.weaponIdx].res;
    document.getElementById('weapon-name').innerText = STATE.weapons[p.weaponIdx].name.toUpperCase();
    document.getElementById('alive-count').innerText = "CÒN SỐNG: " + (STATE.bots.length + 1);
    document.getElementById('kill-count').innerText = "KILLS: " + p.kills;


    const btnKillBoss = document.getElementById('kill-last-bot-btn');
    if (btnKillBoss) {
        if (!STATE.bossTriggered && STATE.bots.length > 0 && STATE.bots.length <= 3) {
            btnKillBoss.style.display = 'block';
            btnKillBoss.innerText = `TRIỆU HỒI BOSS (${STATE.bots.length} BOT CÒN LẠI)`;
        } else {
            btnKillBoss.style.display = 'none';
        }
    }

    // CẢNH BÁO CUỒNG BẠO LV2 (40%)
    const enragedThreshold = (STATE.config.botCount || 25) * 0.4;
    if (!STATE.enragedAnnounced && STATE.bots.length > 0 && STATE.bots.length <= enragedThreshold) {
        showGlobalAnnouncement("⚠️ CẢNH BÁO: QUÁI VẬT ĐÃ HÓA CUỒNG BẠO!", 4000);
        STATE.enragedAnnounced = true;
        STATE.shake = 5.0;
    }
}



const AudioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playAudio(type) {
    if (AudioCtx.state === 'suspended') AudioCtx.resume();
    const osc = AudioCtx.createOscillator(), gain = AudioCtx.createGain(); osc.connect(gain); gain.connect(AudioCtx.destination); const now = AudioCtx.currentTime;
    if (type === 'shoot') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.1); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
    else if (type === 'hit') { osc.type = 'square'; osc.frequency.setValueAtTime(1200, now); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.05); osc.start(now); osc.stop(now + 0.05); }
    else if (type === 'pickup') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(800, now + 0.1); gain.gain.setValueAtTime(0.1, now); osc.start(now); osc.stop(now + 0.15); }
    else if (type === 'jump') { osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(300, now + 0.2); gain.gain.setValueAtTime(0.1, now); osc.start(now); osc.stop(now + 0.2); }
}

window.addEventListener('keydown', e => {
    if (STATE.inputLocked) return;
    STATE.keys[e.code] = true;
    if (e.code === 'Escape') {
        if (STATE.screen === 'game') {
            document.exitPointerLock();
            STATE.screen = 'pause';
            document.getElementById('pause-menu').classList.remove('hidden');
        } else if (STATE.screen === 'pause') resumeGame();
    }
    // Toggle chuột bằng phím Ctrl
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
        if (STATE.screen === 'game') {
            if (gl && gl.canvas && document.pointerLockElement === gl.canvas) {
                document.exitPointerLock();
            } else {
                if (gl && gl.canvas) gl.canvas.requestPointerLock();
            }
        }
    }
    if (e.code && e.code.startsWith('Digit')) STATE.keys[e.code] = true;

});
window.addEventListener('keyup', e => STATE.keys[e.code] = false);
window.addEventListener('mousedown', e => {
    if (STATE.inputLocked || STATE.screen !== 'game') return;
    if (e.button === 0) STATE.mouse.down = true;
    if (e.button === 2) STATE.isAiming = true; // Right Click ADS
});
window.addEventListener('mouseup', e => {
    if (e.button === 0) STATE.mouse.down = false;
    if (e.button === 2) STATE.isAiming = false;
});

window.addEventListener('mousemove', e => {
    if (STATE.inputLocked) return;
    if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
    if (!gl || !gl.canvas) return;
    if (document.pointerLockElement === gl.canvas) {
        // Sử dụng kẹp (clamp) thay vì bỏ qua lệnh để vuốt nhanh vẫn mượt mà
        const mx = Math.max(-150, Math.min(150, e.movementX));
        const my = Math.max(-150, Math.min(150, e.movementY));

        STATE.camera.rot.y += mx * 0.002 * (window.aimSensitivity || 1.0);
        STATE.camera.rot.x -= my * 0.002 * (window.aimSensitivity || 1.0);
        STATE.camera.rot.x = Math.max(-1.5, Math.min(1.5, STATE.camera.rot.x));
    }
});

// --- BOSS EVENT LOGIC ---
// Đợi DOM tải xong rồi gán sự kiện cho nút
setTimeout(() => {
    const btn = document.getElementById('kill-last-bot-btn');
    if (btn) btn.onclick = () => triggerBossEvent();
}, 100);

function triggerBossEvent() {
    if (STATE.bossTriggered) return;
    STATE.bossTriggered = true;

    STATE.inputLocked = true;
    STATE.keys = {};

    setTimeout(() => {
        const overlay = document.getElementById('boss-overlay');
        const container = document.getElementById('boss-container');
        const visual = document.getElementById('boss-visual');

        overlay.classList.remove('hidden');
        container.classList.remove('hidden');
        overlay.classList.add('active');
        visual.classList.add('boss-appear');

        document.body.classList.add('shake-screen');
    }, 500);

    // XUẤT HIỆN BOSS 3D NGAY ĐỂ CHIẾN ĐẤU
    setTimeout(() => {
        // Khởi tạo Boss 3D (Hakari)
        const yaw = STATE.camera.rot.y;
        const spawnDist = 45;
        STATE.boss = {
            pos: V3.add(STATE.player.pos, V3.create(Math.sin(yaw) * spawnDist, 0, -Math.cos(yaw) * spawnDist)),
            hp: window.GAME_CONFIG.boss.hp,
            maxHp: window.GAME_CONFIG.boss.hp,
            active: true,
            state: 'fight',
            skillCD: 3,
            vel: V3.create(0, 0, 0),
            armLift: 0, bodyRot: 0, bodyY: 0,
            rotY: yaw + Math.PI, targetAng: yaw + Math.PI,
            pillarSpots: [],
            dead: false,
            skillIndex: 0,
            skillSequence: null
        };
        STATE.boss.pos.y = getHeight(STATE.boss.pos.x, STATE.boss.pos.z);

        document.getElementById('boss-msg').classList.add('boss-text-show');
        STATE.inputLocked = false;
        document.body.classList.remove('shake-screen');

        // Ẩn các overlay cinematic
        document.getElementById('boss-overlay').classList.remove('active');
        document.getElementById('boss-container').classList.add('hidden');

        // Hiện thanh máu Boss
        document.getElementById('boss-hp-container').style.display = 'block';
    }, 3000);
}



let bossOsc = null;
let ambientLoop = null;

// playAmbientHorror() đã xóa — chưa từng được gọi, ambientLoop vẫn giữ cho playBossSound()

let bossNodes = [];
function playBossSound() {
    if (AudioCtx.state === 'suspended') AudioCtx.resume();
    if (bossNodes.length > 0) return;

    // Dừng nhạc nền khi đánh Boss
    if (ambientLoop) {
        ambientLoop.gain.gain.exponentialRampToValueAtTime(0.001, AudioCtx.currentTime + 1);
        setTimeout(() => { if (ambientLoop) ambientLoop.osc.stop(); ambientLoop = null; }, 1000);
    }

    // TỔNG HỢP NHẠC KINH DỊ (Oscillator layers)
    const createDrone = (freq, type = 'sine') => {
        const osc = AudioCtx.createOscillator();
        const gain = AudioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, AudioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, AudioCtx.currentTime);
        // LFO tạo nhịp thở
        const lfo = AudioCtx.createOscillator();
        const lfoGain = AudioCtx.createGain();
        lfo.frequency.value = 0.5; lfoGain.gain.value = 0.05;
        lfo.connect(lfoGain); lfoGain.connect(gain.gain);
        lfo.start();
        osc.connect(gain); gain.connect(AudioCtx.destination);
        osc.start();
        bossNodes.push(osc, lfo);
    };

    // 3 tầng âm thanh lệch tông tạo cảm giác bất an
    createDrone(40, 'sawtooth');
    createDrone(43.5, 'sine');
    createDrone(47, 'triangle');

    // Thỉnh thoảng chèn tiếng rít cao
    setInterval(() => {
        if (!STATE.boss || !STATE.boss.active) return;
        const sting = AudioCtx.createOscillator();
        const sGain = AudioCtx.createGain();
        sting.type = 'square';
        sting.frequency.setValueAtTime(800 + Math.random() * 400, AudioCtx.currentTime);
        sGain.gain.setValueAtTime(0.02, AudioCtx.currentTime);
        sGain.gain.exponentialRampToValueAtTime(0.001, AudioCtx.currentTime + 1);
        sting.connect(sGain); sGain.connect(AudioCtx.destination);
        sting.start(); sting.stop(AudioCtx.currentTime + 1);
    }, 4000);
}
// -------------------------


function resumeGame() {
    STATE.screen = 'game';
    document.getElementById('pause-menu').classList.add('hidden'); if (gl && gl.canvas) gl.canvas.requestPointerLock();
}

function spawnOiiaCat() { OIIA_CAT.spawned = true; const cat = document.getElementById("hakariphonk-cat"), sound = document.getElementById("hakariphonk-sound"); cat.style.display = "block"; sound.currentTime = 0; sound.play(); }

function loop(now) {
    if (!STATE.lastTime) STATE.lastTime = now;
    const dt = Math.min((now - STATE.lastTime) / 1000, 0.1);
    STATE.lastTime = now;

    update(dt);
    draw();
    updateHUD();
    // Dùng window.loop để chạy qua wrapper đồng bộ khán giả mỗi frame
    requestAnimationFrame(window.loop);
}

function showClickAnywhere(delay = 10000) {
    setTimeout(() => {
        const overlay = document.getElementById("click-anywhere");
        const continueText = document.getElementById("continue-text");

        if (document.pointerLockElement) document.exitPointerLock();

        overlay.style.display = "block";
        continueText.style.display = "block";

        overlay.onclick = () => {
            overlay.style.display = "none";
            continueText.style.display = "none";
            overlay.onclick = null;
            endGame(true); // GỌI ENDGAME(TRUE) ĐỂ CHẠY ĐÚNG LOGIC!
        };
    }, delay);
}

// window.onload đã được gộp vào addEventListener('load') ở trên
// window.onload = () => {
//     gl.canvas.width = window.innerWidth;
//     gl.canvas.height = window.innerHeight;
//     initAssets();
// };





function checkOrientation() {
    const warning = document.getElementById('portrait-warning');
    if (warning) {
        // Chỉ hiện cảnh báo nếu là Mobile và chiều dọc dài hơn ngang
        if (isMobile && window.innerHeight > window.innerWidth) {
            warning.style.display = 'flex';
        } else {
            warning.style.display = 'none';
        }
    }
}
window.onresize = () => {
    if (gl && gl.canvas) {
        gl.canvas.width = window.innerWidth;
        gl.canvas.height = window.innerHeight;
    }
    checkOrientation();
};
window.addEventListener('load', checkOrientation);
// Tự động điền tên cũ khi vào trang
window.addEventListener('load', () => {
    const savedName = localStorage.getItem('savedPlayerName');
    if (savedName) {
        document.getElementById('player-name-input').value = savedName;
    }
});

// --- CẤU HÌNH SỐ LƯỢNG BOT (ĐÃ FIX OVERWRITE) ---
const savedBotCount = localStorage.getItem('botCount');
if (savedBotCount) {
    STATE.config.botCount = parseInt(savedBotCount);
} else {
    STATE.config.botCount = isMobile ? 15 : 25;
}

let joyActive = false, joyCenter = { x: 0, y: 0 };
let aimTouchId = null, lastAimPos = { x: 0, y: 0 };

window.addEventListener('DOMContentLoaded', () => {
    // --- XỬ LÝ THANH CHỈNH BOT ---
    const botSlider = document.getElementById('bot-count-slider');
    const botVal = document.getElementById('bot-count-val');
    if (botSlider && botVal) {
        botSlider.value = STATE.config.botCount;
        botVal.innerText = STATE.config.botCount;
        const updateBotVal = (e) => {
            const val = e.target.value;
            botVal.innerText = val;
            STATE.config.botCount = parseInt(val);
            localStorage.setItem('botCount', val);
        };
        botSlider.addEventListener('input', updateBotVal);
        botSlider.addEventListener('change', updateBotVal);
    }

    // --- XỬ LÝ SỔ TAY HƯỚNG DẪN ---
    const btnGuide = document.getElementById('btn-open-guide');
    const btnCloseGuide = document.getElementById('close-guide-btn');
    const guideModal = document.getElementById('guide-modal');

    if (btnGuide && guideModal) {
        btnGuide.onclick = () => guideModal.classList.remove('hidden');
    }
    if (btnCloseGuide && guideModal) {
        btnCloseGuide.onclick = () => guideModal.classList.add('hidden');
    }

    // --- XỬ LÝ DISCORD ---
    const btnDiscord = document.getElementById('btn-join-discord');
    if (btnDiscord) {
        btnDiscord.onclick = () => {
            // Cố gắng mở trực tiếp qua Chrome nếu là Android để tránh News Plus của Oppo
            const discordUrl = 'https://discord.gg/your-invite-code';
            window.open(discordUrl, '_blank');

            const docElm = document.documentElement;
            if (docElm.requestFullscreen) docElm.requestFullscreen().catch(e => { });
        };
    }

    const jZone = document.getElementById('joystick-zone');
    const jKnob = document.getElementById('joystick-knob');
    const aimZone = document.getElementById('touch-aim-zone');

    // Joystick (Di chuyển)
    if (jZone) {
        jZone.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            joyActive = true;
            joyCenter = { x: touch.clientX, y: touch.clientY };

            const base = document.getElementById('joystick-base');
            if (base) {
                base.style.left = (joyCenter.x - 55) + 'px';
                base.style.top = (joyCenter.y - 55) + 'px';
                base.style.opacity = 1;
            }
            jKnob.style.opacity = 1;
            updateJoystick(touch);
        }, { passive: false });

        jZone.addEventListener('touchmove', e => {
            e.preventDefault();
            if (!joyActive) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                updateJoystick(e.changedTouches[i]);
            }
        }, { passive: false });

        jZone.addEventListener('touchend', e => {
            e.preventDefault();
            joyActive = false;

            const base = document.getElementById('joystick-base');
            if (base) base.style.opacity = 0;
            jKnob.style.opacity = 0;

            STATE.keys['KeyW'] = false; STATE.keys['KeyS'] = false;
            STATE.keys['KeyA'] = false; STATE.keys['KeyD'] = false;

            // Hủy chạy nhanh khi thả joystick
            STATE.keys['ShiftLeft'] = false;
            const btnSprint = document.getElementById('btn-sprint');
            if (btnSprint) btnSprint.classList.remove('pressed');
        }, { passive: false });

        function updateJoystick(touch) {
            let dx = touch.clientX - joyCenter.x;
            let dy = touch.clientY - joyCenter.y;
            const maxDist = 45;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
            jKnob.style.left = (joyCenter.x - 20 + dx) + 'px';
            jKnob.style.top = (joyCenter.y - 20 + dy) + 'px';

            STATE.keys['KeyW'] = dy < -20;
            STATE.keys['KeyS'] = dy > 20;
            STATE.keys['KeyA'] = dx < -20;
            STATE.keys['KeyD'] = dx > 20;
        }
    }

    // Touch Aim (Xoay Camera)
    if (aimZone) {
        aimZone.addEventListener('touchstart', e => {
            e.preventDefault();
            if (aimTouchId !== null) return;
            const t = e.changedTouches[0];
            aimTouchId = t.identifier;
            lastAimPos = { x: t.clientX, y: t.clientY };
        }, { passive: false });

        aimZone.addEventListener('touchmove', e => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === aimTouchId) {
                    const dx = t.clientX - lastAimPos.x;
                    const dy = t.clientY - lastAimPos.y;

                    lastAimPos.x = t.clientX;
                    lastAimPos.y = t.clientY;

                    const cdx = Math.max(-150, Math.min(150, dx));
                    const cdy = Math.max(-150, Math.min(150, dy));
                    STATE.camera.rot.y += cdx * 0.005 * (window.aimSensitivity || 1.0);
                    STATE.camera.rot.x -= cdy * 0.005 * (window.aimSensitivity || 1.0);
                    STATE.camera.rot.x = Math.max(-1.5, Math.min(1.5, STATE.camera.rot.x));
                    STATE.camera.rot.y = ((STATE.camera.rot.y + Math.PI) % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2) - Math.PI;
                }
            }
        }, { passive: false });

        aimZone.addEventListener('touchend', e => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === aimTouchId) aimTouchId = null;
            }
        }, { passive: false });
    }

    // Các Nút Hành động
    window.isEditingHUD = false;
    const btnShoot = document.getElementById('btn-shoot');
    let shootTouchId = null;
    let lastShootPos = { x: 0, y: 0 };

    if (btnShoot) {
        const onShootStart = e => {
            if (window.isEditingHUD) return;
            if (e.type === 'touchstart') e.preventDefault();
            STATE.mouse.down = true;
            btnShoot.classList.add('pressed');
            const t = e.changedTouches ? e.changedTouches[0] : e;
            shootTouchId = e.changedTouches ? t.identifier : 'mouse';
            lastShootPos = { x: t.clientX, y: t.clientY };
        };
        btnShoot.addEventListener('touchstart', onShootStart);
        btnShoot.addEventListener('mousedown', onShootStart);

        const onShootMove = e => {
            if (window.isEditingHUD || (!shootTouchId)) return;
            if (shootTouchId === 'mouse') return;
            const touches = e.changedTouches ? e.changedTouches : [e];
            for (let i = 0; i < touches.length; i++) {
                const t = touches[i];
                const id = e.changedTouches ? t.identifier : 'mouse';
                if (id === shootTouchId) {
                    const dx = t.clientX - lastShootPos.x;
                    const dy = t.clientY - lastShootPos.y;
                    lastShootPos.x = t.clientX;
                    lastShootPos.y = t.clientY;
                    const cdx = Math.max(-100, Math.min(100, dx));
                    const cdy = Math.max(-100, Math.min(100, dy));
                    STATE.camera.rot.y += cdx * 0.005 * (window.aimSensitivity || 1.0);
                    STATE.camera.rot.x -= cdy * 0.005 * (window.aimSensitivity || 1.0);
                    STATE.camera.rot.x = Math.max(-1.5, Math.min(1.5, STATE.camera.rot.x));
                }
            }
        };
        window.addEventListener('touchmove', onShootMove, { passive: false });
        window.addEventListener('mousemove', onShootMove);

        const onShootEnd = e => {
            const id = e.changedTouches ? e.changedTouches[0].identifier : 'mouse';
            if (id === shootTouchId) {
                shootTouchId = null;
                STATE.mouse.down = false;
                btnShoot.classList.remove('pressed');
            }
        };
        window.addEventListener('touchend', onShootEnd);
        window.addEventListener('mouseup', onShootEnd);
    }

    const btnAim = document.getElementById('btn-aim');
    if (btnAim) {
        const onAim = e => { if (window.isEditingHUD) return; e.preventDefault(); STATE.isAiming = !STATE.isAiming; if (STATE.isAiming) btnAim.classList.add('pressed'); else btnAim.classList.remove('pressed'); };
        btnAim.addEventListener('touchstart', onAim);
        btnAim.addEventListener('mousedown', onAim);
    }

    const btnSprint = document.getElementById('btn-sprint');
    if (btnSprint) {
        const onSprint = e => { if (window.isEditingHUD) return; e.preventDefault(); STATE.keys['ShiftLeft'] = !STATE.keys['ShiftLeft']; if (STATE.keys['ShiftLeft']) btnSprint.classList.add('pressed'); else btnSprint.classList.remove('pressed'); };
        btnSprint.addEventListener('touchstart', onSprint);
        btnSprint.addEventListener('mousedown', onSprint);
    }

    const btnReload = document.getElementById('btn-reload');
    if (btnReload) {
        const onReloadStart = e => { if (window.isEditingHUD) return; e.preventDefault(); STATE.keys['KeyR'] = true; btnReload.classList.add('pressed'); };
        const onReloadEnd = e => { if (window.isEditingHUD) return; e.preventDefault(); STATE.keys['KeyR'] = false; btnReload.classList.remove('pressed'); };
        btnReload.addEventListener('touchstart', onReloadStart);
        btnReload.addEventListener('mousedown', onReloadStart);
        btnReload.addEventListener('touchend', onReloadEnd);
        btnReload.addEventListener('mouseup', onReloadEnd);
    }

    const btnJump = document.getElementById('btn-jump');
    if (btnJump) {
        const onJumpStart = e => { if (window.isEditingHUD) return; e.preventDefault(); STATE.keys['Space'] = true; };
        const onJumpEnd = e => { if (window.isEditingHUD) return; e.preventDefault(); STATE.keys['Space'] = false; };
        btnJump.addEventListener('touchstart', onJumpStart);
        btnJump.addEventListener('mousedown', onJumpStart);
        btnJump.addEventListener('touchend', onJumpEnd);
        btnJump.addEventListener('mouseup', onJumpEnd);
    }

    const wBtns = document.querySelectorAll('.weapon-btn');
    wBtns.forEach(btn => {
        const onWeaponSelect = e => {
            e.preventDefault();
            const idx = parseInt(btn.getAttribute('data-idx'));
            STATE.player.weaponIdx = idx;
            wBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
        btn.addEventListener('touchstart', onWeaponSelect);
        btn.addEventListener('mousedown', onWeaponSelect);
    });
});








