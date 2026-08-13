window.QRCodeReady.then(() => {
            (function () {
                // ---------- localStorage DB ----------
                const STORAGE_KEY = 'miniproducts';
                let products = [];
                let currentProductId = null;
                let billItems = [];
                let html5QrCode = null;
                let isScanning = false;

                // Load products from localStorage
                function loadProducts() {
                    try {
                        const data = localStorage.getItem(STORAGE_KEY);
                        if (data) {
                            products = JSON.parse(data);
                        } else {
                            products = [];
                        }
                    } catch (e) {
                        products = [];
                    }
                    return products;
                }

                // Save products to localStorage
                function saveProducts() {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
                }

                // Get next ID
                function getNextId() {
                    if (products.length === 0) return 1;
                    const maxId = Math.max(...products.map(p => p.id || 0));
                    return maxId + 1;
                }

                // ---------- helpers ----------
                function formatCurrency(val) {
                    return '₹' + Number(val).toFixed(2);
                }

                function getNet(price, discount) {
                    price = parseFloat(price) || 0;
                    discount = parseFloat(discount) || 0;
                    let net = price - (price * discount / 100);
                    return Math.round(net * 100) / 100;
                }

                // ---------- render product list ----------
                function renderProductList() {
                    const container = document.getElementById('productList');
                    const products = loadProducts();

                    if (products.length === 0) {
                        container.innerHTML = '<p style="color:#6b8aa5; padding:12px;">No products yet. Add one!</p>';
                        return;
                    }

                    let html = '';
                    const sorted = [...products].reverse();
                    sorted.forEach(p => {
                        html += `
                            <div class="product-item">
                                <div class="product-info">
                                    <span class="product-name">${p.name || 'Unnamed'}</span>
                                    <span class="product-meta">${p.company || ''} · ${formatCurrency(p.net)}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span class="badge">ID:${p.id}</span>
                                    <button class="delete-btn" data-id="${p.id}" title="Delete product"><i class="fas fa-times"></i></button>
                                </div>
                            </div>
                        `;
                    });
                    container.innerHTML = html;

                    container.querySelectorAll('.delete-btn').forEach(btn => {
                        btn.addEventListener('click', function () {
                            const id = parseInt(this.dataset.id);
                            if (confirm('Delete this product?')) {
                                deleteProduct(id);
                            }
                        });
                    });
                }

                // Delete product
                function deleteProduct(id) {
                    products = products.filter(p => p.id !== id);
                    saveProducts();
                    renderProductList();
                    if (currentProductId === id) {
                        document.getElementById('qrcode').innerHTML = '<span style="color:#8aa3bb; font-size:0.9rem;">Product deleted</span>';
                        document.getElementById('qrProductName').innerText = 'No product';
                        currentProductId = null;
                    }
                }

                // ---------- QR generation (mobile-friendly) ----------
                function generateQR(productId) {
                    const qrContainer = document.getElementById('qrcode');
                    qrContainer.innerHTML = '';

                    if (!productId) {
                        document.getElementById('qrProductName').innerText = 'No product selected';
                        return;
                    }

                    const products = loadProducts();
                    const product = products.find(p => p.id === productId);

                    if (!product) {
                        document.getElementById('qrProductName').innerText = 'Product not found';
                        return;
                    }

                    document.getElementById('qrProductName').innerText = product.name || 'Product';
                    const payload = 'PROD_' + productId;

                    // The QRCode library may still be loading on slow devices.
                    // We wait for the library to be available (window.QRCode) and retry once.
                    const tryGenerate = () => {
                        if (window.QRCode) {
                            new QRCode(qrContainer, {
                                text: payload,
                                width: 160,
                                height: 160,
                                colorDark: '#0f3b5e',
                                colorLight: '#ffffff',
                                correctLevel: QRCode.CorrectLevel.H
                            });
                            currentProductId = productId;
                        } else {
                            // Retry after a short delay (max 1 second)
                            setTimeout(tryGenerate, 200);
                        }
                    };
                    tryGenerate();
                }

                // ---------- handle product form ----------
                document.getElementById('productForm').addEventListener('submit', function (e) {
                    e.preventDefault();

                    const name = document.getElementById('pName').value.trim();
                    if (!name) {
                        alert('Product name is required');
                        return;
                    }

                    const company = document.getElementById('pCompany').value.trim();
                    const price = parseFloat(document.getElementById('pPrice').value) || 0;
                    const discount = parseFloat(document.getElementById('pDiscount').value) || 0;
                    const net = getNet(price, discount);
                    const mfg = document.getElementById('pMfg').value;
                    const exp = document.getElementById('pExp').value;

                    const fileInput = document.getElementById('pImage');
                    let imageData = '';

                    if (fileInput.files && fileInput.files[0]) {
                        const reader = new FileReader();
                        reader.onload = function (ev) {
                            imageData = ev.target.result;
                            saveProductToDB(name, company, price, discount, net, mfg, exp, imageData);
                        };
                        reader.readAsDataURL(fileInput.files[0]);
                    } else {
                        saveProductToDB(name, company, price, discount, net, mfg, exp, '');
                    }
                });

                function saveProductToDB(name, company, price, discount, net, mfg, exp, imageData) {
                    const products = loadProducts();
                    const newProduct = {
                        id: getNextId(),
                        name: name,
                        company: company || '',
                        price: price,
                        discount: discount,
                        net: net,
                        mfg: mfg || '',
                        exp: exp || '',
                        image: imageData || '',
                        createdAt: Date.now()
                    };

                    // Store the product first (without the image) to test quota.
                    const productCopy = { ...newProduct };
                    delete productCopy.image;   // Remove image temporarily
                    products.push(productCopy);
                    try {
                        saveProducts();   // May throw if quota exceeded
                    } catch (e) {
                        // If quota error, fall back to saving without the image.
                        console.warn('Image too large for localStorage – saving without it.');
                        // Save again without image data
                        productCopy.image = '';
                        products[products.length - 1] = productCopy;
                        saveProducts();
                    }

                    document.getElementById('pName').value = '';
                    document.getElementById('pCompany').value = '';
                    document.getElementById('pPrice').value = '';
                    document.getElementById('pDiscount').value = '';
                    document.getElementById('pMfg').value = '';
                    document.getElementById('pExp').value = '';
                    document.getElementById('pImage').value = '';
                    document.getElementById('imagePreview').innerHTML = '';
                    document.getElementById('pNet').value = '';

                    generateQR(newProduct.id);
                    renderProductList();

                    alert('✅ Product saved successfully! QR code generated.');
                }

                // Net price calculation
                function updateNetPrice() {
                    const price = parseFloat(document.getElementById('pPrice').value) || 0;
                    const discount = parseFloat(document.getElementById('pDiscount').value) || 0;
                    const net = getNet(price, discount);
                    document.getElementById('pNet').value = formatCurrency(net);
                }

                const priceEl = document.getElementById('pPrice');
                const discountEl = document.getElementById('pDiscount');
                // Mobile browsers sometimes fire only 'change' for numeric inputs.
                ['input', 'change', 'blur'].forEach(ev => {
                    priceEl.addEventListener(ev, updateNetPrice);
                    discountEl.addEventListener(ev, updateNetPrice);
                });

                // Image preview
                document.getElementById('pImage').addEventListener('change', function (e) {
                    const preview = document.getElementById('imagePreview');
                    preview.innerHTML = '';
                    if (this.files && this.files[0]) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                            const img = document.createElement('img');
                            img.src = ev.target.result;
                            img.className = 'image-preview';
                            preview.appendChild(img);
                        };
                        reader.readAsDataURL(this.files[0]);
                    }
                });

                // ---------- QR Code Scanner ----------
                function initializeScanner() {
                    const container = document.getElementById('scanner-container');
                    // If the page is not loaded via HTTPS or localhost, the camera API will be blocked.
                    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
                    if (!isSecure) {
                        container.innerHTML = '<div style="color:white; padding:20px; text-align:center;">⚠️ Camera access requires HTTPS or localhost. Open the page via a secure URL.</div>';
                        html5QrCode = null;
                        return;
                    }
                    container.innerHTML = '<div style="color:white; padding:20px; text-align:center;">Camera ready. Click "Start Camera" to scan.</div>';
                    html5QrCode = new Html5Qrcode("scanner-container");
                }

                function startScanner() {
                    if (isScanning) {
                        alert('Scanner is already running');
                        return;
                    }

                    const config = {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    };

                    html5QrCode.start({ facingMode: "environment" },
                        config,
                        onScanSuccess,
                        onScanError
                    ).then(() => {
                        isScanning = true;
                        document.getElementById('startScannerBtn').textContent = 'Scanning...';
                        document.getElementById('startScannerBtn').disabled = true;
                    }).catch(err => {
                        alert('Could not start camera. Please ensure camera permissions are granted.\nError: ' + err);
                        console.error(err);
                    });
                }

                function stopScanner() {
                    if (html5QrCode && isScanning) {
                        html5QrCode.stop().then(() => {
                            isScanning = false;
                            document.getElementById('startScannerBtn').textContent = 'Start Camera';
                            document.getElementById('startScannerBtn').disabled = false;
                        }).catch(err => {
                            console.error('Error stopping scanner:', err);
                        });
                    }
                }

                function onScanSuccess(decodedText, decodedResult) {
                    // Play beep sound
                    playScanBeep();
                    
                    // Stop scanning after successful scan
                    stopScanner();

                    // Process the scanned data
                    document.getElementById('scan-input').value = decodedText;

                    let id = decodedText;
                    if (decodedText.startsWith('PROD_')) {
                        id = decodedText.replace('PROD_', '');
                    }

                    const productId = parseInt(id);
                    if (!isNaN(productId)) {
                        lookupProduct(productId);
                    } else {
                        alert('Invalid QR code. Please scan a valid product QR.');
                    }
                }

                function onScanError(errorMessage) {
                    // Ignore errors - they happen continuously during scanning
                    // console.warn('Scan error:', errorMessage);
                }

                // ---------- Staff: lookup ----------
                document.getElementById('scanLookupBtn').addEventListener('click', function () {
                    const input = document.getElementById('scan-input').value.trim();
                    if (!input) {
                        alert('Enter product ID or scan data');
                        return;
                    }

                    let id = input;
                    if (input.startsWith('PROD_')) {
                        id = input.replace('PROD_', '');
                    }

                    const productId = parseInt(id);
                    if (isNaN(productId)) {
                        alert('Invalid product ID format');
                        return;
                    }

                    lookupProduct(productId);
                });

                document.getElementById('scan-input').addEventListener('keyup', function (e) {
                    if (e.key === 'Enter') {
                        document.getElementById('scanLookupBtn').click();
                    }
                });

                function lookupProduct(productId) {
                    const products = loadProducts();
                    const product = products.find(p => p.id === productId);
                    const resultDiv = document.getElementById('scan-result');
                    const infoDiv = document.getElementById('scannedProductInfo');

                    if (!product) {
                        resultDiv.classList.remove('hidden');
                        infoDiv.innerHTML = '<span style="color:#b00020;">❌ Product not found</span>';
                        resultDiv.dataset.productId = '';
                        resultDiv.dataset.netPrice = '';
                        return;
                    }

                    resultDiv.classList.remove('hidden');
                    infoDiv.innerHTML = `
                        <div style="font-weight:600; font-size:1.1rem;">${product.name}</div>
                        <div style="font-size:0.9rem; color:#2a5f7a;">${product.company || ''} · ${formatCurrency(product.net)}</div>
                        <div style="font-size:0.75rem; color:#4b6a85;">ID: ${product.id}</div>
                    `;

                    resultDiv.dataset.productId = product.id;
                    resultDiv.dataset.netPrice = product.net;
                    document.getElementById('qtyDisplay').innerText = '1';
                }

                // Qty controls
                document.getElementById('qtyDec').addEventListener('click', function () {
                    let q = parseInt(document.getElementById('qtyDisplay').innerText) || 1;
                    if (q > 1) q--;
                    document.getElementById('qtyDisplay').innerText = q;
                });

                document.getElementById('qtyInc').addEventListener('click', function () {
                    let q = parseInt(document.getElementById('qtyDisplay').innerText) || 1;
                    q++;
                    document.getElementById('qtyDisplay').innerText = q;
                });

                // ---------- Bill management ----------
                function renderBill() {
                    const container = document.getElementById('billItems');
                    if (billItems.length === 0) {
                        container.innerHTML = '<p style="color:#6b8aa5; padding:8px;">No items in bill.</p>';
                        document.getElementById('billTotal').innerHTML = 'Total: ₹0.00';
                        return;
                    }

                    const receiptNo = 'RCPT-' + Math.floor(Math.random() * 1000000);
                    const now = new Date();
                    const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

                    let html = `
                        <div class="print-only receipt-header" style="display:none;">
                            <h2 style="color:#0f3b5e;">Smart MiniStore</h2>
                            <p>Receipt No: ${receiptNo}</p>
                            <p>Date: ${dateStr}</p>
                            <hr style="border-top:1px dashed #ccc; margin:10px 0;">
                        </div>
                    `;

                    let subTotal = 0;
                    let totalDiscount = 0;
                    let finalTotal = 0;

                    billItems.forEach((item, index) => {
                        const originalPrice = parseFloat(item.price) || item.net; // fallback if price is missing
                        const originalLineTotal = item.qty * originalPrice;
                        const lineTotal = item.qty * item.net;
                        const lineDiscount = originalLineTotal - lineTotal;
                        
                        subTotal += originalLineTotal;
                        totalDiscount += lineDiscount;
                        finalTotal += lineTotal;
                        
                        html += `
                            <div class="bill-row" style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #eee;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="flex:1;"><strong>${item.name}</strong> <span style="color:#6b8aa5; font-size:0.9em; margin-left:5px;">(Qty: ${item.qty})</span></span>
                                    <span style="font-weight:600; margin-left:10px;">${formatCurrency(lineTotal)}</span>
                                </div>
                                ${lineDiscount > 0 ? `<div style="font-size:0.75rem; color:#27ae60; text-align:right;">Saved: ${formatCurrency(lineDiscount)}</div>` : ''}
                            </div>
                        `;
                    });

                    html += `
                        <div class="print-only receipt-footer" style="display:none;">
                            <hr style="border-top:1px dashed #ccc; margin:10px 0;">
                            <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
                                <span>Subtotal:</span>
                                <span>${formatCurrency(subTotal)}</span>
                            </div>
                            <div class="success-text" style="display:flex; justify-content:space-between; font-size:0.85rem; color:#27ae60;">
                                <span>Total Savings:</span>
                                <span>-${formatCurrency(totalDiscount)}</span>
                            </div>
                            <hr style="border-top:1px dashed #ccc; margin:10px 0;">
                        </div>
                    `;

                    container.innerHTML = html;
                    document.getElementById('billTotal').innerHTML = `
                        <div style="font-size:1.3rem; font-weight:bold; color:#0f3b5e;">Total: ${formatCurrency(finalTotal)}</div>
                        ${totalDiscount > 0 ? `<div style="font-size:0.85rem; color:#27ae60; margin-top:4px;">Total Savings: ${formatCurrency(totalDiscount)}</div>` : ''}
                    `;
                }

                document.getElementById('addToBillBtn').addEventListener('click', function () {
                    const resultDiv = document.getElementById('scan-result');
                    const productId = parseInt(resultDiv.dataset.productId);

                    if (!productId) {
                        alert('⚠️ Scan a product first');
                        return;
                    }

                    const net = parseFloat(resultDiv.dataset.netPrice) || 0;
                    const qty = parseInt(document.getElementById('qtyDisplay').innerText) || 1;

                    const products = loadProducts();
                    const product = products.find(p => p.id === productId);

                    if (!product) {
                        alert('Product not found');
                        return;
                    }

                    const existing = billItems.find(it => it.id === productId);
                    if (existing) {
                        existing.qty += qty;
                    } else {
                        billItems.push({
                            id: productId,
                            name: product.name,
                            price: product.price,
                            net: net,
                            qty: qty
                        });
                    }

                    renderBill();
                    document.getElementById('qtyDisplay').innerText = '1';
                    document.getElementById('scan-input').value = '';
                    document.getElementById('scan-result').classList.add('hidden');
                });

                document.getElementById('clearBillBtn').addEventListener('click', function () {
                    if (billItems.length === 0) return;
                    if (confirm('Clear current bill?')) {
                        billItems = [];
                        renderBill();
                    }
                });

                // Print bill
                document.getElementById('printBillBtn').addEventListener('click', function () {
                    if (billItems.length === 0) {
                        alert('Bill is empty');
                        return;
                    }
                    window.print();
                });

                // Print QR label
                document.getElementById('printQRBtn').addEventListener('click', function () {
                    const qrEl = document.getElementById('qrcode');
                    if (!qrEl || qrEl.children.length === 0 || !currentProductId) {
                        alert('Generate a QR code first');
                        return;
                    }

                    const products = loadProducts();
                    const product = products.find(p => p.id === currentProductId);
                    const productName = product ? product.name : 'Product';

                    const win = window.open('', '_blank');
                    if (!win) {
                        alert('Please allow popups for printing');
                        return;
                    }

                    win.document.write(`
                        <html><head><title>QR Label</title>
                        <style>
                            body { text-align:center; padding:30px; font-family:sans-serif; }
                            .qr-box { display:inline-block; padding:20px; border:1px solid #ccc; border-radius:20px; background:white; }
                            .label { margin-top:12px; font-weight:600; font-size:1.1rem; }
                        </style>
                        </head>
                        <body>
                        <div class="qr-box">
                            <div>${qrEl.innerHTML}</div>
                            <div class="label">${productName}</div>
                        </div>
                        <script>
                            window.onload = function() { 
                                window.print(); 
                                window.close(); 
                            }
                        <\/script>
                        </body></html>
                    `);
                    win.document.close();
                });

                // Refresh list
                document.getElementById('refreshList').addEventListener('click', renderProductList);

                // ---------- Tab switching ----------
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.addEventListener('click', function () {
                        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        const tab = this.dataset.tab;
                        document.getElementById('tab-admin').classList.toggle('hidden', tab !== 'admin');
                        document.getElementById('tab-staff').classList.toggle('hidden', tab !== 'staff');
                        if (tab === 'admin') {
                            renderProductList();
                            // Stop scanner if running
                            if (isScanning) stopScanner();
                        }
                        if (tab === 'staff') {
                            document.getElementById('scan-result').classList.add('hidden');
                            // Initialize scanner if not already
                            if (!html5QrCode) {
                                initializeScanner();
                            }
                        }
                    });
                });

                // ---------- Scanner controls ----------
                document.getElementById('startScannerBtn').addEventListener('click', function () {
                    if (!html5QrCode) {
                        initializeScanner();
                        setTimeout(() => startScanner(), 500);
                    } else {
                        startScanner();
                    }
                });

                document.getElementById('stopScannerBtn').addEventListener('click', function () {
                    stopScanner();
                });

                // ---------- init ----------
                function init() {
                    loadProducts();
                    renderProductList();

                    if (products.length > 0) {
                        const latest = products[products.length - 1];
                        generateQR(latest.id);
                    } else {
                        const qrContainer = document.getElementById('qrcode');
                        qrContainer.innerHTML = '<span style="color:#8aa3bb; font-size:0.9rem;">Add a product to generate QR</span>';
                        document.getElementById('qrProductName').innerText = 'No product';
                    }

                    // Initialize scanner
                    initializeScanner();
                }

                // ========== SERVICE WORKER REGISTRATION ==========
                if ('serviceWorker' in navigator) {
                    window.addEventListener('load', () => {
                        navigator.serviceWorker.register('./sw.js').catch(err => {
                            console.log('ServiceWorker registration failed: ', err);
                        });
                    });
                }

                // ========== SCANNER AUDIO BEEP ==========
                function playScanBeep() {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    
                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                    
                    osc.start();
                    osc.stop(ctx.currentTime + 0.1);
                }

                // ========== THEME MANAGEMENT ==========
                function initTheme() {
                    const savedTheme = localStorage.getItem('minisystem_theme') || 'light';
                    document.documentElement.setAttribute('data-theme', savedTheme);
                    updateThemeIcon(savedTheme);
                }

                function updateThemeIcon(theme) {
                    const icon = document.getElementById('themeIcon');
                    if(icon) {
                        if (theme === 'dark') {
                            icon.classList.remove('fa-moon');
                            icon.classList.add('fa-sun');
                        } else {
                            icon.classList.remove('fa-sun');
                            icon.classList.add('fa-moon');
                        }
                    }
                }

                document.getElementById('themeToggleBtn').addEventListener('click', () => {
                    const current = document.documentElement.getAttribute('data-theme');
                    const next = current === 'dark' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', next);
                    localStorage.setItem('minisystem_theme', next);
                    updateThemeIcon(next);
                });

                function init() {
                    initTheme();
                    loadAdminView();
                }
                
                init();

            })(); // end of IIFE
        }); // end of QRCodeReady.then