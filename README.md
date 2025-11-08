# BayOrder: QR Code Ordering System

BayOrder is a modern, serverless, QR-code-based menu and ordering system designed for cafes, restaurants, and bars. It consists of two separate web applications: a customer-facing app for browsing the menu and placing orders, and an owner-facing dashboard for managing the establishment, menu, and incoming orders.

This project is built as a monorepo, containing the two distinct applications in the `/customer` and `/owner` directories.

## Live Deployments

  * **Customer App:** [https://bay-order.vercel.app/](https://bay-order.vercel.app/)
  * **Owner App:** [https://bay-order-9ivk.vercel.app/](https://bay-order-9ivk.vercel.app/)

## Project Structure

```
/
├── customer/   # Customer-facing React App
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
└── owner/      # Owner/Admin React App
    ├── src/
    ├── public/
    ├── package.json
    └── ...
```

-----

## 1\. Customer Application (`/customer`)

This is the client-facing application that customers use on their mobile phones after scanning a QR code at their table.

### Customer App Features

  * **QR Code Entry:** Customers scan a QR code specific to their table, which directs them to the correct menu.
  * **Dynamic Menu:** Fetches and displays the cafe's menu (categories and items) from the database.
  * **Shopping Cart:** Customers can add/remove items and adjust quantities.
  * **Place Order:** The app submits the final order, linking it to the customer's cafe and table number.

## 2\. Owner Application (`/owner`)

This is the comprehensive administrative dashboard for the establishment's owner and a super-admin.

### Owner App Features

  * **Secure Authentication:** Firebase-based email/password login for owners and admins.
  * **Multi-Level Roles:**
      * **Admin:** Can view and manage all cafes in the system.
      * **Owner:** Can only view and manage their assigned cafe.
  * **Owner Dashboard:** A tabbed interface for full cafe management:
      * **Live Orders:** View new orders in real-time. Orders are streamed from Firestore, allowing staff to accept and "complete" them.
      * **Menu Management:** Full CRUD (Create, Read, Update, Delete) functionality for menu categories and individual menu items, including name, price, description, and image uploads (to Firebase Storage).
      * **Cafe Settings:**
          * Manage table settings (add/remove tables).
          * Generate and download unique QR codes for each table. The QR code links directly to the customer app with the correct cafe and table IDs.

-----

## Tech Stack

This project uses a modern, serverless tech stack:

  * **Backend:** **Firebase**
      * **Authentication:** For secure user (owner/admin) login.
      * **Firestore:** NoSQL database for storing all data (users, cafes, menus, orders).
      * **Storage:** For hosting user-uploaded menu item images.
  * **Frontend:** **React** & **TypeScript** (both apps)
  * **Build Tool:** **Vite** for fast development and bundling.
  * **Routing:** **`react-router-dom`** for client-side routing.
  * **Data Fetching:** **`@tanstack/react-query`** for managing server state, caching, and real-time data streaming from Firestore.
  * **UI (both apps):**
      * **Tailwind CSS:** For utility-first styling.
      * **shadcn/ui:** A component library built on Radix UI and Tailwind CSS.
      * **Sonner** & **React Hot Toast:** For notifications and toasts.
  * **QR Code Generation:** **`qrcode.react`** (in the Owner app).
  * **Deployment:** **Vercel**

-----

## Local Setup and Installation

### Prerequisites

  * **Node.js** (v18+) or **Bun**
  * A **Firebase** project
      * Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
      * Enable **Authentication** (with the "Email/Password" provider).
      * Enable **Firestore Database**.
      * Enable **Storage**.

### Environment Variables

You will need to create a `.env` file in the root of *both* the `/customer` and `/owner` directories. Add your Firebase project's "web app" credentials to each file.

**File:** `customer/.env` and `owner/.env`

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Installation

Run these commands from the root of the project:

```bash
# 1. Install dependencies for the Customer app
cd customer
npm install
# or: bun install

# 2. Install dependencies for the Owner app
cd ../owner
npm install
# or: bun install
```

### Running Locally

You will need two separate terminal windows to run both apps simultaneously.

**Terminal 1 (Run Customer App):**

```bash
cd customer
npm run dev
# or: bun run dev

# App will be running at http://localhost:5173 (or a similar port)
```

**Terminal 2 (Run Owner App):**

```bash
cd owner
npm run dev
# or: bun run dev

# App will be running at http://localhost:5174 (or a similar port)
```

-----

## Deployment

This project is configured for easy deployment on **Vercel**.

### **Critical Deployment Fix**

Both applications are **Single Page Applications (SPAs)** and require a "catch-all" rewrite rule to handle client-side routing. Without this, directly accessing URLs like `/login` will result in a 404 error.

To fix this, add a `vercel.json` file to the root of *both* the `/customer` and `/owner` directories.

**File:** `customer/vercel.json` and `owner/vercel.json`

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

After adding this file and redeploying, all standalone URLs will work correctly.