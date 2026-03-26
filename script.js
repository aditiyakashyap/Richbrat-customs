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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// --- 2. UI & MODAL CONTROL ---
let authMode = 'login';
window.openModal = (mode) => { 
    authMode = mode; 
    updateModalUI(); 
    document.getElementById('auth-modal').style.display = 'flex'; 
}
window.closeModal = () => document.getElementById('auth-modal').style.display = 'none';
window.switchMode = () => { 
    authMode = authMode === 'login' ? 'register' : 'login'; 
    updateModalUI(); 
}

function updateModalUI() {
    document.getElementById('modal-title').innerText = authMode === 'register' ? "NEW PILOT REGISTRY" : "SECURE LOGIN";
    document.getElementById('submit-btn').innerText = authMode === 'register' ? "INITIALIZE" : "ACCESS";
    document.getElementById('reg-name').style.display = authMode === 'register' ? 'block' : 'none';
    document.getElementById('extra-fields').style.display = authMode === 'register' ? 'block' : 'none';
}

// --- 3. MASTER APP LOGIC ---
class App {
    constructor() {
        this.cart = [];
        this.uid = null;
        this.inventory = [];
        
        // Contact Numbers
        this.callNumber = "8527746844";
        this.whatsappNumber = "8920503933";
        
        window.onload = () => {
            const loader = document.getElementById('global-loader');
            if(loader) {
                setTimeout(() => {
                    loader.style.opacity = '0';
                    setTimeout(() => loader.style.display = 'none', 500);
                }, 1000);
            }
        };

        // Auth Listener
        setTimeout(() => {
            auth.onAuthStateChanged(user => {
                if (user) {
                    this.uid = user.uid;
                    document.getElementById('nav-actions').style.display = 'none';
                    document.getElementById('user-actions').style.display = 'flex';
                } else {
                    this.uid = null;
                    document.getElementById('nav-actions').style.display = 'flex';
                    document.getElementById('user-actions').style.display = 'none';
                }
            });
        }, 1000);
    }

    // --- CONTACT LOGIC ---
    callUs() {
        window.location.href = `tel:${this.callNumber}`;
    }

    whatsappUs(subject) {
        const msg = encodeURIComponent(`Hi RichBrat$, I'm interested in: ${subject}`);
        window.open(`https://wa.me/${this.whatsappNumber}?text=${msg}`, '_blank');
    }

    // --- ANIMATION TRIGGER ---
    triggerDragRace(callback) {
        const overlay = document.getElementById('drag-run-overlay');
        overlay.style.display = 'block';
        overlay.classList.add('animate-drag');

        setTimeout(() => {
            if (callback) callback();
        }, 1200);

        setTimeout(() => {
            overlay.classList.remove('animate-drag');
            overlay.style.display = 'none';
        }, 2000);
    }

    // --- NAVIGATION ---
    toggleNav() {
        document.getElementById('nav-center').classList.toggle('nav-open');
    }

    navTo(id) {
        window.scrollTo(0,0);
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if(target) target.classList.add('active');
        
        // Ensure mobile menu closes on click
        document.getElementById('nav-center').classList.remove('nav-open');
    }

