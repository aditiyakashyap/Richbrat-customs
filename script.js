// --- CONFIGURATION ---
const SCRIPT_URL = "PASTE_YOUR_GOOGLE_SCRIPT_URL_HERE"; // <--- PASTE HERE
const SHOP_HOURS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

class App {
    constructor() {
        this.initCursor();
    }

    // --- NAVIGATION ---
    nav(id) {
        document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }
    goHome() { this.nav('home'); }

    // --- 1. DYNAMIC STORE LOGIC ---
    async loadStore() {
        this.nav('store');
        const container = document.getElementById('product-list');
        const loader = document.getElementById('loading-store');
        
        container.innerHTML = "";
        loader.style.display = 'block';

        try {
            // Fetch JSON from Google Sheet
            const res = await fetch(`${SCRIPT_URL}?action=getInventory`);
            const products = await res.json();
            
            loader.style.display = 'none';
            
            if(products.length === 0) {
                container.innerHTML = "<p>OUT OF STOCK</p>";
                return;
            }

            // Create Cards for each product
            products.forEach(p => {
                const card = document.createElement('div');
                card.className = 'store-card';
                card.innerHTML = `
                    <div class="prod-img" style="background-image:url('${p.image}')"></div>
                    <h3>${p.name}</h3>
                    <p class="desc">${p.desc}</p>
                    <div class="price">$${p.price}</div>
                    <button class="cyber-btn" onclick="app.buy('${p.name}')">BUY NOW</button>
                `;
                container.appendChild(card);
            });
        } catch (err) {
            console.error(err);
            loader.innerText = "DATABASE CONNECTION FAILED";
        }
    }

    buy(itemName) {
        // Direct WhatsApp Purchase Link
        window.open(`https://wa.me/919999999999?text=I want to buy: ${itemName}`, '_blank');
    }

    // --- 2. BOOKING LOGIC ---
    async checkSlots() {
        const date = document.getElementById('dateInput').value;
        const select = document.getElementById('timeInput');
        const btn = document.getElementById('bookBtn');
        
        select.innerHTML = "<option>SCANNING...</option>";
        select.disabled = true;
        btn.disabled = true;

        const res = await fetch(`${SCRIPT_URL}?action=checkSlots&date=${date}`);
        const taken = await res.json();

        // Filter available slots
        const available = SHOP_HOURS.filter(slot => !taken.includes(slot));
        
        select.innerHTML = "";
        if(available.length === 0) {
            select.innerHTML = "<option>FULL</option>";
        } else {
            available.forEach(t => {
                let opt = document.createElement('option');
                opt.value = t; opt.text = t;
                select.add(opt);
            });
            select.disabled = false;
            btn.disabled = false;
        }
    }

    async bookSlot(e) {
        e.preventDefault();
        const btn = document.getElementById('bookBtn');
        const status = document.getElementById('booking-status');
        
        btn.innerText = "PROCESSING...";
        btn.disabled = true;

        const formData = new FormData();
        formData.append('date', document.getElementById('dateInput').value);
        formData.append('time', document.getElementById('timeInput').value);
        formData.append('name', document.getElementById('b_name').value);
        formData.append('phone', document.getElementById('b_phone').value);
        formData.append('car', document.getElementById('b_car').value);

        try {
            await fetch(SCRIPT_URL, { method: 'POST', body: formData });
            status.innerText = "CONFIRMED. ID GENERATED.";
            status.style.color = "#d4af37";
            document.getElementById('bookingForm').reset();
            setTimeout(() => { this.goHome(); status.innerText = ""; btn.innerText="CONFIRM"; }, 3000);
        } catch(err) {
            status.innerText = "ERROR.";
            btn.disabled = false;
        }
    }
    
    // --- UTILS ---
    initCursor() {
        const c = document.getElementById('cursor');
        document.addEventListener('mousemove', e => {
            c.style.left=e.clientX+'px'; c.style.top=e.clientY+'px';
        });
    }
}

const app = new App();
