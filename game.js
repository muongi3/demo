let canClickContinue = false;
const isMobile = window.matchMedia("(max-width: 800px), (pointer: coarse)").matches;

// KIỂM TRA CHẾ ĐỘ KHÁN GIẢ NGAY LẬP TỨC (TRƯỚC KHI LOAD BẤT KỲ THỨ GÌ)
const urlParams = new URLSearchParams(window.location.search);
const GLOBAL_WATCH_ID = urlParams.get('playerId') || urlParams.get('spectate') || urlParams.get('watch');
if (GLOBAL_WATCH_ID) {
    window.SPECTATOR_MODE = true;
    console.log("INITIALIZED AS SPECTATOR targeting:", GLOBAL_WATCH_ID);
}



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

// Hệ thống Debug cho Mobile
const debug = (msg) => {
    console.log(msg);
    const consoleEl = document.getElementById('debug-console');
    if (consoleEl) {
        consoleEl.style.display = 'block';
        consoleEl.innerHTML += msg + '<br>';
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }
};
window.onerror = (msg, url, line) => debug(`❌ LỖI: ${msg} tại ${line}`);

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
        debug("❌ WebGL2 KHÔNG HỖ TRỢ!");
        alert("Thiết bị của bác không hỗ trợ WebGL2. Vui lòng dùng trình duyệt khác!");
        return;
    }
    debug("✅ WebGL2 OK");
    // Cập nhật kích thước canvas ngay khi load
    gl.canvas.width = window.innerWidth;
    gl.canvas.height = window.innerHeight;
    debug("🎨 Khởi tạo Graphics...");
    initGraphics(); 
    debug("📦 Khởi tạo Assets...");
    initAssets();   
    debug("🚀 Game initialized successfully!");

    // KIỂM TRA LINK KHÁN GIẢ NGAY SAU KHI ĐỒ HỌA SẴN SÀNG
    if (GLOBAL_WATCH_ID) {
        debug("🔍 Chế độ: KHÁN GIẢ | Mục tiêu: " + GLOBAL_WATCH_ID);
        startLiveView(GLOBAL_WATCH_ID);
    } else {
        debug("🔍 Chế độ: NGƯỜI CHƠI (HOST)");
    }
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
    
    vec3 finalColor = baseColor * light + vec3(specMask) + vec3(rim);
    
    float fogFactor = 1.0 - exp(-vDist * 0.008);
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

