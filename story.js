// story.js — Cốt truyện "LOST ISLAND"
const STORY_LINES = [
    "Một bí mật cấm kỵ đã bị chôn giấu suốt nhiều thế hệ của dòng họ xưa.",
    "",
    "Ở thế hệ của bạn, mọi thứ xung quanh bắt đầu sụp đổ khi từng người biến mất một cách kỳ lạ.",
    "Người thân cận nhất bên bạn cũng dần xuất hiện những biểu hiện tương tự...",
    "",
    "Sau nhiều ngày quan sát những người bị nhiễm bệnh và mất tích, bạn bỗng tìm thấy một tờ giấy.",
    "Đó là manh mối duy nhất dẫn đường đến một vùng hoang đảo bị lãng quên.",
    "Bạn tin rằng, có thể nơi đó ẩn chứa sự thật nguồn gốc về căn bệnh này.",
    "",
    "Nhưng khi vừa tiếp cận thứ nhìn như một CÁNH CỬA ĐỎ RỰC đó, tại sao nó lại có ở đây?...",
    "tôi nghĩ mình không còn nhiều thời gian nữa và đã bước vào cánh cửa",
    "Trời đất đột nhiên tối sầm lại. Bạn hoàn toàn mất đi ý thức.",
    "",
    "Khi tỉnh lại... bạn bỗng thấy mình đang rơi tự do từ trên cao xuống.",
    "Nhưng kỳ lạ thay, cú va chạm mạnh ấy lại không hề làm bạn bị thương tổn gì.",
    "",
    "Nhìn xung quanh, vùng căn cứ hoang vu này phủ đầy vết tích của những trận chiến khốc liệt từng diễn ra.",
    "Máu me, súng đạn, xác chết và vô số thứ vũ khí khác nằm rải rác khắp mọi nơi.",
    "",
    "Bạn tự nhủ: Phải chăng ta đã kẹt trong vòng lặp thời gian vô tận này từ trước?",
    "",
    "Nhiệm vụ của bạn:",
    "Thu thập đủ các HỘP THÔNG TIN bí ẩn tùy theo độ khó để giải mã sự thật.",

    "Tiêu diệt sinh vật đột biến và tìm cách sống sót bằng mọi giá.",
    "",
    "Hãy nhớ... chiếc hộp rực đỏ cuối cùng nằm trong tay Kẻ Gác Cổng.",
    "Những HỘP THÔNG TIN sẽ xuất hiện nhìu hơn tùy vào từng chế độ hãy thử thách bản thân để giải mã thêm nhìu thông tin hơn NẾU NGƯƠI ĐỦ MẠNH ĐỂ LÀM ĐIỀU ĐÓ HAHAHA!!"
];

window.startStory = function () {
    if (window.logToDiscord) {
        window.logToDiscord(`📖 **${window.STATE?.playerName || 'Người chơi vô danh'}** vừa bấm VÀO TRÒ CHƠI và đang xem cốt truyện.`);
    }

    const splashScreen = document.getElementById('splash-screen');
    const storyScreen = document.getElementById('story-screen');
    const storyContainer = document.getElementById('story-text-container');
    const btnSkip = document.getElementById('btn-skip-story');

    if (splashScreen) {
        splashScreen.style.opacity = '0';
        setTimeout(() => splashScreen.style.display = 'none', 800);
    }

    storyScreen.classList.remove('hidden');
    storyScreen.style.opacity = '1';

    let currentLine = 0;
    let isSkipped = false;
    let typeTimeout = null;

    function endStory() {
        if (isSkipped) return;
        isSkipped = true;
        storyScreen.style.opacity = '0';
        setTimeout(() => {
            storyScreen.classList.add('hidden');
            storyContainer.innerHTML = '';
        }, 1500);
        const chillTheme = document.getElementById('chill-theme-sound');
        if (chillTheme) {
            chillTheme.volume = 0.45;
            chillTheme.play().catch(() => { });
        }
    }

    btnSkip.onclick = () => { 
        if (window.logToDiscord) {
            window.logToDiscord(`⏭️ **${window.STATE?.playerName || 'Người chơi vô danh'}** đã bấm SKIP bỏ qua cốt truyện.`);
        }
        clearTimeout(typeTimeout); 
        endStory(); 
    };

    // Tốc độ mặc định (Chậm để đọc trên mobile)
    let charSpeed = 45;
    let lineSpeed = 2200;

    // Đè vào màn hình để tua nhanh
    const speedUp = () => { charSpeed = 10; lineSpeed = 400; };
    const slowDown = () => { charSpeed = 45; lineSpeed = 2200; };

    storyScreen.addEventListener('mousedown', speedUp);
    storyScreen.addEventListener('touchstart', speedUp);
    storyScreen.addEventListener('mouseup', slowDown);
    storyScreen.addEventListener('mouseleave', slowDown);
    storyScreen.addEventListener('touchend', slowDown);
    storyScreen.addEventListener('touchcancel', slowDown);

    function typeLine() {
        if (isSkipped) return;
        if (currentLine >= STORY_LINES.length) {
            typeTimeout = setTimeout(endStory, 2500);
            return;
        }

        const lineText = STORY_LINES[currentLine];
        const p = document.createElement('p');
        p.className = 'story-paragraph';
        storyContainer.appendChild(p);
        storyContainer.scrollTo({ top: storyContainer.scrollHeight, behavior: 'smooth' });

        let charIndex = 0;
        function typeChar() {
            if (isSkipped) return;
            if (charIndex < lineText.length) {
                p.textContent += lineText.charAt(charIndex);
                charIndex++;
                typeTimeout = setTimeout(typeChar, lineText === '' ? 0 : charSpeed);
            } else {
                currentLine++;
                typeTimeout = setTimeout(typeLine, lineText === '' ? 300 : lineSpeed);
            }
        }
        typeChar();
    }

    setTimeout(typeLine, 1000);
};
