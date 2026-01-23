// --- 1. FIREBASE SETUP ---
const firebaseConfig = {
    apiKey: "AIzaSyDoU-ixQiMmjEofIAK_sQe729PZ86jseDY",
    authDomain: "richbart-customs.firebaseapp.com",
    projectId: "richbart-customs",
    storageBucket: "richbart-customs.firebasestorage.app",
    messagingSenderId: "717900685166",
    appId: "1:717900685166:web:095f2354c75917907c6b7f"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// --- 2. CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxKWST3IhiMjYIS6hLfBQhOdftghIZr9lvrU5rZZWu7uaOnDfhAhPPUnTxnmAbI33wgdg/exec";

// --- 3. UI HELPER ---
let authMode = 'login';
window.openModal = (mode) => { authMode = mode; updateModalUI(); document.getElementById('auth-modal').style.display = 'flex'; }
window.closeModal = () => document.getElementById('auth-modal').style.display = 'none';
window.switchMode = () => { authMode = authMode === 'login' ? 'register' : 'login'; updateModalUI(); }

function updateModalUI() {
    document.getElementById('modal-title').innerText = authMode === 'register' ? "NEW PILOT REGISTRY" : "SECURE LOGIN";
    document.getElementById('submit-btn').innerText = authMode === 'register' ? "INITIALIZE" : "ACCESS";
    document.getElementById('reg-name').style.display = authMode === 'register' ? 'block' : 'none';
    document.getElementById('extra-fields').style.display = authMode === 'register' ? 'block' : 'none';
}

// --- 4. APP LOGIC ---
class App {
    constructor() {
        this.cart = [];
        this.uid = null;
        
        setTimeout(() => {
            auth.onAuthStateChanged(user => {
                if (user) {
                    this.uid = user.uid;
                    this.loadProfile(user.uid);
                    document.getElementById('nav-actions').style.display = 'none';
                    document.getElementById('user-actions').style.display = 'flex';
                    if(document.getElementById('view-landing').classList.contains('active')) {
                        this.navTo('view-dashboard');
                    }
                } else {
                    this.uid = null;
                    this.loadGuestProfile();
                    document.getElementById('nav-actions').style.display = 'flex';
                    document.getElementById('user-actions').style.display = 'none';
                }
            });
        }, 1000);
    }

    // --- NEW: HOLOGRAM DRAG RACE ANIMATION ---
    triggerDragRace(callback) {
        const overlay = document.getElementById('drag-run-overlay');
        overlay.style.display = 'block';
        overlay.classList.add('animate-drag');

        // Animation lasts 1.5s. Execute callback halfway through or after.
        setTimeout(() => {
            if (callback) callback();
        }, 1200);

        // Reset after animation ends
        setTimeout(() => {
            overlay.classList.remove('animate-drag');
            overlay.style.display = 'none';
        }, 1600);
    }

    enterGarage() { this.navTo('view-dashboard'); }
    goHome() { this.navTo('view-dashboard'); }

    navTo(id) {
        window.scrollTo(0,0);
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        if(id === 'view-consultancy') {
             document.getElementById('consultancy-form-container').style.display = 'block';
             document.getElementById('consultancy-success').style.display = 'none';
        }
    }

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
            // Trigger Animation on Success
            this.triggerDragRace(() => {
                window.closeModal();
            });
        } catch (error) { alert("Access Denied: " + error.message); }
    }

    loadGuestProfile() {
        document.getElementById('b_name').value = ""; 
        document.getElementById('b_phone').value = ""; 
        document.getElementById('b_car').value = "";
    }

    async loadProfile(uid) {
        const docSnap = await db.collection("users").doc(uid).get();
        if (docSnap.exists) {
            const data = docSnap.data();
            document.getElementById('nav-username').innerText = "MY GARAGE";
            document.getElementById('b_name').value = data.name; 
            document.getElementById('b_phone').value = data.phone; 
            document.getElementById('b_car').value = data.car;
            document.getElementById('c_name').value = data.name; 
            document.getElementById('c_phone').value = data.phone || "";
            document.getElementById('c_email').value = data.email || "";
            document.getElementById('c_car').value = data.car;
            document.getElementById('p_name').value = data.name;
            document.getElementById('p_phone').value = data.phone || "";
            document.getElementById('p_car').value = data.car || "";

            const historyList = document.getElementById('order-history-list');
            historyList.innerHTML = "";
            if (data.orders && data.orders.length > 0) {
                data.orders.reverse().forEach(order => {
                    historyList.innerHTML += `
                        <div style="padding:15px; border-bottom:1px solid #333; margin-bottom:10px;">
                            <div style="display:flex; justify-content:space-between; color:var(--gold);">
                                <span>${order.date}</span>
                                <span>$${order.total}</span>
                            </div>
                            <div style="color:var(--text-muted); font-size:0.8rem;">${order.status}</div>
                        </div>
                    `;
                });
            } else {
                historyList.innerHTML = '<p style="color:var(--text-muted);">No history.</p>';
            }
        }
    }
    
    async updateProfile(e) {
        e.preventDefault();
        const btn = document.getElementById('updateProfileBtn');
        btn.innerText = "UPDATING..."; btn.disabled = true;
        try {
            await db.collection("users").doc(this.uid).update({
                phone: document.getElementById('p_phone').value,
                car: document.getElementById('p_car').value
            });
            this.triggerDragRace(() => {
                btn.innerText = "UPDATE SPECS"; btn.disabled = false;
                this.loadProfile(this.uid);
            });
        } catch(error) { alert(error.message); btn.disabled = false; }
    }

    logout() { auth.signOut(); this.navTo('view-landing'); }

    async loadStore() {
        this.navTo('view-store');
        const list = document.getElementById('product-list');
        const loader = document.getElementById('loading-store');
        if(list.children.length > 0) return;
        loader.style.display = 'block';
        try {
            const res = await fetch(`${SCRIPT_URL}?action=getInventory`);
            const data = await res.json();
            loader.style.display = 'none';
            if(data.length === 0) { list.innerHTML = "<p>EMPTY</p>"; return; }
            data.forEach(p => {
                list.innerHTML += `
                <div class="product-item">
                    <div class="prod-img" style="background-image:url('${p.image}')"></div>
                    <h3 style="font-family:var(--text-display); color:#fff;">${p.name}</h3>
                    <p class="gold-text">$${p.price}</p>
                    <button class="btn-luxury btn-outline" style="width:100%; margin-top:10px;" onclick="app.addToCart('${p.name}', ${p.price})">ADD TO BAG</button>
                </div>`;
            });
        } catch(e) { loader.innerText = "Error."; }
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
        if (this.cart.length === 0) { list.innerHTML = "<p style='color:var(--text-muted); text-align:center;'>Empty.</p>"; }
        this.cart.forEach((item, index) => {
            total += Number(item.price);
            list.innerHTML += `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>$${item.price} <i class="fa-solid fa-trash" style="color:var(--gold); cursor:pointer;" onclick="app.removeFromCart(${index})"></i></span>
            </div>`;
        });
        document.getElementById('cart-total').innerText = `$${total}`;
        document.getElementById('chk-total').innerText = total;
    }

    removeFromCart(index) { this.cart.splice(index, 1); this.renderCart(); }
    toggleCart() { document.getElementById('cart-panel').classList.toggle('open'); }

    openCheckout() {
        if (this.cart.length === 0) { alert("Empty!"); return; }
        if (!this.uid) { window.openModal('login'); return; }
        this.toggleCart();
        document.getElementById('checkout-modal').style.display = 'flex';
    }

    async processCheckout(e) {
        e.preventDefault();
        const btn = document.getElementById('chk-btn');
        const paymentMethod = document.getElementById('chk-payment').value;
        const totalAmount = parseFloat(document.getElementById('chk-total').innerText);
        btn.innerText = "PROCESSING..."; btn.disabled = true;

        if (paymentMethod === "COD") {
            this.saveOrderToDatabase("Cash on Delivery", "PENDING");
            return;
        }

        const options = {
            key: "rzp_test_S78l8FsaqvBc3n",
            amount: totalAmount * 100,
            currency: "INR",
            name: "RichBrat$ Customs",
            description: "Parts",
            image: "logo.png",
            handler: (response) => {
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
            alert("Failed: " + response.error.description);
            btn.innerText = "AUTHORIZE"; btn.disabled = false;
        });
        rzp.open();
    }

    async saveOrderToDatabase(payMethod, transactionId) {
        const order = {
            date: new Date().toLocaleDateString(),
            items: this.cart,
            total: document.getElementById('chk-total').innerText,
            status: "PROCESSING",
            address: document.getElementById('chk-address').value,
            payment_method: payMethod,
            transaction_id: transactionId
        };

        try {
            await db.collection("users").doc(this.uid).update({
                orders: firebase.firestore.FieldValue.arrayUnion(order)
            });
            
            // Trigger Drag Race Animation
            this.triggerDragRace(() => {
                this.cart = []; this.renderCart();
                document.getElementById('checkout-modal').style.display = 'none';
                document.getElementById('chk-btn').innerText = "AUTHORIZE"; 
                document.getElementById('chk-btn').disabled = false;
                this.loadProfile(this.uid);
                this.navTo('view-profile');
            });

        } catch (error) { alert(error.message); }
    }

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
        if (!this.uid) { window.openModal('login'); return; }

        const btn = document.getElementById('bookBtn');
        btn.innerText = "RESERVING...";
        const fd = new FormData();
        fd.append('date', document.getElementById('b_date').value); fd.append('time', document.getElementById('b_time').value);
        fd.append('name', document.getElementById('b_name').value); fd.append('phone', document.getElementById('b_phone').value); fd.append('car', document.getElementById('b_car').value);

        try {
            await fetch(SCRIPT_URL, {method:'POST', body:fd});
            
            // Trigger Drag Race Animation
            this.triggerDragRace(() => {
                document.getElementById('bookingForm').reset();
                btn.innerText = "CONFIRM SLOT";
                this.goHome();
            });
        } catch(e) { alert("Failed"); }
    }

    async submitConsultation(e) {
        e.preventDefault();
        if (!this.uid) { window.openModal('login'); return; }

        const btn = document.getElementById('consultBtn');
        const formContainer = document.getElementById('consultancy-form-container');
        const successContainer = document.getElementById('consultancy-success');
        
        btn.innerText = "TRANSMITTING..."; btn.disabled = true;
        const file = document.getElementById('c_image').files[0];
        
        if (!file) { alert("Image required."); btn.innerText = "TRANSMIT"; btn.disabled = false; return; }

        try {
            const storageRef = storage.ref(`consultations/${this.uid}_${Date.now()}_${file.name}`);
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            const fd = new FormData();
            fd.append('action', 'consultationRequest');
            fd.append('name', document.getElementById('c_name').value);
            fd.append('phone', document.getElementById('c_phone').value);
            fd.append('email', document.getElementById('c_email').value);
            fd.append('car', document.getElementById('c_car').value);
            fd.append('desired_look', document.getElementById('c_message').value);
            fd.append('image_url', downloadURL);

            await fetch(SCRIPT_URL, {method:'POST', body:fd});

            // Trigger Drag Race Animation
            this.triggerDragRace(() => {
                formContainer.style.display = 'none';
                successContainer.style.display = 'block';
                document.getElementById('c_image').value = ""; 
                document.getElementById('c_message').value = "";
                btn.innerText = "TRANSMIT"; btn.disabled = false;
            });

        } catch (error) { alert("Failed"); btn.disabled = false; }
    }
}

window.app = new App();