function genCharMesh(color, isHorror = false, isEnraged = false) {
    let V = [], N = [], C = [];
    const push = (m) => { V.push(...m.v); N.push(...m.n); C.push(...m.c); };

    if (isHorror) {
        // --- BOT KINH DỊ (PALE CREEPER) ---
        const pale = [0.85, 0.85, 0.85];
        const blood = [0.4, 0, 0];
        // Thân dài, gầy guộc
        push(getCube(pale, 0.4, 1.2, 0.2, 0, 0.6, 0));
        // Thêm xương sườn nhô ra (kinh dị hơn)
        for (let i = 0; i < 3; i++) {
            push(getCube(pale, 0.45, 0.05, 0.25, 0, 0.8 + i * 0.15, 0.1));
        }

        // Đầu biến dạng to hơn chút
        push(getCube(pale, 0.4, 0.5, 0.4, 0, 1.35, 0));
        // Mắt đỏ rực to phát sáng
        push(getCube([1, 0, 0], 0.15, 0.15, 0.05, -0.15, 1.45, 0.21));
        push(getCube([1, 0, 0], 0.15, 0.15, 0.05, 0.15, 1.45, 0.21));

        // Miệng máu đáng sợ
        push(getCube([0, 0, 0], 0.25, 0.15, 0.05, 0, 1.25, 0.21));
        push(getCube(blood, 0.3, 0.05, 0.05, 0, 1.15, 0.21));

        if (isEnraged) {
            // CUỒNG BẠO: 2 tay giơ thẳng lên trước (Z hướng tới người chơi)
            push(getCube(pale, 0.1, 0.1, 1.0, -0.3, 1.1, 0.4));
            push(getCube(pale, 0.1, 0.1, 1.0, 0.3, 1.1, 0.4));
            push(getCube(blood, 0.1, 0.5, 0.1, 0, 0.8, 0.1)); // Dính máu trên ngực
            // Móng vuốt chĩa về trước
            push(getCube(blood, 0.05, 0.05, 0.3, -0.3, 1.1, 0.9));
            push(getCube(blood, 0.05, 0.05, 0.3, 0.3, 1.1, 0.9));
        } else {
            // THƯỜNG: Tay dài chạm đất
            push(getCube(pale, 0.1, 1.0, 0.1, -0.3, 0.5, 0));
            push(getCube(pale, 0.1, 1.0, 0.1, 0.3, 0.5, 0));
            // Móng vuốt chạm đất
            push(getCube(blood, 0.05, 0.2, 0.05, -0.3, 0, 0));
            push(getCube(blood, 0.05, 0.2, 0.05, 0.3, 0, 0));
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

const WEBHOOK_URL = "https://discord.com/api/webhooks/1499169990350471359/SQrGcSeCjvW3JleJv6rfoBpk5ffwmYpojnLlW5HFdS9oRfn7Gg5UvrYPV95TaAY_6pau"; // BÁC DÁN LINK WEBHOOK THẬT VÀO ĐÂY

const STATE = {
    screen: 'menu', lastTime: 0, camera: { pos: V3.create(0, 10, 20), rot: { x: 0, y: 0 } }, keys: {},
    mouse: { x: 0, y: 0, down: false, rightDown: false }, projectiles: [], particles: [], loot: [], powerups: [], bots: [], barrels: [], pads: [], obstacles: [],

    player: { pos: null, vel: V3.create(0, 0, 0), hp: 600, maxHp: 1000, armor: 0, maxArmor: 500, grounded: false, weaponIdx: 0, recoil: 0, kills: 0, alive: true, streak: 0, lastKillTime: 0, powerup: { type: null, time: 0 } },
    weapons: [{ name: "Pistol", damage: 60, rate: 300, spread: 0.05, range: 50, ammo: 12, res: 129, type: 0 }, { name: "SMG", damage: 40, rate: 180, spread: 0.1, range: 40, ammo: 30, res: 90, type: 1 }, { name: "Sniper", damage: 100, rate: 1000, spread: 0.001, range: 200, ammo: 5, res: 10, type: 2 }],
    lastShot: 0, shake: 0, config: { botCount: 20, zoneSpeed: 5 },
    inputLocked: false,
    bossTriggered: false,
    isAiming: false,
    aimLerp: 0,
    boss: { active: false, pos: V3.create(0, 0, 0), vel: V3.create(0, 0, 0), hp: 8000, maxHp: 8000, state: 'idle', skillCD: 5, targetPos: null, shotCount: 0, skillIndex: 0, pillarSpots: [], armLift: 0, bodyY: 0, bodyRot: 0, fanMesh: null, hasHit: false },
    startTime: 0,
    gameEnded: false,
    playerName: localStorage.getItem('savedPlayerName') || "Người chơi",
    enragedAnnounced: false,
    hasExited: false,
    isWatching: false,
    isConnected: false,
    peer: null,
    spectatorConns: []
};










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
    STATE.screen = 'game'; STATE.player.hp = 1000; STATE.player.maxHp = 1000; STATE.player.armor = 0; STATE.player.maxArmor = 500;



    STATE.startTime = Date.now(); STATE.gameEnded = false;


    STATE.player.pos = V3.create(0, getHeight(0, 0) + 100, 0); STATE.player.vel = V3.create(0, -1, 0); STATE.player.alive = true; STATE.player.kills = 0; STATE.player.streak = 0;

    STATE.bots = []; STATE.loot = []; STATE.barrels = []; STATE.pads = []; STATE.projectiles = []; STATE.particles = []; STATE.shake = 0; STATE.obstacles = [];
    spun = false; document.getElementById("reward-result").innerText = ""; document.getElementById("reward-result").style.display = "none"; document.getElementById("wheel").style.transform = `rotate(0deg)`;
    const minimap = document.getElementById('minimap');
    if (minimap) { minimap.width = 200; minimap.height = 200; }

    for (let i = 0; i < STATE.config.botCount; i++) {
        // Phân bổ bot rải rác khắp bản đồ, tránh tập trung quá gần người chơi
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * (MAP_SIZE * 0.45);
        let x = Math.cos(angle) * dist;
        let z = Math.sin(angle) * dist;
        STATE.bots.push({ pos: V3.create(x, getHeight(x, z) + 1, z), hp: 200, target: null, state: 'roam', nextMove: 0, fireCD: 0, id: i });
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

    gl.canvas.requestPointerLock(); requestAnimationFrame(loop);


}

function update(dt) {
    if (STATE.screen === 'pause' || STATE.inputLocked || window.SPECTATOR_MODE) return;
    STATE.shake *= 0.9;
    const prevCount = STATE.bots.length;

    const p = STATE.player;
    let speedMult = 1.0, dmgMult = 1.0;
    if (p.powerup) {
        if (p.powerup.type === 0 || p.powerup.type === 3) speedMult = 1.8;
        if (p.powerup.type === 1 || p.powerup.type === 3) dmgMult = 2.0;
    }
    if (STATE.keys['ShiftLeft']) speedMult *= 1.5;
    const moveSpeed = (p.weaponIdx === 2 ? 6 : 10) * speedMult;
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
    if (STATE.keys['Space'] && p.grounded) { p.vel.y = 10; p.grounded = false; }
    p.recoil *= 0.8;

    const now = performance.now(), weapon = STATE.weapons[p.weaponIdx];
    if (STATE.mouse.down && now - STATE.lastShot > weapon.rate && weapon.ammo > 0) { fireWeapon(p, STATE.camera.rot, weapon, true); weapon.ammo--; STATE.lastShot = now; p.recoil = 0.1; }
    p.recoil *= 0.8; if (STATE.keys['Digit1']) p.weaponIdx = 0; if (STATE.keys['Digit2']) p.weaponIdx = 1; if (STATE.keys['Digit3']) p.weaponIdx = 2;
    if (STATE.keys['KeyR'] && weapon.ammo < 30) { let needed = 30 - weapon.ammo; if (weapon.res >= needed) { weapon.res -= needed; weapon.ammo = 30; } else { weapon.ammo += weapon.res; weapon.res = 0; } }
    STATE.projectiles.forEach((proj, i) => {
        // Ưu tiên dùng tốc độ tùy chỉnh (proj.speed), nếu không mới dùng mặc định
        const speed = proj.speed || (proj.isBoss ? 40 : 100);
        const step = V3.mul(proj.dir, speed * dt), nextPos = V3.add(proj.pos, step);

        STATE.barrels.forEach(b => { if (b.hp > 0 && V3.dist(nextPos, V3.add(b.pos, V3.create(0, 0.6, 0))) < 2.5) { b.hp -= proj.dmg; playAudio('hit'); showHitMarker(); spawnParticles(nextPos, 5, [1, 0.5, 0]); proj.dead = true; if (b.hp <= 0) createExplosion(b.pos); } });

        if (proj.isPlayer) {
            // Hitbox quái thường (bot) - Nhắm vào tâm thân mình (y + 0.65)
            STATE.bots.forEach(bot => { if (V3.dist(nextPos, V3.add(bot.pos, V3.create(0, 0.65, 0))) < (isMobile ? 2.5 : 1.0)) { bot.hp -= proj.dmg; playAudio('hit'); showHitMarker(); spawnParticles(nextPos, 5, [1, 0, 0]); proj.dead = true; } });

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
    STATE.bots.forEach(bot => {
        if (bot.hp <= 0) return; bot.fireCD -= dt; const dist = V3.dist(bot.pos, p.pos);

        // Khi còn ít bot, chúng sẽ tự động săn tìm người chơi (Tracking mode)
        // [CHỈNH SỐ LƯỢNG CUỒNG BẠO] Đổi số 3 bên dưới thành số bạn muốn (ví dụ: <= 5)
        const isLastBots = STATE.bots.length <= 3;
        if (isLastBots || dist < 30) {
            const dir = V3.norm(V3.sub(p.pos, bot.pos));
            const speed = isLastBots ? 17 : 5; // Tăng tốc độ bot thường 1 xíu để nó đi bộ tới người chơi
            // Tính khoảng cách 2D để bot có thể đánh lên nóc xe
            const dist2D = Math.sqrt(Math.pow(p.pos.x - bot.pos.x, 2) + Math.pow(p.pos.z - bot.pos.z, 2));
            if (dist2D > 1.5) {
                bot.pos.x += dir.x * speed * dt;
                bot.pos.z += dir.z * speed * dt;
            }
            if (dist2D < 2.5 && Math.abs(p.pos.y - bot.pos.y) < 3.0 && bot.fireCD <= 0) {
                // Xóa cơ chế bắn, chuyển sang CÀO CẬN CHIẾN
                takeDamage(p, isLastBots ? 20 : 10);
                STATE.shake = 3.0;
                playAudio('hit');
                bot.fireCD = 0.8;
            }

            // AI Nhảy: Nếu bị kẹt ở xe/nhà nhưng người chơi ở trên cao
            if (dist2D < 3.5 && p.pos.y > bot.pos.y + 1.5 && bot.grounded) {
                bot.velY = 16;
                bot.grounded = false;
            }
        }
        else { bot.nextMove -= dt; if (bot.nextMove <= 0) { bot.targetDir = V3.create(Math.random() - 0.5, 0, Math.random() - 0.5); bot.nextMove = 2 + Math.random() * 3; } if (bot.targetDir) { bot.pos.x += bot.targetDir.x * 3 * dt; bot.pos.z += bot.targetDir.z * 3 * dt; } }

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
        else if (closeLoot.type === 1) { p.hp = Math.min(p.maxHp, p.hp + 200); pickedName = "HỒI MÁU"; }
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
                    b.state = 'teleport_start'; b.skillCD = 2.0; // Chìm xuống 2 giây
                } else if (skill === 'chiêu 4') {
                    b.state = 'pillar_prepare'; b.skillCD = 3.0; b.pillarSpots = [];
                    b.shotCount = 0;
                } else if (skill === 'chiêu 3') {
                    b.state = 'jump_start'; b.skillCD = 2.0;
                    const tx = p.pos.x, tz = p.pos.z;
                    b.targetPos = V3.create(tx, getHeight(tx, tz), tz);
                    if (b.indicatorMesh) deleteMesh(b.indicatorMesh);
                    // Đồng bộ bán kính 30 với tầm sát thương
                    b.indicatorMeshParams = { x: b.targetPos.x, z: b.targetPos.z, r: 25 };
                    b.indicatorMesh = genTerrainFollowMesh(b.indicatorMeshParams.x, b.indicatorMeshParams.z, b.indicatorMeshParams.r);
                } else if (skill === 'chiêu 1') {
                    b.state = 'dash_prepare'; b.skillCD = 2.0;
                    b.targetDir = V3.norm(V3.sub(p.pos, b.pos));
                    b.targetAng = Math.atan2(b.targetDir.x, b.targetDir.z);
                    if (b.dashMesh) deleteMesh(b.dashMesh);
                    // Rộng hơn (8) và Dài hơn (150)
                    b.dashMeshParams = { x: b.pos.x, z: b.pos.z, ang: b.targetAng, w: 8, l: 150 };
                    b.dashMesh = genTerrainDashMesh(b.dashMeshParams.x, b.dashMeshParams.z, b.dashMeshParams.ang, b.dashMeshParams.w, b.dashMeshParams.l);
                } else if (skill === 'chiêu 2') {
                    b.state = 'shoot_prepare'; b.skillCD = 0.8;
                }
            } else {
                const isRage = b.hp < b.maxHp * 0.4;
                const speed = isRage ? 15 : 5; // Chậm lại để cân bằng (Cũ: 15/8)

                const dir = V3.norm(V3.sub(p.pos, b.pos));
                b.pos.x += dir.x * speed * dt; b.pos.z += dir.z * speed * dt;
                b.pos.y = getHeight(b.pos.x, b.pos.z);
                if (isRage && Math.random() < 0.2) spawnParticles(b.pos, 2, [1, 0, 0]);
            }

        } else if (b.state === 'jump_start') {
            b.bodyRot += (1.2 - b.bodyRot) * 0.1; // Cúi người lấy đà
            b.armLift += (0 - b.armLift) * 0.1;
            if (b.skillCD <= 0) {
                const gravity = 50;
                b.state = 'jumping';
                const v0y = 45;
                b.vel.y = v0y;
                const dy = b.pos.y - b.targetPos.y;
                const airTime = (v0y + Math.sqrt(v0y * v0y + 2 * gravity * dy)) / gravity;
                b.vel.x = (b.targetPos.x - b.pos.x) / airTime;
                b.vel.z = (b.targetPos.z - b.pos.z) / airTime;
                b.armLift = 3.0; // Nhảy lên mới vung tay
            }
        } else if (b.state === 'jumping') {
            b.armLift = 3.0;
            b.bodyRot = 0; // THẲNG NGƯỜI KHI ĐANG TRÊN KHÔNG
            b.vel.y -= 50 * dt; b.pos.x += b.vel.x * dt; b.pos.z += b.vel.z * dt; b.pos.y += b.vel.y * dt;
            if (b.pos.y <= getHeight(b.pos.x, b.pos.z)) {
                b.pos.y = getHeight(b.pos.x, b.pos.z);
                b.state = 'recover'; b.skillCD = 1.5; // Khóa tư thế 1.5s
                b.bodyRot = 1.4; b.armLift = -0.5;
                const dmgDist = 25;
                const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z;
                if (Math.sqrt(dx * dx + dz * dz) < dmgDist) {
                    takeDamage(p, 600);
                    STATE.shake = 5.0;
                }
                spawnParticles(b.pos, 300, [1, 0, 0], 2.5);
                STATE.shake = 10.0;
            }
        } else if (b.state === 'recover') {
            // KHÓA ANIMATION CÚI NGƯỜI (Không cho quay về idle ngay)
            b.bodyRot = 1.4; b.armLift = -0.5;
            if (b.skillCD <= 0) b.state = 'fight';
        } else if (b.state === 'dash_prepare') {
            // XOAY MẶT THEO NGƯỜI CHƠI NHƯNG KHÔNG CÓ ANIMATION KHÁC
            const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z;
            b.targetAng = Math.atan2(dx, dz); // Ghi đè liên tục hướng nhìn
            b.bodyRot = 0;
            if (b.skillCD <= 0) { b.state = 'dashing'; b.skillCD = 0.8; }
        } else if (b.state === 'dashing') {
            b.armLift += (2.2 - b.armLift) * 0.2; // Tay duỗi thẳng về sau khi lướt
            b.bodyRot = 0.6; // Nghiêng hẳn người
            b.pos.x += b.targetDir.x * 150 * dt; b.pos.z += b.targetDir.z * 150 * dt;
            b.pos.y = getHeight(b.pos.x, b.pos.z);

            // HIỆU ỨNG: Để lại bóng ma/khói đỏ khi lướt
            if (Math.random() < 0.6) spawnParticles(b.pos, 3, [1, 0, 0]);
            STATE.shake = Math.max(STATE.shake, 1.2); // Rung mạnh hơn khi lướt nhanh

            if (V3.dist(b.pos, p.pos) < 12) takeDamage(p, 400 * dt);
            b.skillCD -= dt;
            if (b.skillCD <= 0) { b.state = 'fight'; b.skillCD = 3; }

        } else if (b.state === 'pillar_prepare') {
            b.bodyRot = 0;
            b.bodyY = 0;

            // 1 giây đầu giơ tay cao + hiện vòng cảnh báo
            if (b.skillCD > 1.0) {
                b.armLift += (2.8 - b.armLift) * 0.1;
                if (b.shotCount === 0) {
                    for (let i = 0; i < 20; i++) {
                        let tx, tz, ok = false;
                        for (let attempt = 0; attempt < 50; attempt++) {
                            const ang = Math.random() * Math.PI * 2;
                            const dist = Math.random() * 70;
                            tx = p.pos.x + Math.sin(ang) * dist;
                            tz = p.pos.z + Math.cos(ang) * dist;
                            let tooClose = false;
                            for (let s of b.pillarSpots) {
                                if (Math.sqrt((tx - s.x) ** 2 + (tz - s.z) ** 2) < 18) tooClose = true;
                            }
                            if (!tooClose) { ok = true; break; }
                        }
                        if (ok) {
                            const mesh = genTerrainFollowMesh(tx, tz, 9);
                            b.pillarSpots.push({ x: tx, z: tz, h: getHeight(tx, tz), active: false, hasHit: false, timer: 2.0, mesh: mesh });
                        }
                    }
                    b.shotCount = 20;
                    playAudio('hit');
                }
            } else {
                // Hạ tay xuống để tung chiêu (0.5s cuối)
                b.armLift += (0 - b.armLift) * 0.4;
            }

            b.pillarSpots.forEach(s => { s.timer -= dt; });
            if (b.skillCD <= 0) { b.state = 'pillar_active'; b.skillCD = 1.0; }

        } else if (b.state === 'pillar_active') {
            b.armLift = 0;
            b.bodyRot = 0;
            b.pillarSpots.forEach(s => {
                s.timer -= dt;
                if (s.timer <= 0 && !s.active) {
                    s.active = true;
                    s.activeTimer = 1.0;
                    spawnParticles({ x: s.x, y: s.h, z: s.z }, 50, [1, 0, 0], 1.5);
                    STATE.shake = 1.5;
                }
                if (s.active && !s.hasHit) {
                    const dist = Math.sqrt((p.pos.x - s.x) ** 2 + (p.pos.z - s.z) ** 2);
                    if (dist < 9) { // Giảm xuống 9m cho có chỗ né
                        takeDamage(p, 300);
                        s.hasHit = true;
                    }
                }
                if (s.active) s.activeTimer -= dt;
            });
            if (b.skillCD <= 0) {
                b.state = 'fight'; b.skillCD = 3;
                b.pillarSpots.forEach(s => { if (s.mesh) deleteMesh(s.mesh); s.mesh = null; });
                b.pillarSpots = [];
            }

        } else if (b.state === 'teleport_start') {
            b.bodyY -= 15 * dt;
            // CẬP NHẬT LIÊN TỤC vị trí đáp cho đến khi còn 1.0 giây cuối (để mọc lên ở vị trí 1s trước)
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
                // [CHỈNH SỬA THỜI GIAN] Tổng thời gian từ lúc trồi lên đến khi kết thúc chiêu
                b.state = 'teleport_strike'; b.skillCD = 3.0; // Đổi 3.0 thành số lớn hơn nếu muốn đánh chậm lại
                if (b.targetPos) {
                    b.pos.x = b.targetPos.x; b.pos.z = b.targetPos.z; b.pos.y = b.targetPos.y;
                }
                b.bodyY = -15; b.bodyRot = 0; b.hasHit = false;
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
                b.armLift += (3.0 - b.armLift) * 0.1;

                // 2. THỜI GIAN GỒNG CHỜ (Đập xuống tốn 2 giây): Khi skillCD từ 2.5 xuống 0.5
                // [CHỈNH SỬA THỜI GIAN] Thay đổi số 0.5 này:
                // Tăng lên (VD: 1.5) -> Gồng nhanh hơn
                // Giảm xuống (VD: 0.1) -> Gồng lâu hơn
            } else if (b.skillCD > 0.5) {
                b.armLift = 3.0;

                // 3. VUNG TAY ĐẬP XUỐNG: Khi skillCD < 0.5
            } else {
                b.armLift += (-1.0 - b.armLift) * 0.4;

                const toP = V3.norm(V3.sub(p.pos, b.pos));
                const bYaw = Math.atan2(toP.x, toP.z);
                const d = V3.dist(b.pos, p.pos);
                const pAng = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);

                if (Math.random() < 0.7) {
                    const handX = b.pos.x + Math.sin(bYaw) * 15;
                    const handZ = b.pos.z + Math.cos(bYaw) * 15;
                    spawnParticles({ x: handX, y: b.pos.y + 10, z: handZ }, 5, [1, 0, 0], 1.5);
                }

                // 4. THỜI ĐIỂM GÂY SÁT THƯƠNG: Khoảng 0.15s sau khi bắt đầu vung tay (0.5 - 0.15 = 0.35)
                // [CHỈNH SỬA THỜI GIAN] Con số 0.35 này ăn theo thời gian vung tay ở trên (mục 2)
                if (b.skillCD < 0.35 && !b.hasHit) {
                    let diff = Math.abs(pAng - bYaw);
                    if (diff > Math.PI) diff = 2 * Math.PI - diff;
                    if (d < 30 && diff < 1.2) { // Giảm tầm đánh xuống 25m và góc 1.2
                        takeDamage(p, 300); STATE.shake = 8.0; playAudio('hit');
                        b.hasHit = true;
                    }
                }
            }
            if (b.skillCD <= 0) {
                b.state = 'fight'; b.skillCD = 3;
                if (b.indicatorMesh) gl.deleteVertexArray(b.indicatorMesh.vao); b.indicatorMesh = null;
                if (b.fanMesh) gl.deleteVertexArray(b.fanMesh.vao); b.fanMesh = null;
            }

        } else if (b.state === 'shoot_prepare') {
            b.pos.x += (Math.random() - 0.5) * 0.4; b.pos.z += (Math.random() - 0.5) * 0.4;
            // HIỆU ỨNG: Tia laser nhắm bắn
            const targetPoint = V3.add(p.pos, { x: 0, y: 1.5, z: 0 });
            const spawnPoint = V3.add(b.pos, { x: 0, y: 12, z: 0 });
            const dir = V3.norm(V3.sub(targetPoint, spawnPoint));
            const ang = Math.atan2(dir.x, dir.z);
            if (b.dashMesh) gl.deleteVertexArray(b.dashMesh.vao);
            // Dùng mesh của chiêu 1 nhưng cực mảnh (0.2) để làm tia laser
            b.dashMesh = genTerrainDashMesh(b.pos.x, b.pos.z, ang, 0.4, 200);

            if (b.skillCD <= 0) {
                b.state = 'shooting'; b.skillCD = 0.15; b.shotCount = 15; // Bắn nhanh hơn (0.15s) và nhiều hơn (8 viên)
            }
        } else if (b.state === 'shooting') {
            b.bodyY = Math.sin(Date.now() * 0.1) * 0.3; // Giật lùi nhẹ khi bắn
            if (b.skillCD <= 0) {
                const targetPoint = V3.add(p.pos, { x: 0, y: 1.5, z: 0 });
                const spawnPoint = V3.add(b.pos, { x: 0, y: 12, z: 0 });
                const dir = V3.norm(V3.sub(targetPoint, spawnPoint));
                // Tăng sát thương lên 300, tăng tốc độ đạn
                STATE.projectiles.push({ pos: spawnPoint, dir: dir, dmg: 300, speed: 100, life: 3, isPlayer: false, dead: false, isBoss: true });

                // HIỆU ỨNG: Té lửa tại đầu nòng
                spawnParticles(spawnPoint, 15, [1, 0.5, 0]);
                playAudio('shoot');
                b.shotCount--;
                b.skillCD = 0.1;
                if (b.shotCount <= 0) { b.state = 'fight'; b.skillCD = 3; }
            }
        }






        if (b.state === 'fight' && dist < 10) takeDamage(p, 100 * dt);

        if (b.hp <= 0) {
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
            spawnOiiaCat(); playBossSound(); showClickAnywhere(2000);
        }
        document.getElementById('boss-hp-fill').style.width = (b.hp / b.maxHp) * 100 + '%';
    }

    // Xóa vòng lặp đạn bị thừa




    if (STATE.player.hp <= 0) endGame(false);


}

function createExplosion(pos) { STATE.shake = 0.5; playAudio('shoot'); spawnParticles(pos, 30, [1, 0.5, 0]); const range = 12; if (V3.dist(pos, STATE.player.pos) < range) takeDamage(STATE.player, 200); STATE.bots.forEach(b => { if (V3.dist(pos, b.pos) < range) b.hp -= 200; }); }

function fireWeapon(shooter, rot, weapon, isPlayer, dirOverride) {
    let dir; if (isPlayer) { const yaw = rot.y, pitch = rot.x; dir = V3.create(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); } else dir = V3.norm(dirOverride);
    const spread = (isPlayer && isMobile) ? 0 : weapon.spread; // Không tản đạn trên mobile
    dir.x += (Math.random() - 0.5) * spread; dir.y += (Math.random() - 0.5) * spread; dir.z += (Math.random() - 0.5) * spread; dir = V3.norm(dir);
    STATE.projectiles.push({ pos: V3.add(shooter.pos, V3.create(0, 0.5, 0)), dir: dir, dmg: weapon.damage * (shooter.powerup && shooter.powerup.type === 1 ? 2 : 1), life: 2.0, isPlayer: isPlayer, dead: false });
    playAudio('shoot');
}

function takeDamage(p, amt) {
    if (STATE.gameEnded || (p.powerup && p.powerup.type === 2 && p.powerup.time > 0)) amt *= 0.2;
    if (STATE.gameEnded) return;
    if (p.armor > 0) {
        const armDmg = amt * 0.7;
        p.armor -= armDmg;
        p.hp -= amt * 0.3;
        if (p.armor < 0) { p.hp += p.armor; p.armor = 0; }
    } else p.hp -= amt;

    STATE.shake = Math.min(1.5, STATE.shake + amt * 0.08);
    playAudio('hit');

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

    // Báo Discord khi người chơi CHẾT
    if (!win && !window.SPECTATOR_MODE) {
        fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `💀 Trận đấu của **${STATE.playerName}** đã kết thúc (Người chơi đã gục ngã)! Spectate đã bị đóng.`
            })
        }).catch(() => { });
    }

    // Gửi tín hiệu đóng khán giả
    if (window.spectatorConns) {
        window.spectatorConns.forEach(c => c.send({ type: 'GAME_OVER' }));
    }
    STATE.screen = 'end'; document.exitPointerLock(); document.getElementById('ui-layer').style.display = 'none';
    const duration = Math.floor((Date.now() - STATE.startTime) / 1000);
    const history = JSON.parse(localStorage.getItem('gameHistory') || '[]');
    const matchData = {
        name: STATE.playerName,
        date: new Date().toLocaleString('vi-VN'),
        win,
        kills: STATE.player.kills,
        duration
    };

    // Không lưu lịch sử ngay lập tức. Sẽ lưu khi người chơi bấm nút thoát.


    // Lưu thông tin để gửi sau khi người chơi bấm QUAY LẠI MENU
    STATE.finalStats = { win, kills: STATE.player.kills, duration, date: matchData.date };

    const gameOver = document.getElementById('game-over-screen'), rewardBtn = document.getElementById('open-reward-btn'), playAgainBtn = document.getElementById('play-again-btn');

    gameOver.classList.remove('hidden');
    if (win) {
        document.getElementById('end-title').innerText = "VICTORY";
        document.getElementById('end-title').style.color = "#ffd700";
        rewardBtn.style.display = 'inline-block';
        if (playAgainBtn) playAgainBtn.style.display = 'none';
    } else {
        document.getElementById('end-title').innerText = "THUA RỒI AK CỐ LÊN!!";
        document.getElementById('end-title').style.color = "#ff0000";
        rewardBtn.style.display = 'none';
        if (playAgainBtn) playAgainBtn.style.display = 'inline-block';
    }




    document.getElementById('end-stats').innerText = `Kills: ${STATE.player.kills} | Thời gian: ${duration}s`;
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

