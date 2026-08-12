# 📖 Setup & Usage Instructions

This application is a standalone, offline-capable web tool. It does not require a backend database (like SQL or MongoDB) because it intelligently uses your browser's local memory (`localStorage`).

## 🚀 How to Run Locally (PC / Mac)
Since everything runs in the browser, you can start using the system immediately:
1. Double-click the `qr-system.html` file to open it in Chrome, Edge, or Safari.
2. The system will load, and you can immediately start adding products and generating QR codes.

## 📱 How to Run on Mobile Devices (With Camera Scanning)
Mobile browsers block camera access on basic local network IPs for security reasons. To use the built-in QR scanner on your phone, the application must be served over a secure **HTTPS** connection or via **localhost**.

### Method 1: Using LocalTunnel (Recommended for Local Testing)
If you want to host it from your computer and scan with your phone over Wi-Fi:
1. Open your terminal/command prompt in this folder.
2. Start a simple web server:
   ```bash
   python -m http.server 8000
   ```
3. Open a **new terminal window** and run LocalTunnel to create a secure HTTPS link:
   ```bash
   npx localtunnel --port 8000
   ```
4. Open the `https://...loca.lt` link provided by LocalTunnel on your mobile phone. Your camera will now work!

### Method 2: Free Cloud Hosting (Recommended for Production)
For permanent usage without needing your PC on:
1. Go to [Netlify Drop](https://app.netlify.com/drop) or [Vercel](https://vercel.com).
2. Drag and drop this repository folder into the upload box.
3. You will instantly get a free, secure `https://` link you can bookmark on your phone and staff devices.

---

## 🛠️ User Workflow Guide

### 1. Admin Panel (Product Management)
- Switch to the **Admin** tab.
- **Add Product:** Fill in the product details. The system automatically calculates the Net Price based on the discount.
- **Save & Generate:** Clicking save stores the product in your browser and automatically generates a QR code.
- **Print Labels:** Use the "Print QR Label" button to trigger a special print layout designed for sticker/label printers.

### 2. Staff Panel (Checkout System)
- Switch to the **Staff** tab.
- **Start Scanner:** Click "Start Camera". Grant camera permissions when asked.
- **Scan:** Point the camera at a printed QR label. The system will instantly detect the product ID and load its details.
- *(Alternatively, use the Manual Lookup box if the camera is unavailable).*
- **Adjust Quantity:** Use the `+` / `-` buttons to adjust how many items the customer is buying.
- **Add to Bill:** Adds the item to the current receipt and updates the total.
- **Print Bill:** Generates a clean, thermal-printer friendly receipt layout.