    goHome() { this.navTo('view-landing'); }
    logout() { auth.signOut(); this.navTo('view-landing'); }

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
                    email: email,
                    orders: []
                });
            } else {
                await auth.signInWithEmailAndPassword(email, password);
            }
            this.triggerDragRace(() => {
                window.closeModal();
                this.navTo('view-store');
            });
        } catch (error) { alert("Access Denied: " + error.message); }
    }

    // --- STORE (E-COMMERCE) ---
    async loadStore() {
        this.navTo('view-store');
        const loader = document.getElementById('loading-store');
        
        if(this.inventory.length > 0) {
            this.renderShop(); 
            return; 
        }

        loader.style.display = 'block';

        try {
            const snapshot = await db.collection("inventory").get();
            let items = [];
            snapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() });
            });
            
            loader.style.display = 'none';

            if(items.length === 0) {
                items = [
                    { name: "Carbon Fiber Steering", price: 450, image: "logo.PNG" },
                    { name: "Akrapovic Exhaust Tips", price: 200, image: "logo.PNG" },
                    { name: "Ambient Light Kit", price: 150, image: "logo.PNG" }
                ];
            }

            this.inventory = items;
            this.renderShop();
        } catch(e) { 
            loader.innerText = "Error loading inventory. Check Firebase connection."; 
        }
    }

    renderShop() {
        const list = document.getElementById('product-list');
        const searchInput = document.getElementById('shop-search').value.toLowerCase();
        const maxPrice = parseFloat(document.getElementById('shop-filter-price').value);
        const sortMode = document.getElementById('shop-sort').value;

        let filtered = this.inventory.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchInput);
            const matchesPrice = parseFloat(p.price) <= maxPrice;
            return matchesSearch && matchesPrice;
        });

        if (sortMode === 'price-low') {
            filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        } else if (sortMode === 'price-high') {
            filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        } else if (sortMode === 'name-asc') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        }

        list.innerHTML = "";
        if (filtered.length === 0) {
            list.innerHTML = "<p style='color:#666; text-align:center; width:100%;'>No matching parts found.</p>";
            return;
        }

        filtered.forEach(p => {
            list.innerHTML += `
            <div class="product-item">
                <div class="prod-img" style="background-image:url('${p.image || 'logo.PNG'}')"></div>
                <div class="prod-title">${p.name}</div>
                <div class="prod-price">$${p.price}</div>
                <button class="btn-luxury" style="width:100%; font-size:0.8rem; padding:10px;" onclick="app.addToCart('${p.name}', ${p.price})">ADD TO BAG</button>
            </div>`;
        });
    }

    // --- CART LOGIC ---
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
        if (this.cart.length === 0) { list.innerHTML = "Bag is empty."; }
        this.cart.forEach((item, index) => {
            total += Number(item.price);
            list.innerHTML += `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>$${item.price} <i class="fa-solid fa-trash" style="color:var(--gold); cursor:pointer; margin-left:10px;" onclick="app.removeFromCart(${index})"></i></span>
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
            alert("Please login to checkout.");
            this.toggleCart();
            window.openModal('login'); 
            return; 
        }
        this.toggleCart();
        document.getElementById('checkout-modal').style.display = 'flex';
    }

    // --- CHECKOUT LOGIC ---
    async processCheckout(e) {
        e.preventDefault();
        const btn = document.getElementById('chk-btn');
        const paymentMethod = document.getElementById('chk-payment').value;
        const totalAmount = parseFloat(document.getElementById('chk-total').innerText);
        
        btn.innerText = "PROCESSING..."; btn.disabled = true;

        const orderData = {
            userId: this.uid,
            date: new Date().toLocaleDateString(),
            timestamp: Date.now(),
            items: this.cart,
            total: totalAmount,
            status: "PROCESSING",
            address: document.getElementById('chk-address').value,
            city: document.getElementById('chk-city').value,
            zip: document.getElementById('chk-zip').value,
            payment_method: paymentMethod
        };

        if (paymentMethod === "COD") {
            await this.saveOrderToDatabase(orderData);
            return;
        }

        // Razorpay logic
        const options = {
            key: "rzp_test_S78l8FsaqvBc3n",
            amount: totalAmount * 100,
            currency: "INR",
            name: "RichBrat$ Customs",
            description: "Modifications",
            image: "logo.PNG", 
            handler: (response) => {
                orderData.transaction_id = response.razorpay_payment_id;
                this.saveOrderToDatabase(orderData);
            },
            theme: { color: "#D4AF37" }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response){
            alert("Payment Failed: " + response.error.description);
            btn.innerText = "PAY NOW"; btn.disabled = false;
        });
        rzp.open();
    }

    async saveOrderToDatabase(orderData) {
        try {
            await db.collection("orders").add(orderData);
            await db.collection("users").doc(this.uid).update({
                orders: firebase.firestore.FieldValue.arrayUnion(orderData)
            });
            
            this.triggerDragRace(() => {
                this.cart = []; this.renderCart();
                document.getElementById('checkout-modal').style.display = 'none';
                document.getElementById('chk-btn').innerText = "PAY NOW"; 
                document.getElementById('chk-btn').disabled = false;
                alert("Order Placed Successfully!");
                this.goHome();
            });

        } catch (error) { 
            alert(error.message); 
            document.getElementById('chk-btn').innerText = "PAY NOW"; 
            document.getElementById('chk-btn').disabled = false;
        }
    }

    // --- APPOINTMENTS (Schedule the Change) ---
    async bookAppointment(e) {
        e.preventDefault();
        
        const data = {
            name: document.getElementById('s_name').value,
            email: document.getElementById('s_email').value,
            phone: document.getElementById('s_phone').value,
            car: document.getElementById('s_car').value,
            date: document.getElementById('s_date').value,
            modType: document.getElementById('s_mod_type').value,
            hasParts: document.querySelector('input[name="has_parts"]:checked').value,
            details: document.getElementById('s_details').value,
            timestamp: Date.now(),
            status: 'Pending'
        };

        try {
            await db.collection("appointments").add(data);
            this.triggerDragRace(() => {
                document.getElementById('scheduleForm').reset();
                alert("Appointment Requested! Our team will contact you shortly to confirm timing.");
                this.goHome();
            });
        } catch(error) {
            alert("Failed to book appointment. Please try again.");
        }
    }

    // --- CONSULTATION QUERIES ---
    async submitConsultation(e) {
        e.preventDefault();

        const data = {
            name: document.getElementById('c_name').value,
            car: document.getElementById('c_car').value,
            query: document.getElementById('c_query').value,
            timestamp: Date.now(),
            status: 'Unread'
        };

        try {
            await db.collection("queries").add(data);
            this.triggerDragRace(() => {
                document.getElementById('c_name').value = '';
                document.getElementById('c_car').value = '';
                document.getElementById('c_query').value = '';
                alert("Query received! We will be in touch soon.");
                this.goHome();
            });
        } catch(error) {
            alert("Failed to submit query.");
        }
    }
}

// Start App
window.app = new App();