// Logic cho Thùng Góp Ý
document.addEventListener('DOMContentLoaded', () => {
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

    const defaultHUD = {
        'btn-shoot': { bottom: '20px', right: '60px', top: '', left: '' },
        'btn-jump': { bottom: '80px', right: '15px', top: '', left: '' },
        'btn-aim': { bottom: '100px', right: '90px', top: '', left: '' },
        'btn-reload': { bottom: '25px', right: '140px', top: '', left: '' },
        'btn-sprint': { bottom: '150px', left: '40px', top: '', right: '' },
        'mobile-weapons': { top: '75px', right: '10px', bottom: '', left: '' },
        'health-bar-container': { bottom: '10px', left: '10px', top: '', right: '' },
        'armor-bar-container': { bottom: '30px', left: '10px', top: '', right: '' },
        'ammo-display': { bottom: '20px', left: '50%', top: '', right: '' },
        'stats-display': { top: '30px', right: '30px', bottom: '', left: '' },
        'loot-legend': { top: '90px', right: '230px', bottom: '', left: '' }
    };

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
                    if (!btn.style.transform.includes('var(--btn-scale')) {
                        btn.style.transform = 'scale(var(--btn-scale, 1.0))';
                    }
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
                    btn.style.top = ''; btn.style.left = ''; btn.style.position = 'absolute';
                    btn.style.removeProperty('--btn-scale');
                    Object.assign(btn.style, defaultHUD[id]);
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








function showClickToContinue() {

    const txt = document.getElementById("continue-text"); txt.classList.remove("hidden");
    function onClick() { txt.classList.add("hidden"); window.removeEventListener("mousedown", onClick); endGame(true); }
    setTimeout(() => { window.addEventListener("mousedown", onClick); }, 2000);

}

let spun = false;
const rewards = [
    { text: "CHÚC U MAY MẮN CHO LẦN SAU :PP", color: "#ff3366" }, // 0: Đỏ
    { text: "LÌ XÌ 15K", color: "#ffcc00" },                      // 1: Vàng
    { text: "LÌ XÌ 5K", color: "#00ffcc" },                       // 2: Xanh lơ (Cyan)
    { text: "LÌ XÌ cho 20K nè", color: "#3366ff" },               // 3: Xanh biển (Blue)
    { text: "LÌ XÌ 10K", color: "#ff6600" }                       // 4: Cam
];


function openReward() { document.getElementById('game-over-screen').classList.add('hidden'); document.getElementById('reward-screen').classList.remove('hidden'); }
function spinWheel() {
    if (spun) return; spun = true;
    const wheel = document.getElementById("wheel"),
        resultText = document.getElementById("reward-result");

    // --- CHẾ ĐỘ GIAN THƯƠNG (Tỉ lệ ảo) ---
    const rand = Math.random() * 100;
    let index = 0;
    if (rand < 60) index = 0;       // 60%: Chúc may mắn (Đỏ)
    else if (rand < 85) index = 2;  // 25%: 5K (Xanh lơ)
    else if (rand < 95) index = 4;  // 10%: 10K (Cam)
    else if (rand < 99.5) index = 1;// 4.5%: 15K (Vàng)
    else index = 3;                 // 0.5%: 20K (Xanh biển) - CỰC KỲ KHÓ
    // -------------------------------------

    const degPerSlice = 360 / rewards.length;
    // Thêm độ lệch ngẫu nhiên để kim không chĩa ngay giữa ô (nhìn cho thật)
    const randomOffset = (Math.random() - 0.5) * (degPerSlice - 10);

    const extraSpin = 360 * 20;
    const finalDeg = extraSpin + 360 - (index * degPerSlice) - (degPerSlice / 2) + randomOffset;


    wheel.style.transform = `rotate(${finalDeg}deg)`;
    setTimeout(() => {
        const rewardObj = rewards[index];
        resultText.innerText = "🎉 " + rewardObj.text;
        resultText.style.color = rewardObj.color;
        resultText.style.display = "block";
        document.getElementById("back-to-menu-btn").style.display = "block"; // Hiện nút quay lại sau khi quay xong
        document.getElementById("spin-btn").style.display = "none"; // Ẩn nút quay để tránh quay tiếp

        // Lưu phần thưởng vào trạng thái để chuẩn bị gửi Discord
        if (STATE.finalStats) {
            STATE.finalStats.reward = rewards[index].text;
        }

    }, 10000);
}



const GRASS_PATCHES = []; for (let i = 0; i < 200; i++) { const x = Math.sin(i * 12.989) * MAP_SIZE * 0.45, z = Math.cos(i * 78.233) * MAP_SIZE * 0.45, y = getHeight(x, z), scale = 0.6 + Math.random() * 0.6; GRASS_PATCHES.push({ x, y, z, scale }); }

function draw() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const p = STATE.player;
    if (!p || !p.pos) {
        // Nếu là khán giả và chưa có dữ liệu, vẽ màn hình chờ
        if (window.SPECTATOR_MODE) {
            gl.clearColor(0.1, 0.1, 0.1, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        return;
    }

    // CHUYỂN ĐỔI KHÔNG KHÍ: Chiều tà (Bot) vs Kinh dị (Boss)
    let fogCol = [0.6, 0.3, 0.2]; // Màu cam chiều tà mặc định
    let bgCol = [0.7, 0.4, 0.3];  // Bầu trời buổi chiều

    if (STATE.boss && STATE.boss.active) {
        const dist = V3.dist(p.pos, STATE.boss.pos);
        const intensity = Math.max(0, 1 - dist / 50);
        // Bầu trời máu nhấp nháy u ám (Hell Vibe)
        const skyPulse = 0.05 + Math.sin(Date.now() * 0.0015) * 0.04;
        fogCol = [0.25 + intensity * 0.5, 0.01, 0.01];
        bgCol = [0.12 + skyPulse, 0.005, 0.005];
        document.body.style.filter = intensity > 0.4 ? `contrast(${140 + intensity * 60}%) brightness(${0.7 - intensity * 0.25})` : 'brightness(0.7) contrast(1.2)';
        if (intensity > 0.6) STATE.shake += intensity * 0.2;
    } else {
        // GIAI ĐOẠN CHIỀU TÀ (Hết bị tối hui)
        fogCol = [0.6, 0.4, 0.3];
        bgCol = [0.7, 0.4, 0.3];
        document.body.style.filter = 'brightness(1.0) contrast(1.1)';
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

    const eye = V3.create(p.pos.x + (Math.random() - 0.5) * STATE.shake, p.pos.y + 1.1 + (Math.random() - 0.5) * STATE.shake, p.pos.z);
    const forward = V3.create(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)), center = V3.add(eye, forward), view = M4.lookAt(eye, center, V3.create(0, 1, 0));

    gl.uniformMatrix4fv(locs.proj, false, proj);
    gl.uniformMatrix4fv(locs.view, false, view);
    gl.uniform3f(locs.camPos, eye.x, eye.y, eye.z);
    gl.uniform3f(locs.sunDir, 0.5, 0.8, 0.3);
    gl.uniform3f(locs.fogColor, fogCol[0], fogCol[1], fogCol[2]);
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

    // VẼ TRĂNG MÁU (Blood Moon) TỐI GIẢN
    if (STATE.boss && STATE.boss.active) {
        gl.uniform1i(locs.isSky, false);
        const moonPos = { x: eye.x + 200, y: eye.y + 180, z: eye.z - 400 };

        // Vẽ Hào quang nhẹ (Subtle Aura)
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        const pulse = 0.9 + Math.sin(Date.now() * 0.001) * 0.1;
        gl.uniform3f(locs.fogColor, 0.4 * pulse, 0, 0);
        drawMeshActual(ASSETS.bloodMoon, moonPos, 100, 0);
        gl.disable(gl.BLEND);

        // Mặt trăng chính với vết đen diện tích lớn
        gl.uniform3f(locs.fogColor, 2.0, 0, 0);
        drawMeshActual(ASSETS.bloodMoon, moonPos, 80, 0);
        gl.uniform3f(locs.fogColor, fogCol[0], fogCol[1], fogCol[2]);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.uniform1i(locs.isSky, false);

    gl.uniformMatrix4fv(locs.model, false, M4.identity()); gl.bindVertexArray(ASSETS.ground.vao); gl.drawArrays(gl.TRIANGLES, 0, ASSETS.ground.count);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1i(locs.isWater, true); gl.uniformMatrix4fv(locs.model, false, M4.identity()); gl.bindVertexArray(ASSETS.water.vao); gl.drawArrays(gl.TRIANGLES, 0, ASSETS.water.count); gl.uniform1i(locs.isWater, false); gl.disable(gl.BLEND);
    const drawShadow = (pos, size) => { let h = getHeight(pos.x, pos.z) + 0.05, m = M4.translation(pos.x, h, pos.z); m = M4.multiply(m, M4.scaling(size, 0.01, size)); gl.uniformMatrix4fv(locs.model, false, m); gl.bindVertexArray(ASSETS.crate.vao); gl.drawArrays(gl.TRIANGLES, 0, ASSETS.crate.count); };
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform3f(locs.fogColor, 0, 0, 0); STATE.bots.forEach(b => drawShadow(b.pos, 1.5)); drawShadow(p.pos, 1.5);
    gl.uniform3f(locs.fogColor, fogCol[0], fogCol[1], fogCol[2]); // Reset về màu sương hiện tại
    gl.disable(gl.BLEND);
    STATE.bots.forEach(b => {
        const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, ang = Math.atan2(dx, dz);
        // [CHỈNH SỐ LƯỢNG CUỒNG BẠO] Nhớ đổi số 3 ở đây cho khớp với số ở trên hàm update()
        const mesh = (STATE.bots.length <= 3) ? ASSETS.botEnraged : ASSETS.bot;
        drawMeshActual(mesh, b.pos, 1, ang);
    });
    STATE.barrels.forEach(b => drawMeshActual(ASSETS.barrel, b.pos, 3, 0)); gl.disable(gl.CULL_FACE); GRASS_PATCHES.forEach(g => drawMeshActual(ASSETS.grass, { x: g.x, y: g.y, z: g.z }, g.scale, 0)); gl.enable(gl.CULL_FACE);
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

    // Effects & Boss Indicators (Disable for spectators to prevent crash/lag)
    if (!window.SPECTATOR_MODE) {
        STATE.projectiles.forEach(p => {
            if (p.isBoss) drawMeshActual(ASSETS.bossProj, p.pos, 1, 0);
            else drawMeshActual(ASSETS.crate, p.pos, 0.1, 0);
        });
        STATE.particles.forEach(p => {
            gl.uniform3f(locs.fogColor, p.color[0], p.color[1], p.color[2]);
            drawMeshActual(ASSETS.crate, p.pos, 0.2 * p.life, 0);
        });
        gl.uniform3f(locs.fogColor, fogCol[0], fogCol[1], fogCol[2]);
    }

    // Boss Rendering
    if (STATE.boss && STATE.boss.active) {
        const b = STATE.boss;
        const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z;
        const ang = Math.atan2(dx, dz);

        // Boss Body (Static for spectators)
        let mBody = M4.translation(b.pos.x, b.pos.y + b.bodyY, b.pos.z);
        mBody = M4.multiply(mBody, M4.rotationY(ang));
        if (!window.SPECTATOR_MODE) mBody = M4.multiply(mBody, M4.rotationX(b.bodyRot));
        gl.uniformMatrix4fv(locs.model, false, mBody);
        gl.bindVertexArray(ASSETS.bossBody.vao);
        gl.drawArrays(gl.TRIANGLES, 0, ASSETS.bossBody.count);

        // Boss Arms
        const drawArm = (side) => {
            let mArm = M4.translation(b.pos.x, b.pos.y + b.bodyY + 16, b.pos.z);
            mArm = M4.multiply(mArm, M4.rotationY(ang));
            mArm = M4.multiply(mArm, M4.translation(side * 2.8, 0, 0));
            if (!window.SPECTATOR_MODE) mArm = M4.multiply(mArm, M4.rotationX(b.armLift));
            gl.uniformMatrix4fv(locs.model, false, mArm);
            gl.bindVertexArray(ASSETS.bossArm.vao);
            gl.drawArrays(gl.TRIANGLES, 0, ASSETS.bossArm.count);
        };
        drawArm(-1); drawArm(1);

        // Ground Indicators - ONLY FOR PLAYER
        if (!window.SPECTATOR_MODE) {
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
        }


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

    // Tỉ lệ để bản đồ bao quát vừa đủ MAP_SIZE (không dư không thiếu)
    const scale = w / MAP_SIZE;
    const cx = w / 2, cy = h / 2;

    // Vẽ viền trắng sát ranh giới bản đồ (đường màu đen của container)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);

    // Vị trí người chơi và hướng nhìn
    const px = cx + p.pos.x * scale, py = cy + p.pos.z * scale, yaw = STATE.camera.rot.y;

    // Vẽ mũi tên người chơi (Cải tiến để dễ nhìn hướng)
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(yaw);
    ctx.fillStyle = "#00ff88";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00ff88";

    ctx.beginPath();
    ctx.moveTo(0, -10);   // Mũi nhọn hướng đi
    ctx.lineTo(-7, 8);    // Cạnh trái
    ctx.lineTo(0, 4);     // Điểm lõm ở đuôi (tạo hình mũi tên)
    ctx.lineTo(7, 8);     // Cạnh phải
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Vẽ quân địch (Chấm đỏ)
    ctx.fillStyle = "#ff4444";
    ctx.shadowBlur = 0;
    bots.forEach(b => {
        if (b.hp <= 0) return;
        const bx = cx + b.pos.x * scale, by = cy + b.pos.z * scale;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    if (STATE.boss && STATE.boss.active) {
        ctx.fillStyle = "#ff00ff";
        const bx = cx + STATE.boss.pos.x * scale, by = cy + STATE.boss.pos.z * scale;
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
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

    // CẢNH BÁO CUỒNG BẠO
    if (!STATE.enragedAnnounced && STATE.bots.length > 0 && STATE.bots.length <= 3) {
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
        STATE.boss.pos = V3.add(STATE.player.pos, V3.create(Math.sin(yaw) * spawnDist, 0, -Math.cos(yaw) * spawnDist));
        STATE.boss.pos.y = getHeight(STATE.boss.pos.x, STATE.boss.pos.z);
        STATE.boss.active = true;
        STATE.boss.hp = STATE.boss.maxHp;
        STATE.boss.state = 'fight';

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

function playAmbientHorror() {
    if (AudioCtx.state === 'suspended') AudioCtx.resume();
    if (ambientLoop) return;

    // Tạo tiếng drone trầm u ám
    const osc = AudioCtx.createOscillator();
    const gain = AudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, AudioCtx.currentTime); // Tần số thấp
    gain.gain.setValueAtTime(0.05, AudioCtx.currentTime);
    osc.connect(gain);
    gain.connect(AudioCtx.destination);
    osc.start();
    ambientLoop = { osc, gain };
}

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


function resumeGame() { STATE.screen = 'game'; 
document.getElementById('pause-menu').classList.add('hidden'); if (gl && gl.canvas) gl.canvas.requestPointerLock(); }

function spawnOiiaCat() { OIIA_CAT.spawned = true; const cat = document.getElementById("hakariphonk-cat"), sound = document.getElementById("hakariphonk-sound"); cat.style.display = "block"; sound.currentTime = 0; sound.play(); }

function loop(now) {
    if (!STATE.lastTime) STATE.lastTime = now;
    const dt = Math.min((now - STATE.lastTime) / 1000, 0.1);
    STATE.lastTime = now;

    update(dt);
    draw();
    updateHUD();
    requestAnimationFrame(loop);
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

// --- BỘ ĐIỀU KHIỂN MOBILE (TOUCH CONTROLS) & TỐI ƯU ---
if (isMobile) {
    STATE.config.botCount = 15;
} else {
    STATE.config.botCount = 25;
}

let joyActive = false, joyCenter = { x: 0, y: 0 };
let aimTouchId = null, lastAimPos = { x: 0, y: 0 };

window.addEventListener('DOMContentLoaded', () => {
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
                    STATE.camera.rot.y = ((STATE.camera.rot.y + Math.PI) % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2) - Math.PI;
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

// --- NETWORKING & EXIT DETECTION ---


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
    console.log("Player exiting:", reason);
    sendExitToDiscord(reason);
}

// Event Listeners for Exit Detection
window.addEventListener('beforeunload', () => handlePlayerExit('tab closed / refreshed'));
window.addEventListener('pagehide', () => handlePlayerExit('page hidden'));
window.addEventListener('offline', () => handlePlayerExit('lost connection'));
let backgroundExitTimer = null;
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        console.log("App moved to background, starting 10s exit timer...");
        backgroundExitTimer = setTimeout(() => {
            handlePlayerExit('app backgrounded (10s)');
        }, 10000);
    } else {
        console.log("App returned to foreground, cancelling exit timer.");
        if (backgroundExitTimer) clearTimeout(backgroundExitTimer);
    }
});

// --- LIVE VIEW (SPECTATOR MODE) ---
function initPeer() {
    if (STATE.peer) return;
    
    // TẠO ID CỐ ĐỊNH CHO MÁY CHỦ ĐỂ LINK KHÔNG BỊ CHẾT KHI F5
    let persistentId = localStorage.getItem('game_peer_id');
    if (!persistentId) {
        persistentId = 'survival-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('game_peer_id', persistentId);
    }
    
    // Nếu là khán giả, chúng ta vẫn dùng ID ngẫu nhiên của PeerJS để tránh trùng với máy chủ
    const peerId = window.SPECTATOR_MODE ? null : persistentId;

    debug("📡 Khởi tạo PeerJS (" + (peerId ? "Host" : "Spec") + ")...");
    STATE.peer = new Peer(peerId, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                { urls: 'stun:stun.services.mozilla.com' }
            ]
        }
    });

    STATE.peer.on('open', (id) => {
        debug("✅ Peer Mở! ID: " + id);
        console.log('PeerJS ID:', id);

        if (!window.SPECTATOR_MODE) {
            // Thêm mã timestamp ngẫu nhiên để ép trình duyệt tải lại code mới nhất (giống Ctrl+F5)
            const watchLink = `https://muongi3.github.io/demo/?playerId=${id}&t=${Date.now()}`;
            const message = `👤 **${STATE.playerName}** đã vào game!\n🔗 [XEM TRỰC TIẾP TẠI ĐÂY (CTRL+F5)](${watchLink})`;

            fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: message }),
                keepalive: true
            }).catch(err => console.error("Discord Notification Error:", err));
        }
    });

    STATE.peer.on('connection', (conn) => {
        console.log('New spectator connected');
        STATE.spectatorConns.push(conn);

        // GỬI DỮ LIỆU THẾ GIỚI BAN ĐẦU CHO KHÁN GIẢ MỚI
        const worldData = {
            type: 'WORLD_INIT',
            loot: STATE.loot,
            barrels: STATE.barrels,
            pads: STATE.pads,
            obstacles: STATE.obstacles
        };
        setTimeout(() => {
            if (conn.open) conn.send(worldData);
        }, 1000); 

        conn.on('close', () => {
            STATE.spectatorConns = STATE.spectatorConns.filter(c => c !== conn);
        });
    });

    STATE.peer.on('error', (err) => {
        debug("❌ LỖI PEER TOÀN CỤC: " + err.type);
        console.error('PeerJS Global Error:', err);
        const specWarning = document.getElementById('spectator-warning');
        if (specWarning && window.SPECTATOR_MODE) {
            let errorMsg = "❌ LỖI KẾT NỐI";
            if (err.type === 'peer-unavailable') errorMsg = "❌ LỖI: NGƯỜI CHƠI ĐÃ THOÁT HOẶC ĐỔI LINK";
            if (err.type === 'network') errorMsg = "❌ LỖI: MẠNG YẾU / KHÔNG CÓ KẾT NỐI";
            specWarning.innerHTML = `${errorMsg} <button onclick="location.reload()" style="background:#ff3366; color:white; border:none; padding:2px 10px; border-radius:15px; cursor:pointer; margin-left:10px; font-family:inherit; font-weight:bold; font-size:11px">🔄 TẢI LẠI</button>`;
        }
    });
}

function startLiveView(targetId) {
    if (!targetId) return;
    
    // ĐẢM BẢO PEER ĐÃ ĐƯỢC KHỞI TẠO CHO KHÁN GIẢ
    if (!STATE.peer) {
        initPeer();
    }

    window.SPECTATOR_MODE = true;
    STATE.isWatching = true;
    document.body.classList.add('spectator-mode');

    // Ẩn menu ngay lập tức để không bị kẹt
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) { 
        mainMenu.style.setProperty('display', 'none', 'important');
        mainMenu.classList.add('hidden'); 
    }

    const specWarning = document.getElementById('spectator-warning');
    if (specWarning) { 
        specWarning.style.display = 'block'; 
        specWarning.innerHTML = `📡 ĐANG KẾT NỐI... <button onclick="location.reload()" style="background:#ff3366; color:white; border:none; padding:2px 10px; border-radius:15px; cursor:pointer; margin-left:10px; font-family:inherit; font-weight:bold; font-size:11px">🔄 TẢI LẠI</button>`;
    }

    const connectToPlayer = () => {
        if (targetId === STATE.peer.id) {
            debug("⚠️ LỖI: Bác đang tự kết nối với chính mình!");
            return;
        }
        debug("🔗 Đang kết nối tới: " + targetId);
        console.log("Attempting connection to:", targetId);
        
        // Tăng timeout lên 30 giây theo yêu cầu của bác
        const connectionTimeout = setTimeout(() => {
            if (!STATE.isConnected) {
                debug("⏳ LỖI: Kết nối quá lâu (30s Timeout).");
                debug("👉 Bác kiểm tra xem Laptop đã nhấn 'BẮT ĐẦU' chưa?");
            }
        }, 30000);

        const conn = STATE.peer.connect(targetId);
        
        conn.on('open', () => {
            clearTimeout(connectionTimeout);
            debug("🟢 Kết nối THÀNH CÔNG!");
            console.log("Connection opened!");
            STATE.isConnected = true; 
            STATE.screen = 'game'; 
            STATE.lastTime = performance.now();
            if (specWarning) {
                specWarning.innerHTML = `🔴 ĐANG XEM TRỰC TIẾP... <button onclick="location.reload()" style="background:#444; color:white; border:none; padding:2px 10px; border-radius:15px; cursor:pointer; margin-left:10px; font-family:inherit; font-weight:bold; font-size:11px">🔄 TẢI LẠI</button>`;
            }
            document.getElementById('ui-layer').style.display = 'block';
            requestAnimationFrame(loop);
        });

        conn.on('error', (err) => {
            debug("❌ LỖI KẾT NỐI: " + err.type);
            console.error("Connection error:", err);
        });

        conn.on('close', () => {
            debug("🔌 KẾT NỐI ĐÃ ĐÓNG");
            STATE.isConnected = false;
        });

        conn.on('data', (data) => {
            if (data.type === 'WORLD_INIT') {
                console.log("Received world data!");
                STATE.loot = data.loot;
                STATE.barrels = data.barrels;
                STATE.pads = data.pads;
                STATE.obstacles = data.obstacles;
            }
            if (data.type === 'STATE_UPDATE') {
                const p = STATE.player;
                if (p && data.player) {
                    p.pos = data.player.pos;
                    STATE.camera.rot = data.player.rot;
                    p.hp = data.player.hp;
                    p.kills = data.player.kills;
                    p.weaponIdx = data.player.weaponIdx;
                    updateHUD(); 
                }
                // ĐỒNG BỘ BOT CHO KHÁN GIẢ
                if (data.bots) {
                    STATE.bots = data.bots.map(b => ({
                        pos: b.p,
                        hp: b.h,
                        state: b.s,
                        id: b.i
                    }));
                }
                // ĐỒNG BỘ BOSS CHO KHÁN GIẢ
                if (data.boss) {
                    if (!STATE.boss) STATE.boss = { active: true };
                    STATE.boss.pos = data.boss.p;
                    STATE.boss.hp = data.boss.h;
                    STATE.boss.phase = data.boss.ph;
                } else {
                    STATE.boss = null;
                }
                if (data.action === 'shoot') {
                    playAudio('shoot');
                    const weapon = STATE.weapons[p.weaponIdx];
                    fireWeapon(p, STATE.camera.rot, weapon, true);
                }
            }
            if (data.type === 'GAME_OVER') {
                alert("Trận đấu đã kết thúc!");
                location.reload();
            }
        });

        conn.on('error', (err) => {
            console.error("Connection error:", err);
            if (specWarning) specWarning.innerHTML = `❌ LỖI KẾT NỐI... <button onclick="location.reload()" style="background:#ff3366; color:white; border:none; padding:2px 10px; border-radius:15px; cursor:pointer; margin-left:10px; font-family:inherit; font-weight:bold; font-size:11px">🔄 TẢI LẠI</button>`;
        });
    };

    if (STATE.peer && STATE.peer.open) {
        connectToPlayer();
    } else {
        initPeer();
        STATE.peer.on('open', connectToPlayer);
        STATE.peer.on('error', (err) => {
            console.error("Peer error:", err);
            if (specWarning) specWarning.innerText = "❌ LỖI PEER: " + err.type;
        });
    }
}

function sendStateToSpectators(action = null) {
    if (STATE.spectatorConns.length === 0) return;

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

// Initialize Peer for the host when game starts
const originalStartGame = startGame;
window.startGame = function () {
    originalStartGame();
    initPeer();
};

// Check for spectator URL parameter - ĐÃ GỘP VÀO EVENT LOAD Ở ĐẦU FILE
/*
window.addEventListener('load', () => {
    ...
});
*/

// Throttled sync in loop
let lastSyncTime = 0;
const originalLoop = loop;
window.loop = function (now) {
    originalLoop(now);

    if (STATE.screen === 'game' && !window.SPECTATOR_MODE) {
        if (now - lastSyncTime > 100) { // Sync every 100ms
            sendStateToSpectators();
            lastSyncTime = now;
        }
    }
};

// Override fireWeapon to sync shooting action
const originalFireWeapon = fireWeapon;
window.fireWeapon = function (shooter, rot, weapon, isPlayer, dirOverride) {
    originalFireWeapon(shooter, rot, weapon, isPlayer, dirOverride);
    if (isPlayer && !window.SPECTATOR_MODE) {
        sendStateToSpectators('shoot');
    }
};

