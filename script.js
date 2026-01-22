/* --- RICHBRAT$ SYSTEM CORE --- */

const CONFIG = {
    emailKey: "9-7GR7Lab7wUNI5sH",
    serviceId: "service_ilkre51",
    templateId: "template_hu62u55"
};

class App {
    constructor() {
        this.initEmail();
        this.initCursor();
        this.initCanvas();
        this.soundEnabled = true;
        this.currentLang = 'en';
        
        // Dictionary
        this.langData = {
            en: { store: "STORE", booking: "BOOKING", consult: "CONSULT", project_brief: "PROJECT BRIEF", name: "PILOT NAME", car_model: "VEHICLE ID", details: "PARAMETERS" },
            hi: { store: "स्टोर", booking: "बुकिंग", consult: "सलाह", project_brief: "प्रोजेक्ट विवरण", name: "आपका नाम", car_model: "गाड़ी का मॉडल", details: "विवरण" }
        };
    }

    // --- 1. INITIALIZATION ---
    initEmail() {
        emailjs.init(CONFIG.emailKey);
    }

    initCursor() {
        const cursor = document.getElementById('cursor');
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
        // Hover effects for all interactive elements
        document.querySelectorAll('button, a, input, textarea, .holo-card').forEach(el => {
            el.addEventListener('mouseenter', () => { 
                cursor.classList.add('hover-active'); 
                this.playSfx('hover');
            });
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover-active'));
        });
    }

    initCanvas() {
        const cvs = document.getElementById('matrix-canvas');
        const ctx = cvs.getContext('2d');
        cvs.width = window.innerWidth; cvs.height = window.innerHeight;
        
        const drops = [];
        for(let i=0; i<100; i++) drops.push({x: Math.random()*cvs.width, y: Math.random()*cvs.height, s: Math.random()*2+1});

        function animate() {
            ctx.clearRect(0,0,cvs.width,cvs.height);
            ctx.fillStyle = '#d4af37';
            drops.forEach(d => {
                d.y += d.s;
                if(d.y > cvs.height) d.y = 0;
                ctx.fillRect(d.x, d.y, 2, 2);
            });
            requestAnimationFrame(animate);
        }
        animate();
    }

    // --- 2. NAVIGATION ---
    nav(pageId) {
        this.playSfx('click');
        document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    }

    goHome() {
        this.nav('home');
    }

    // --- 3. AUDIO SYSTEM (Synthesizer) ---
    playSfx(type) {
        if(!this.soundEnabled) return;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        if(type === 'hover') {
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.02, ctx.currentTime);
        } else if (type === 'click') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
        }
        
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        document.getElementById('sound-btn').innerText = this.soundEnabled ? "MUTE" : "UNMUTE";
    }

    // --- 4. UTILITIES ---
    toggleLang() {
        this.currentLang = this.currentLang === 'en' ? 'hi' : 'en';
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.innerText = this.langData[this.currentLang][el.getAttribute('data-i18n')];
        });
    }

    toggleVoice() {
        if(!('webkitSpeechRecognition' in window)) { alert("Use Chrome for Voice."); return; }
        const recognition = new webkitSpeechRecognition();
        const icon = document.querySelector('.mic-icon');
        icon.classList.add('listening');
        recognition.start();
        
        recognition.onresult = (e) => {
            document.getElementById('u_message').value += e.results[0][0].transcript + " ";
            icon.classList.remove('listening');
        };
    }

    sendMail() {
        const btn = document.querySelector('.full-width');
        const status = document.getElementById('status-log');
        btn.innerText = "TRANSMITTING...";
        
        const params = {
            from_name: document.getElementById('u_name').value,
            reply_to: document.getElementById('u_email').value,
            car_model: document.getElementById('u_car').value,
            message: document.getElementById('u_message').value
        };

        emailjs.send(CONFIG.serviceId, CONFIG.templateId, params)
        .then(() => {
            status.innerText = "> UPLOAD SUCCESSFUL";
            status.style.color = "#00f3ff";
            btn.innerText = "DONE";
        })
        .catch(() => {
            status.innerText = "> CONNECTION FAILED";
            status.style.color = "red";
            btn.innerText = "RETRY";
        });
    }
}

// Start System
const app = new App();
