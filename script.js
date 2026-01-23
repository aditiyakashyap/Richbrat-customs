// --- 1. FIREBASE SETUP (Using Compat for Vanilla JS) ---
const firebaseConfig = {
    apiKey: "AIzaSyDoU-ixQiMmjEofIAK_sQe729PZ86jseDY",
    authDomain: "richbart-customs.firebaseapp.com",
    projectId: "richbart-customs",
    storageBucket: "richbart-customs.firebasestorage.app",
    messagingSenderId: "717900685166",
    appId: "1:717900685166:web:095f2354c75917907c6b7f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- 2. CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxPKr6-zQ3fGQITAm5qBpKeCGrnWTHsWMeiw7Hsl9liaNcI4tdLRD6U94jpKCMN6Ru7KQ/exec";
emailjs.init("9-7GR7Lab7wUNI5sH");

// --- 3. UI & MODAL CONTROL (Global Scope for HTML Buttons) ---
let authMode = 'login';
window.openModal = (mode) => { authMode = mode; updateModalUI(); document.getElementById('auth-modal').style.display = 'flex'; }
window.closeModal = () => document.getElementById('auth-modal').style.display = 'none';
window.switchMode = () => { authMode = authMode === 'login' ? 'register' : 'login'; updateModalUI(); }

function updateModalUI() {
    document.getElementById('modal-title').innerText = authMode === 'register' ? "DRIVER REGISTRATION" : "LOGIN";
    document.getElementById('submit-btn').innerText = authMode === 'register' ? "REGISTER" : "ENTER";
    document.getElementById('reg-name').style.display = authMode === 'register' ? 'block' : 'none';
    document.getElementById('extra-fields').style.display = authMode === 'register' ? 'block' : 'none';
}

// --- 4. MASTER APP LOGIC ---
class App {
    constructor() {
        this.cart = [];
        this.uid = null;
        
        // Auth Listener
        setTimeout(() => {
            auth.onAuthStateChanged(user => {
                if (user) {
                    this.uid = user.uid;
                    this.loadProfile(user.uid);
                    document.getElementById('nav-actions').style.display = 'none';
                    document.getElementById('user-actions').style.display = 'flex';
                    this.navTo('view-dashboard');
                } else {
                    document.getElementById('nav-actions').style.display = 'flex';
                    document.getElementById('user-actions').style.display = 'none';
                    this.navTo('view-landing');
                }
            });
        }, 1000);
    }

    goHome() { if (auth.currentUser) this.navTo('view-dashboard'); else this.navTo('view-landing'); }

    navTo(id) {
        window.scrollTo(0,0);
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    // --- AUTHENTICATION ---
    async handleAuth(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            if (authMode === 'register') {
                const cred = await auth.createUserWithEmailAndPassword(email, password);
                await db.collection("users").doc(cred.user.uid).set({
                    name: document.getElementById('reg-name').value,
                    phone: document.getElementById('reg-phone').value,
                    car: document.getElementById('reg-car').value,
                    insta: document.getElementById('reg-insta').value,
                    email: email,
                    orders: []
                });
            } else {
                await auth.signInWithEmailAndPassword(email, password);
            }
            window.closeModal();
        } catch (error) { alert("Access Denied: " + error.message); }
    }

    async loadProfile(uid) {
        const docSnap = await db.collection("users").doc(uid).get();
        if (docSnap.exists) {
            const data = docSnap.data();
            document.getElementById('dash-name').innerText = data.name.toUpperCase();
            document.getElementById('nav-username').innerText = data.name.split(' ')[0].toUpperCase();
            document.getElementById('dash-car').innerText = data.car || "NOT SET";
            
            // Auto-fill forms
            document.getElementById('c_name').value = data.name; document.getElementById('c_car').value = data.car;
            document.getElementById('b_name').value = data.name; document.getElementById('b_phone').value = data.phone; document.getElementById('b_car').value = data.car;
            
            // Render Order History
            if (data.orders && data.orders.length > 0) {
                const historyList = document.getElementById('order-history-list');
                historyList.innerHTML = "";
                data.orders.reverse().forEach(order => {
                    historyList.innerHTML += `
                        <div style="border-bottom:1px solid #333; padding: 10px 0;">
                            <span style="color:#fff;">${order.date}</span> - $${order.total} (${order.items.length} items) - <span class="gold-text">[${order.status}]</span>
                            <br><span style="font-size:0.75rem;">Payment ID: ${order.transaction_id || 'COD'}</span>
                        </div>
                    `;
                });
            }
        }
    }

    logout() { auth.signOut(); }

    // --- E-COMMERCE LOGIC ---
    async loadStore() {
        this.navTo('view-store');
        const list = document.getElementById('product-list');
        const loader = document.getElementById('loading-store');
        list.innerHTML = ""; loader.style.display = 'block';

        try {
            const res = await fetch(`${SCRIPT_URL}?action=getInventory`);
            const data = await res.json();
            loader.style.display = 'none';

            if(data.length === 0) { list.innerHTML = "<p>OUT OF STOCK</p>"; return; }

            data.forEach(p => {
                list.innerHTML += `
                <div class="product-item">
                    <div class="prod-img" style="background-image:url('${p.image}')"></div>
                    <h3 style="font-family:var(--text-display);">${p.name}</h3>
                    <p style="color:var(--gold); margin: 10px 0;">$${p.price}</p>
                    <button class="btn-luxury" style="padding:10px; font-size:0.8rem;" onclick="app.addToCart('${p.name}', ${p.price})"><i class="fa-solid fa-cart-plus"></i> ADD TO BAG</button>
                </div>`;
            });
        } catch(e) { loader.innerText = "DATA ERROR"; }
    }

    addToCart(name, price) {
        this.cart.push({name, price});
        this.renderCart();
        document.getElementById('cart-panel').classList.add('open');
    }

    renderCart() {
        document.getElementById('cart-count').innerText = this.cart.length;
        const list = document.getElementById('cart-items-list');
        list.innerHTML = "";
        let total = 0;

        if (this.cart.length === 0) { list.innerHTML = "<p style='color:#666; text-align:center;'>Your cart is empty.</p>"; }
        
        this.cart.forEach((item, index) => {
            total += Number(item.price);
            list.innerHTML += `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>$${item.price} <i class="fa-solid fa-trash" style="color:red; cursor:pointer; margin-left:10px;" onclick="app.removeFromCart(${index})"></i></span>
            </div>`;
        });

        document.getElementById('cart-total').innerText = `$${total}`;
        document.getElementById('chk-total').innerText = total;
    }

    removeFromCart(index) { this.cart.splice(index, 1); this.renderCart(); }
    toggleCart() { document.getElementById('cart-panel').classList.toggle('open'); }

    openCheckout() {
        if (this.cart.length === 0) { alert("Cart is empty!"); return; }
        this.toggleCart();
        document.getElementById('checkout-modal').style.display = 'flex';
    }

    // --- RAZORPAY PAYMENT ---
    async processCheckout(e) {
        e.preventDefault();
        const btn = document.getElementById('chk-btn');
        const paymentMethod = document.getElementById('chk-payment').value;
        const totalAmount = parseFloat(document.getElementById('chk-total').innerText);

        btn.innerText = "PROCESSING..."; btn.disabled = true;

        if (paymentMethod === "COD") {
            this.saveOrderToDatabase("Cash on Delivery", "PENDING_PAYMENT");
            return;
        }

        const options = {
            key: "rzp_test_S78l8FsaqvBc3n",
            amount: totalAmount * 100,
            currency: "INR",
            name: "RichBrat$ Customs",
            description: "Performance Parts Transaction",
            image: "logo.png",
            
            handler: (response) => {
                alert("PAYMENT SUCCESSFUL! Payment ID: " + response.razorpay_payment_id);
                this.saveOrderToDatabase("Online Paid", response.razorpay_payment_id);
            },
            prefill: {
                name: document.getElementById('c_name').value,
                email: auth.currentUser.email,
                contact: document.getElementById('b_phone').value || ""
            },
            theme: { color: "#D4AF37" }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response){
            alert("Payment Failed: " + response.error.description);
            btn.innerText = "PAY SECURELY"; btn.disabled = false;
        });
        rzp.open();
    }

    async saveOrderToDatabase(payMethod, transactionId) {
        const btn = document.getElementById('chk-btn');
        const order = {
            date: new Date().toLocaleDateString(),
            items: this.cart,
            total: document.getElementById('chk-total').innerText,
            status: "PREPARING SHIPMENT",
            address: document.getElementById('chk-address').value + ", " + document.getElementById('chk-city').value + " - " + document.getElementById('chk-zip').value,
            payment_method: payMethod,
            transaction_id: transactionId
        };

        try {
            await db.collection("users").doc(this.uid).update({
                orders: firebase.firestore.FieldValue.arrayUnion(order)
            });

            this.cart = []; this.renderCart();
            document.getElementById('checkout-modal').style.display = 'none';
            btn.innerText = "PAY SECURELY"; btn.disabled = false;
            this.loadProfile(this.uid);
            this.navTo('view-dashboard');
        } catch (error) { alert("Database Error: " + error.message); }
    }

    // --- BOOKING LOGIC ---
    async checkSlots() {
        const date = document.getElementById('b_date').value;
        const sel = document.getElementById('b_time');
        const btn = document.getElementById('bookBtn');
        sel.innerHTML = "<option>SCANNING...</option>"; sel.disabled = true; btn.disabled = true;

        try {
            const res = await fetch(`${SCRIPT_URL}?action=checkSlots&date=${date}`);
            const taken = await res.json();
            const hours = ["10:00","11:00","12:00","13:00","14:00","15:00","16:00"];
            const avail = hours.filter(h => !taken.includes(h));
            sel.innerHTML = "";
            if(avail.length === 0) { sel.innerHTML = "<option>FULL</option>"; }
            else { avail.forEach(h => sel.innerHTML += `<option value="${h}">${h}</option>`); sel.disabled = false; btn.disabled = false; }
        } catch(e) { sel.innerHTML = "<option>ERROR</option>"; }
    }

    async bookSlot(e) {
        e.preventDefault();
        const btn = document.getElementById('bookBtn');
        const stat = document.getElementById('booking-status');
        btn.innerText = "BOOKING...";
        const fd = new FormData();
        fd.append('date', document.getElementById('b_date').value); fd.append('time', document.getElementById('b_time').value);
        fd.append('name', document.getElementById('b_name').value); fd.append('phone', document.getElementById('b_phone').value); fd.append('car', document.getElementById('b_car').value);

        try {
            await fetch(SCRIPT_URL, {method:'POST', body:fd});
            stat.innerText = "CONFIRMED!"; stat.style.color = "#d4af37";
            document.getElementById('bookingForm').reset();
            setTimeout(() => { this.goHome(); stat.innerText=""; btn.innerText="CONFIRM VIP SLOT"; }, 2000);
        } catch(e) { stat.innerText = "FAILED"; }
    }

    // --- EMAIL LOGIC ---
    sendMail(e) {
        e.preventDefault();
        const btn = document.getElementById('mailBtn'); const status = document.getElementById('mailStatus');
        btn.innerText = "SENDING...";
        const params = { from_name: document.getElementById('c_name').value, car_model: document.getElementById('c_car').value, message: document.getElementById('c_message').value };

        emailjs.send("service_ilkre51", "template_hu62u55", params)
        .then(() => { status.innerText = "SENT TO EXPERT!"; status.style.color = "#d4af37"; btn.innerText = "SEND SPECS"; })
        .catch(() => { status.innerText = "ERROR!"; status.style.color = "red"; btn.innerText = "RETRY"; });
    }
}

// Make App globally available to HTML buttons
window.app = new App();
