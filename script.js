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
const storage = firebase.storage(); // Initialize Storage

// --- 2. CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxKWST3IhiMjYIS6hLfBQhOdftghIZr9lvrU5rZZWu7uaOnDfhAhPPUnTxnmAbI33wgdg/exec";
// emailjs.init("9-7GR7Lab7wUNI5sH"); // Removed EmailJS as it's no longer used

// --- 3. UI & MODAL CONTROL (Global Scope for HTML Buttons) ---
let authMode = 'login';
window.openModal = (mode) => { authMode = mode; updateModalUI(); document.getElementById('auth-modal').style.display = 'flex'; }
window.closeModal = () => document.getElementById('auth-modal').style.display = 'none';
window.switchMode = () => { authMode = authMode === 'login' ? 'register' : 'login'; updateModalUI(); }

function updateModalUI() {
    document.getElementById('modal-title').innerText = authMode === 'register' ? "CREATE ACCOUNT" : "LOGIN";
    document.getElementById('submit-btn').innerText = authMode === 'register' ? "SIGN UP" : "LOGIN";
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
                    // LOGGED IN USER
                    this.uid = user.uid;
                    this.loadProfile(user.uid);
                    document.getElementById('nav-actions').style.display = 'none';
                    document.getElementById('user-actions').style.display = 'flex';
                    
                    if(document.getElementById('view-landing').classList.contains('active')) {
                        this.navTo('view-dashboard');
                    }
                } else {
                    // GUEST USER
                    this.uid = null;
                    this.loadGuestProfile();
                    document.getElementById('nav-actions').style.display = 'flex';
                    document.getElementById('user-actions').style.display = 'none';
                }
            });
        }, 1000);
    }

    enterGarage() {
        this.navTo('view-dashboard');
    }

    goHome() { 
        this.navTo('view-dashboard'); 
    }

    navTo(id) {
        window.scrollTo(0,0);
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        
        // Reset consultancy form UI if navigating away and back
        if(id === 'view-consultancy') {
             document.getElementById('consultancy-form-container').style.display = 'block';
             document.getElementById('consultancy-success').style.display = 'none';
        }
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

    loadGuestProfile() {
        document.getElementById('dash-name').innerText = "GUEST";
        document.getElementById('dash-car').innerText = "Not Connected";
        document.getElementById('order-history-list').innerText = "Login to view your history.";
        
        // Clear forms
        document.getElementById('b_name').value = ""; 
        document.getElementById('b_phone').value = ""; 
        document.getElementById('b_car').value = "";
        document.getElementById('c_name').value = "";
        document.getElementById('c_phone').value = "";
        document.getElementById('c_email').value = "";
        document.getElementById('c_car').value = "";
    }

    async loadProfile(uid) {
        const docSnap = await db.collection("users").doc(uid).get();
        if (docSnap.exists) {
            const data = docSnap.data();
            document.getElementById('dash-name').innerText = data.name.toUpperCase();
            document.getElementById('nav-username').innerText = data.name.split(' ')[0].toUpperCase();
            document.getElementById('dash-car').innerText = data.car || "Not Set";
            
            // Auto-fill booking form
            document.getElementById('b_name').value = data.name; document.getElementById('b_phone').value = data.phone; document.getElementById('b_car').value = data.car;

            // Auto-fill consultancy form
            document.getElementById('c_name').value = data.name; 
            document.getElementById('c_phone').value = data.phone || "";
            document.getElementById('c_email').value = data.email || "";
            document.getElementById('c_car').value = data.car;
            
            // Render Order History
            if (data.orders && data.orders.length > 0) {
                const historyList = document.getElementById('order-history-list');
                historyList.innerHTML = "";
                data.orders.reverse().forEach(order => {
                    historyList.innerHTML += `
                        <div style="border-bottom:1px solid #333; padding: 10px 0;">
                            <span style="color:#fff;">${order.date}</span> - $${order.total} (${order.items.length} items) - <span class="gold-text">[${order.status}]</span>
                            <br><span style="font-size:0.75rem;">Transaction ID: ${order.transaction_id || 'COD'}</span>
                        </div>
                    `;
                });
            } else {
                document.getElementById('order-history-list').innerText = "No orders yet.";
            }
        }
    }

    logout() { 
        auth.signOut();
        this.navTo('view-landing'); 
    }

    // --- E-COMMERCE LOGIC ---
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

            if(data.length === 0) { list.innerHTML = "<p>OUT OF STOCK</p>"; return; }

            list.innerHTML = "";
            data.forEach(p => {
                list.innerHTML += `
                <div class="product-item">
                    <div class="prod-img" style="background-image:url('${p.image}')"></div>
                    <h3 style="font-family:var(--text-display);">${p.name}</h3>
                    <p style="color:var(--gold); margin: 10px 0;">$${p.price}</p>
                    <button class="btn-luxury" style="padding:10px; font-size:0.8rem;" onclick="app.addToCart('${p.name}', ${p.price})"><i class="fa-solid fa-cart-plus"></i> ADD TO CART</button>
                </div>`;
            });
        } catch(e) { loader.innerText = "Error loading products."; }
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

        if (this.cart.length === 0) { list.innerHTML = "<p style='color:#8892b0; text-align:center;'>Your cart is empty.</p>"; }
        
        this.cart.forEach((item, index) => {
            total += Number(item.price);
            list.innerHTML += `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>$${item.price} <i class="fa-solid fa-trash" style="color:#ff6b6b; cursor:pointer; margin-left:10px;" onclick="app.removeFromCart(${index})"></i></span>
            </div>`;
        });

        document.getElementById('cart-total').innerText = `$${total}`;
        document.getElementById('chk-total').innerText = total;
    }

    removeFromCart(index) { this.cart.splice(index, 1); this.renderCart(); }
    toggleCart() { document.getElementById('cart-panel').classList.toggle('open'); }

    openCheckout() {
        if (this.cart.length === 0) { alert("Cart is empty!"); return; }
        
        if (!this.uid) {
            alert("Please login to complete your purchase.");
            this.toggleCart(); 
            window.openModal('login');
            return;
        }

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
            this.saveOrderToDatabase("Cash on Delivery", "PENDING_PAYMENT");
            return;
        }

        const options = {
            key: "rzp_test_S78l8FsaqvBc3n",
            amount: totalAmount * 100,
            currency: "INR",
            name: "RichBrat$ Customs",
            description: "Car Parts Purchase",
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
            theme: { color: "#ffcc00" }
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
            status: "PREPARING",
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

        if (!this.uid) {
            alert("Please login to confirm your booking.");
            window.openModal('login');
            return;
        }

        const btn = document.getElementById('bookBtn');
        const stat = document.getElementById('booking-status');
        btn.innerText = "BOOKING...";
        const fd = new FormData();
        fd.append('date', document.getElementById('b_date').value); fd.append('time', document.getElementById('b_time').value);
        fd.append('name', document.getElementById('b_name').value); fd.append('phone', document.getElementById('b_phone').value); fd.append('car', document.getElementById('b_car').value);

        try {
            await fetch(SCRIPT_URL, {method:'POST', body:fd});
            stat.innerText = "CONFIRMED!"; stat.style.color = "#ffcc00";
            document.getElementById('bookingForm').reset();
            setTimeout(() => { this.goHome(); stat.innerText=""; btn.innerText="CONFIRM BOOKING"; }, 2000);
        } catch(e) { stat.innerText = "FAILED"; }
    }

    // --- NEW: MODS CONSULTANCY LOGIC ---
    async submitConsultation(e) {
        e.preventDefault();
        
        // Optional: Require login for consultancy
        if (!this.uid) {
             alert("Please login to submit a consultancy request.");
             window.openModal('login');
             return;
        }

        const btn = document.getElementById('consultBtn');
        const formContainer = document.getElementById('consultancy-form-container');
        const successContainer = document.getElementById('consultancy-success');
        
        btn.innerText = "UPLOADING & SUBMITTING...";
        btn.disabled = true;

        const fileInput = document.getElementById('c_image');
        const file = fileInput.files[0];
        
        if (!file) {
            alert("Please select an image of your car.");
            btn.innerText = "SUBMIT REQUEST";
            btn.disabled = false;
            return;
        }

        try {
            // 1. Upload Image to Firebase Storage
            // Create a unique file name
            const storageRef = storage.ref(`consultations/${this.uid}_${Date.now()}_${file.name}`);
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            // 2. Prepare data for Google Sheet
            const fd = new FormData();
            fd.append('action', 'consultationRequest'); // New action type for Apps Script
            fd.append('name', document.getElementById('c_name').value);
            fd.append('phone', document.getElementById('c_phone').value);
            fd.append('email', document.getElementById('c_email').value);
            fd.append('car', document.getElementById('c_car').value);
            fd.append('desired_look', document.getElementById('c_message').value);
            fd.append('image_url', downloadURL);

            // 3. Send to Google Sheet Script
            // NOTE: Your Google Apps Script MUST handle the 'consultationRequest' action.
            await fetch(SCRIPT_URL, {method:'POST', body:fd});

            // 4. Show Success UI
            formContainer.style.display = 'none';
            successContainer.style.display = 'block';
            
            // Reset form for next time
            document.getElementById('c_image').value = ""; 
            document.getElementById('c_message').value = "";
            btn.innerText = "SUBMIT REQUEST";
            btn.disabled = false;

        } catch (error) {
            console.error("Consultation Submission Error:", error);
            alert("Failed to submit request. Please try again.");
            btn.innerText = "SUBMIT REQUEST";
            btn.disabled = false;
        }
    }
}

window.app = new App();
