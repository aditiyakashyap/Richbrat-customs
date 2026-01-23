// --- 1. FIREBASE SETUP ---
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
const storage = firebase.storage();

// --- 2. CONFIGURATION ---
// UPDATED URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxKWST3IhiMjYIS6hLfBQhOdftghIZr9lvrU5rZZWu7uaOnDfhAhPPUnTxnmAbI33wgdg/exec";

// --- 3. UI & MODAL CONTROL ---
let authMode = 'login';
window.openModal = (mode) => { authMode = mode; updateModalUI(); document.getElementById('auth-modal').style.display = 'flex'; }
window.closeModal = () => document.getElementById('auth-modal').style.display = 'none';
window.switchMode = () => { authMode = authMode === 'login' ? 'register' : 'login'; updateModalUI(); }

function updateModalUI() {
    document.getElementById('modal-title').innerText = authMode === 'register' ? "NEW CLIENT REGISTRATION" : "CLIENT LOGIN";
    document.getElementById('submit-btn').innerText = authMode === 'register' ? "CREATE ACCOUNT" : "ACCESS ACCOUNT";
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
                    // LOGGED IN
                    this.uid = user.uid;
                    this.loadProfile(user.uid);
                    document.getElementById('nav-actions').style.display = 'none';
                    document.getElementById('user-actions').style.display = 'flex';
                    
                    if(document.getElementById('view-landing').classList.contains('active')) {
                        this.navTo('view-dashboard');
                    }
                } else {
                    // GUEST
                    this.uid = null;
                    this.loadGuestProfile();
                    document.getElementById('nav-actions').style.display = 'flex';
                    document.getElementById('user-actions').style.display = 'none';
                }
            });
        }, 1000);
    }

    enterGarage() { this.navTo('view-dashboard'); }
    goHome() { this.navTo('view-dashboard'); }

    navTo(id) {
        window.scrollTo(0,0);
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        
        // Reset consultancy form UI
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
        // Clear all form fields
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
            document.getElementById('nav-username').innerText = data.name.split(' ')[0].toUpperCase();
            
            // Auto-fill booking form
            document.getElementById('b_name').value = data.name; 
            document.getElementById('b_phone').value = data.phone; 
            document.getElementById('b_car').value = data.car;

            // Auto-fill consultancy form
            document.getElementById('c_name').value = data.name; 
            document.getElementById('c_phone').value = data.phone || "";
            document.getElementById('c_email').value = data.email || "";
            document.getElementById('c_car').value = data.car;
            
            // Auto-fill PROFILE page
            document.getElementById('p_name').value = data.name;
            document.getElementById('p_phone').value = data.phone || "";
            document.getElementById('p_car').value = data.car || "";

            // Render Order History (ON PROFILE PAGE ONLY)
            const historyList = document.getElementById('order-history-list');
            historyList.innerHTML = "";
            
            if (data.orders && data.orders.length > 0) {
                data.orders.reverse().forEach(order => {
                    historyList.innerHTML += `
                        <div class="order-row">
                            <div>
                                <div style="color:#fff; font-weight:bold;">${order.date}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted);">${order.items.length} items • Total: $${order.total}</div>
                            </div>
                            <div class="badge">${order.status || 'PENDING'}</div>
                        </div>
                    `;
                });
            } else {
                historyList.innerHTML = '<p style="color:var(--text-muted);">No modification history found.</p>';
            }
        }
    }
    
    // --- NEW: UPDATE PROFILE ---
    async updateProfile(e) {
        e.preventDefault();
        const btn = document.getElementById('updateProfileBtn');
        btn.innerText = "SAVING..."; btn.disabled = true;
        
        try {
            await db.collection("users").doc(this.uid).update({
                phone: document.getElementById('p_phone').value,
                car: document.getElementById('p_car').value
            });
            alert("Profile Updated Successfully");
            btn.innerText = "SAVE CHANGES"; btn.disabled = false;
            // Reload to update global vars
            this.loadProfile(this.uid);
        } catch(error) {
            alert("Error updating profile: " + error.message);
            btn.innerText = "SAVE CHANGES"; btn.disabled = false;
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
                    <h3 style="font-family:var(--text-display); margin-bottom:5px;">${p.name}</h3>
                    <p style="color:var(--gold); margin-bottom:15px; font-weight:bold;">$${p.price}</p>
                    <button class="btn-luxury btn-outline" style="width:100%; padding:10px; font-size:0.75rem;" onclick="app.addToCart('${p.name}', ${p.price})">ADD TO BAG</button>
                </div>`;
            });
        } catch(e) { loader.innerText = "Unable to load catalogue."; }
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

        if (this.cart.length === 0) { list.innerHTML = "<p style='color:var(--text-muted); text-align:center;'>Your bag is empty.</p>"; }
        
        this.cart.forEach((item, index) => {
            total += Number(item.price);
            list.innerHTML += `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>$${item.price} <i class="fa-solid fa-trash" style="color:#AA8C2C; cursor:pointer; margin-left:10px;" onclick="app.removeFromCart(${index})"></i></span>
            </div>`;
        });

        document.getElementById('cart-total').innerText = `$${total}`;
        document.getElementById('chk-total').innerText = total;
    }

    removeFromCart(index) { this.cart.splice(index, 1); this.renderCart(); }
    toggleCart() { document.getElementById('cart-panel').classList.toggle('open'); }

    openCheckout() {
        if (this.cart.length === 0) { alert("Bag is empty!"); return; }
        
        if (!this.uid) {
            alert("Please login to proceed.");
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
            this.saveOrderToDatabase("Cash on Delivery", "PENDING_CONFIRMATION");
            return;
        }

        const options = {
            key: "rzp_test_S78l8FsaqvBc3n",
            amount: totalAmount * 100,
            currency: "INR",
            name: "RichBrat$ Customs",
            description: "Modifications Parts",
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
            status: "PROCESSING",
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
            
            // Redirect to Profile to show order
            alert("Order placed successfully!");
            this.loadProfile(this.uid);
            this.navTo('view-profile');
        } catch (error) { alert("Database Error: " + error.message); }
    }

    async checkSlots() {
        const date = document.getElementById('b_date').value;
        const sel = document.getElementById('b_time');
        const btn = document.getElementById('bookBtn');
        sel.innerHTML = "<option>CHECKING AVAILABILITY...</option>"; sel.disabled = true; btn.disabled = true;

        try {
            const res = await fetch(`${SCRIPT_URL}?action=checkSlots&date=${date}`);
            const taken = await res.json();
            const hours = ["10:00","11:00","12:00","13:00","14:00","15:00","16:00"];
            const avail = hours.filter(h => !taken.includes(h));
            sel.innerHTML = "";
            if(avail.length === 0) { sel.innerHTML = "<option>NO SLOTS AVAILABLE</option>"; }
            else { avail.forEach(h => sel.innerHTML += `<option value="${h}">${h}</option>`); sel.disabled = false; btn.disabled = false; }
        } catch(e) { sel.innerHTML = "<option>ERROR</option>"; }
    }

    async bookSlot(e) {
        e.preventDefault();

        if (!this.uid) {
            alert("Please login to book an appointment.");
            window.openModal('login');
            return;
        }

        const btn = document.getElementById('bookBtn');
        const stat = document.getElementById('booking-status');
        btn.innerText = "RESERVING...";
        const fd = new FormData();
        fd.append('date', document.getElementById('b_date').value); fd.append('time', document.getElementById('b_time').value);
        fd.append('name', document.getElementById('b_name').value); fd.append('phone', document.getElementById('b_phone').value); fd.append('car', document.getElementById('b_car').value);

        try {
            await fetch(SCRIPT_URL, {method:'POST', body:fd});
            stat.innerText = "CONFIRMED";
            document.getElementById('bookingForm').reset();
            setTimeout(() => { this.goHome(); stat.innerText=""; btn.innerText="CONFIRM APPOINTMENT"; }, 2000);
        } catch(e) { stat.innerText = "FAILED"; }
    }

    async submitConsultation(e) {
        e.preventDefault();
        
        if (!this.uid) {
             alert("Please login to submit an inquiry.");
             window.openModal('login');
             return;
        }

        const btn = document.getElementById('consultBtn');
        const formContainer = document.getElementById('consultancy-form-container');
        const successContainer = document.getElementById('consultancy-success');
        
        btn.innerText = "UPLOADING...";
        btn.disabled = true;

        const fileInput = document.getElementById('c_image');
        const file = fileInput.files[0];
        
        if (!file) {
            alert("Please select a reference image.");
            btn.innerText = "SUBMIT INQUIRY";
            btn.disabled = false;
            return;
        }

        try {
            // 1. Upload
            const storageRef = storage.ref(`consultations/${this.uid}_${Date.now()}_${file.name}`);
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            // 2. Submit to Sheet
            const fd = new FormData();
            fd.append('action', 'consultationRequest');
            fd.append('name', document.getElementById('c_name').value);
            fd.append('phone', document.getElementById('c_phone').value);
            fd.append('email', document.getElementById('c_email').value);
            fd.append('car', document.getElementById('c_car').value);
            fd.append('desired_look', document.getElementById('c_message').value);
            fd.append('image_url', downloadURL);

            await fetch(SCRIPT_URL, {method:'POST', body:fd});

            // 3. Success
            formContainer.style.display = 'none';
            successContainer.style.display = 'block';
            
            // Reset
            document.getElementById('c_image').value = ""; 
            document.getElementById('c_message').value = "";
            btn.innerText = "SUBMIT INQUIRY";
            btn.disabled = false;

        } catch (error) {
            console.error(error);
            alert("Submission failed. Please try again.");
            btn.innerText = "SUBMIT INQUIRY";
            btn.disabled = false;
        }
    }
}

window.app = new App();
