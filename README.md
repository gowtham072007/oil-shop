# 🪔 Sri Lakshmi Traditional Oil Mill — E-Commerce Website with WhatsApp Billing

An authentic, responsive e-commerce web application designed for a traditional Indian retail oil shop (Cold-Pressed / Mara Chekku wood-pressed oils) featuring real-time catalog browsing, pack size variants, cart management, PIN-protected admin portal, and **official WhatsApp Click-to-Chat Billing integration**.

---

## 🌟 Key Features

### 1. Traditional Indian Heritage Design
- **Color Palette**: Deep temple emerald green (`#09331d`, `#124e2c`), royal gold/brass (`#d4af37`, `#c69222`), and warm ivory/cream (`#fbf8f1`).
- **Typography**: Google Fonts **Cinzel** (traditional Indian heritage serif) and **Plus Jakarta Sans** (clean modern UI readability).
- **Hero Banner**: Commercial culinary product photography featuring cold-pressed oils in glass bottles with brass lamps and raw ingredients.
- **Trust Badges**: Vaagai Mara Chekku, 100% Unrefined & Unbleached, Natural Antioxidants, and FSSAI Certified Purity.
- **Fully Responsive**: Optimized for mobile phones, tablets, and desktop computers.

### 2. Product Catalog & Pack Size Selector
- Product Cards with high-resolution imagery, brand identity, Tamil/regional names, extraction type, and real-time stock badges.
- **Pack Size Selector**: Choose between **500 ml**, **1 Litre**, and **5 Litre Can/Tin** with dynamic price and stock updates.
- **Categories**:
  - Groundnut Oil (*மரச்செக்கு கடலை எண்ணெய்*)
  - Sesame / Gingelly Oil (*நாட்டு எள்ளு நல்லெண்ணெய்*)
  - Virgin Coconut Oil (*மரச்செக்கு தேங்காய் எண்ணெய்*)
  - Kachi Ghani Mustard Oil (*கடுகு எண்ணெய்*)
  - Natural Sunflower Oil (*சூரியகாந்தி எண்ணெய்*)
  - Pancha Deepam Pooja Lamp Oil (*பஞ்ச தீப பூஜை எண்ணெய்*)
- Quick View modal displaying health highlights, smoke point, and cold-pressed extraction details.

### 3. Shopping Cart & Authoritative Calculation
- Slide-over cart drawer with real-time quantity modifiers (`+` / `-`) and item removal.
- **Authoritative Totals**: Application strictly computes item rates, subtotal, delivery fees, and discounts to eliminate tampering.
- **Free Delivery Progress Meter**: Dynamically tracks progress towards the configured free delivery threshold (e.g. ₹999).
- **Promo Coupon System**: Supports flat discounts (e.g. `WELCOME50`) and percentage discounts (e.g. `PURE10`).
- Customer checkout form: Name, 10-digit WhatsApp phone, address, PIN code, and payment method selection.

### 4. Official WhatsApp Click-to-Chat Billing
- Generates exact required bill format:
```text
OIL SHOP - CUSTOMER ORDER
Order No: OS-2026-XXXX
Date: 28 Oct 2026, 10:30 AM
Customer Name: [Customer Name]
Phone: [Customer Phone]
Delivery Address: [Full Address, City - Pincode]
ORDER DETAILS
[Product Name]
Pack Size: [Size]
Quantity: [Quantity]
Rate: ₹[Unit Price]
Amount: ₹[Line Total]
...
Subtotal: ₹[Subtotal]
Delivery: ₹[Delivery Charge]
Discount: ₹[Discount]
GRAND TOTAL: ₹[Final Total]
Payment Method: [Selected Method]
Customer Notes: [Notes]
Thank you for shopping with us!
```
- **Official Format**: `https://wa.me/COUNTRYCODEPHONENUMBER?text=ENCODED_MESSAGE`
  - Validates and strips `+`, spaces, and punctuation.
- **Mandatory Notice**: Prominently warns the customer:
  > *“Your order is not submitted until you send the WhatsApp message.”*
- Copy Bill button allows customers to copy raw text with one click.
- Orders are automatically stored in the admin order log.

### 5. Secure Admin Management Portal
- **PIN Protected**: Default PIN is `1234` (configurable in settings).
- **Product Management**: Add, edit, delete products, configure images, and set multiple pack sizes with custom prices and stock counts.
- **Category Management**: Add, rename, or delete oil categories.
- **Shop & WhatsApp Settings**: Edit shop name, tagline, WhatsApp business number, delivery charges, free delivery threshold, and FSSAI number.
- **Order History Log**: View all placed orders, inspect full bill text, update order status (WhatsApp Pending, Confirmed, Dispatched, Delivered).
- **Backup & Restore**: Export complete store state to JSON or reset to default demo data anytime.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended, v24 tested)
- npm

### Installation & Local Run
```bash
# 1. Clone or navigate to the directory
cd "d:/oil shop"

# 2. Install dependencies (if not already installed)
npm install

# 3. Start development server
npm run dev

# 4. Open in browser
# http://localhost:5173
```

### Production Build
```bash
npm run build
```
The optimized production bundle will be generated in `dist/`.

---

## 📁 Project Architecture
```
d:/oil shop/
├── public/
│   └── images/               # High-res photography for hero and oil products
├── src/
│   ├── assets/               # Static assets & icons
│   ├── components/
│   │   ├── Header.jsx        # Navigation, search, announcement, WhatsApp & cart triggers
│   │   ├── HeroBanner.jsx    # Hero visual presentation & USPs
│   │   ├── TrustSection.jsx  # 4 pillars of Mara Chekku purity
│   │   ├── CategoryTabs.jsx  # Category switcher with icons & count badges
│   │   ├── ProductCard.jsx   # Product card with pack size selector & stepper
│   │   ├── ProductModal.jsx  # Quick view modal with detailed benefits
│   │   ├── CartDrawer.jsx    # Slide-over cart, coupon box, and customer details form
│   │   ├── BillPreviewModal.jsx # WhatsApp formatted bill preview & wa.me redirect
│   │   ├── AdminModal.jsx    # PIN-secured product & order management dashboard
│   │   └── Footer.jsx        # Shop info, FSSAI registration, address & hours
│   ├── context/
│   │   └── ShopContext.jsx   # Global store state with LocalStorage persistence
│   ├── data/
│   │   └── defaultData.js    # Default oil products, variants, categories, coupons
│   ├── utils/
│   │   └── billGenerator.js  # Bill formatter, authoritative calculator & WhatsApp URL generator
│   ├── App.jsx               # Main application container
│   ├── index.css             # Traditional Indian retail design system
│   └── main.jsx              # React DOM entry point
├── package.json
└── vite.config.js
```

---

## 🔐 Admin Credentials
- **Access**: Click the **Admin** shield icon in the header.
- **Default PIN**: `1234`
- You can change the PIN in **Admin > Shop & WhatsApp Settings**.
