import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import axios from "axios";
import FormData from "form-data";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";
import { spawn } from "child_process";
import { createWorker } from "tesseract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const PROMOCODES_FILE = path.join(DATA_DIR, "promocodes.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const EXCHANGE_RATE_FILE = path.join(DATA_DIR, "exchange_rate.json");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");
const GROUPS_FILE = path.join(DATA_DIR, "groups.json");

const serverStartTime = Date.now();

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating data directory:", error);
  }
}

async function readProducts() {
  try {
    const data = await fs.readFile(PRODUCTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // Default products
    const defaultProducts = [
      {
        id: "1",
        name: "iPhone 15 Pro Max",
        price: 1199,
        groupPrice: 959,
        category: "Smartfonlar",
        image: "https://picsum.photos/seed/iphone/800/800",
        description: "The ultimate iPhone with titanium design and A17 Pro chip.",
        specs: { "Storage": "256GB", "Color": "Natural Titanium" },
        viewCount: 0,
        lastViewed: Date.now()
      },
      {
        id: "2",
        name: "MacBook Pro 14",
        price: 1999,
        groupPrice: 1599,
        category: "Noutbuklar",
        image: "https://picsum.photos/seed/macbook/800/800",
        description: "Supercharged by M3 Pro for pro performance.",
        specs: { "RAM": "18GB", "SSD": "512GB" },
        viewCount: 0,
        lastViewed: Date.now()
      },
      {
        id: "3",
        name: "AirPods Max",
        price: 549,
        groupPrice: 439,
        category: "Quloqchinlar",
        image: "https://picsum.photos/seed/airpods/800/800",
        description: "High-fidelity audio for an unparalleled listening experience.",
        specs: { "Battery": "20h", "ANC": "Yes" },
        viewCount: 0,
        lastViewed: Date.now()
      }
    ];
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(defaultProducts, null, 2));
    return defaultProducts;
  }
}

async function writeProducts(products: any[]) {
  try {
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    // Check for price drop alerts whenever products are written
    checkPriceAlerts().catch(err => console.error("Error checking price alerts on write:", err));
  } catch (error) {
    console.error("Error writing products:", error);
  }
}

let botProcess: any = null;

async function startBot() {
  if (process.env.DISABLE_TELEGRAM_BOT === "true") {
    console.log("Telegram Bot is disabled via environment variable. Skipping startBot.");
    return;
  }

  if (botProcess) {
    botProcess.kill();
  }

  const settings = await readSettings();
  const activeBot = settings.bots.find((b: any) => b.status === "active") || settings.bots[0];
  const token = activeBot?.token;

  if (!token) {
    console.log("No active Telegram Bot Token found. Bot not started.");
    return;
  }

  console.log(`Starting Telegram Bot (${activeBot.username})...`);
  botProcess = spawn("python3", ["bot.py"], {
    env: { ...process.env, TELEGRAM_BOT_TOKEN: token }
  });

  botProcess.stdout.on("data", (data: any) => {
    console.log(`Bot STDOUT: ${data}`);
  });

  botProcess.stderr.on("data", (data: any) => {
    console.error(`Bot STDERR: ${data}`);
  });

  botProcess.on("close", (code: any) => {
    console.log(`Bot process exited with code ${code}`);
    botProcess = null;
  });
}

async function readSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    const settings = JSON.parse(data);
    return {
      logoBase64: settings.logoBase64 || "",
      cardNumber: settings.cardNumber || "8600 0000 0000 0000",
      cardName: settings.cardName || "Shohidbek M.",
      paymentType: settings.paymentType || "card",
      walletNumber: settings.walletNumber || "+998 90 123 45 67",
      walletName: settings.walletName || "Shohidbek M.",
      bots: settings.bots || [
        { 
          token: settings.botToken || process.env.TELEGRAM_BOT_TOKEN || "", 
          username: settings.botUsername || "@S_Store_Bot", 
          status: "active" 
        }
      ]
    };
  } catch (error) {
    return { 
      logoBase64: "",
      cardNumber: "8600 0000 0000 0000",
      cardName: "Shohidbek M.",
      paymentType: "card",
      walletNumber: "+998 90 123 45 67",
      walletName: "Shohidbek M.",
      bots: [
        { 
          token: process.env.TELEGRAM_BOT_TOKEN || "", 
          username: "@S_Store_Bot", 
          status: "active" 
        }
      ]
    };
  }
}

async function writeSettings(settings: any) {
  try {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("Error writing settings:", error);
  }
}

async function readPromoCodes() {
  try {
    const data = await fs.readFile(PROMOCODES_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // Default promo code
    const defaultCodes = [
      { 
        id: "1", 
        code: "S_STORE_2026", 
        discountPercentage: 20, 
        expiryDate: "2027-01-01", 
        isActive: true 
      }
    ];
    await fs.writeFile(PROMOCODES_FILE, JSON.stringify(defaultCodes, null, 2));
    return defaultCodes;
  }
}

async function writePromoCodes(codes: any[]) {
  try {
    await fs.writeFile(PROMOCODES_FILE, JSON.stringify(codes, null, 2));
  } catch (error) {
    console.error("Error writing promo codes:", error);
  }
}

async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // Default users
    const defaultUsers = [
      { 
        id: "1", 
        username: "admin", 
        password: "shoh1dbek", 
        role: "SuperAdmin",
        affiliateToken: "ADMIN_REF",
        affiliateBalance: 0,
        sCoins: 0,
        userLevel: "Beginner",
        userPreferences: {}
      },
      { 
        id: "2", 
        username: "manager", 
        password: "manager123", 
        role: "Manager",
        affiliateToken: "MANAGER_REF",
        affiliateBalance: 0,
        sCoins: 0,
        userLevel: "Beginner",
        userPreferences: {}
      }
    ];
    await fs.writeFile(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
    return defaultUsers;
  }
}

async function writeUsers(users: any[]) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error writing users:", error);
  }
}

async function readExchangeRate() {
  try {
    const data = await fs.readFile(EXCHANGE_RATE_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    const defaultRate = { rate: 12500, lastUpdated: 0, manualOverride: false };
    await fs.writeFile(EXCHANGE_RATE_FILE, JSON.stringify(defaultRate, null, 2));
    return defaultRate;
  }
}

async function writeExchangeRate(rateData: any) {
  try {
    await fs.writeFile(EXCHANGE_RATE_FILE, JSON.stringify(rateData, null, 2));
  } catch (error) {
    console.error("Error writing exchange rate:", error);
  }
}

async function readOrders() {
  try {
    const data = await fs.readFile(ORDERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeOrders(orders: any[]) {
  try {
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error("Error writing orders:", error);
  }
}

async function readAlerts() {
  try {
    const data = await fs.readFile(ALERTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeAlerts(alerts: any[]) {
  try {
    await fs.writeFile(ALERTS_FILE, JSON.stringify(alerts, null, 2));
  } catch (error) {
    console.error("Error writing alerts:", error);
  }
}

async function readLogs() {
  try {
    const data = await fs.readFile(LOGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeLogs(logs: any[]) {
  try {
    await fs.writeFile(LOGS_FILE, JSON.stringify(logs.slice(-100), null, 2)); // Keep last 100 logs
  } catch (error) {
    console.error("Error writing logs:", error);
  }
}

async function readGroups() {
  try {
    const data = await fs.readFile(GROUPS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeGroups(groups: any[]) {
  try {
    await fs.writeFile(GROUPS_FILE, JSON.stringify(groups, null, 2));
  } catch (error) {
    console.error("Error writing groups:", error);
  }
}

async function logActivity(type: "INFO" | "ERROR", message: string, details?: any) {
  const logs = await readLogs();
  const newLog = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    type,
    message,
    details
  };
  logs.push(newLog);
  await writeLogs(logs);
  console.log(`[${type}] ${message}`);
}

async function sendTelegramMessage(message: string, inlineKeyboard?: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === "YOUR_BOT_TOKEN") {
    console.log("Telegram credentials not set. Skipping notification.");
    return;
  }

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
      reply_markup: inlineKeyboard,
    });
  } catch (error: any) {
    console.error("Error sending Telegram message:", error.response?.data || error.message);
  }
}

async function sendTelegramPhoto(photo: string, caption: string, inlineKeyboard?: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === "YOUR_BOT_TOKEN") {
    console.log("Telegram credentials not set. Skipping notification.");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("caption", caption);
    formData.append("parse_mode", "Markdown");
    if (inlineKeyboard) {
      formData.append("reply_markup", JSON.stringify(inlineKeyboard));
    }

    if (photo.startsWith("data:image")) {
      const base64Data = photo.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      formData.append("photo", buffer, { filename: "receipt_item.png" });
    } else {
      formData.append("photo", photo);
    }

    await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, formData, {
      headers: formData.getHeaders(),
    });
  } catch (error: any) {
    console.error("Error sending Telegram photo:", error.response?.data || error.message);
    await sendTelegramMessage(caption, inlineKeyboard);
  }
}

async function sendEmail(order: any) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("Email credentials not set. Skipping email notification.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const itemsHtml = order.items.map((item: any) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join("");

  const giftHtml = order.giftWrapping ? `
    <div style="background: #fff5f5; border: 1px solid #feb2b2; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h4 style="color: #c53030; margin: 0 0 10px 0;">🎁 Gift Wrapping Included</h4>
      <p style="margin: 0; font-style: italic; color: #742a2a;">"${order.greetingCard || "No message"}"</p>
    </div>
  ` : "";

  const totalUzs = order.total * order.exchangeRateUsed;
  const formattedTotalUzs = new Intl.NumberFormat("uz-UZ").format(Math.round(totalUzs)) + " so'm";

  const mailOptions = {
    from: `"S STORE" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: `Order Confirmation - #${order.id}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #00d4ff; margin: 0;">S STORE</h1>
          <p style="color: #666; font-size: 14px;">Futuristic Tech Gear</p>
        </div>
        
        <h2 style="color: #333;">Thank You for Your Order!</h2>
        <p>Hi ${order.customerName}, your payment has been confirmed. We are now processing your order.</p>
        
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order.id}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Paid</p>
          <p style="margin: 5px 0;"><strong>Address:</strong> ${order.address}</p>
        </div>

        ${giftHtml}

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #eee;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 20px;">
          <p style="margin: 5px 0; font-size: 18px;"><strong>Total USD:</strong> $${order.total.toFixed(2)}</p>
          <p style="margin: 5px 0; color: #00d4ff; font-weight: bold;"><strong>Total UZS:</strong> ${formattedTotalUzs}</p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="font-size: 14px; color: #666;">Track your order status anytime on our website.</p>
        </div>

        <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          If you have any questions, please contact our support team via Telegram.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${order.email}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

async function sendPriceDropNotification(alert: any, product: any, newPrice: number) {
  const message = `🚀 *NARX TUSHDI!*\n\n*${product.name}* narxi tushdi!\n\nEski narx: ~${alert.alertPrice}$~\nYangi narx: *${newPrice}$*\n\nHoziroq sotib oling!`;
  
  await sendTelegramMessage(message);

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"S STORE" <${process.env.EMAIL_USER}>`,
      to: alert.email,
      subject: `Price Drop Alert: ${product.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #00d4ff;">Ajoyib yangilik!</h2>
          <p><strong>${product.name}</strong> narxi <strong>$${alert.alertPrice}</strong> dan <strong>$${newPrice}</strong> ga tushdi!</p>
          <p>Hoziroq saytimizga kiring va chegirmadan foydalaning.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://s-store.uz" style="background: #00d4ff; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Sotib olish</a>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Error sending price drop email:", error);
    }
  }
}

async function checkPriceAlerts() {
  const alerts = await readAlerts();
  const products = await readProducts();
  const remainingAlerts = [];

  for (const alert of alerts) {
    const product = products.find((p: any) => p.id === alert.productId);
    if (product && product.price < alert.alertPrice) {
      await sendPriceDropNotification(alert, product, product.price);
      // Alert triggered, don't keep it
    } else {
      remainingAlerts.push(alert);
    }
  }

  if (alerts.length !== remainingAlerts.length) {
    await writeAlerts(remainingAlerts);
  }
}

async function startServer() {
  await ensureDataDir();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Fraud Detection Middleware
  const orderAttempts: { [ip: string]: { count: number, lastAttempt: number } } = {};
  const fraudDetection = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.method === "POST" && req.url === "/api/order") {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      
      // Rule 1: Rate limiting (3 orders per 10 mins)
      if (!orderAttempts[ip]) {
        orderAttempts[ip] = { count: 1, lastAttempt: now };
      } else {
        if (now - orderAttempts[ip].lastAttempt < 10 * 60 * 1000) {
          orderAttempts[ip].count++;
        } else {
          orderAttempts[ip].count = 1;
          orderAttempts[ip].lastAttempt = now;
        }
      }

      if (orderAttempts[ip].count > 3) {
        await logActivity("ERROR", `Suspicious activity detected from IP: ${ip}`);
        await sendTelegramMessage(`⚠️ *Shubhali faollik aniqlandi!*\nIP: \`${ip}\` dan ko'p buyurtma berishga urinish.`);
        return res.status(429).json({ message: "Too many order attempts. Please try again later." });
      }

      // Rule 2: Test card range check
      const { cardNumber, testMode } = req.body;
      if (cardNumber && cardNumber.startsWith("4242") && !testMode) {
        await logActivity("ERROR", `Fraud attempt: Test card used in live mode from IP: ${ip}`);
        await sendTelegramMessage(`⚠️ *Shubhali faollik aniqlandi!*\nIP: \`${ip}\` jonli rejimda test kartasidan foydalandi.`);
        return res.status(403).json({ message: "Invalid card details for live transaction." });
      }
    }
    next();
  };

  app.use(fraudDetection);

  // Simulated Image Search (AI Vision)
  app.post("/api/image-search", async (req, res) => {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: "No image provided" });

    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const products = await readProducts();
    // Simulate finding a category based on the image
    // In a real app, we'd use a vision model here.
    // For now, we'll randomly pick a category or look for keywords in the base64 (not reliable but for simulation)
    const categories = ["Smartfonlar", "Noutbuklar", "Quloqchinlar", "Aksessuarlar"];
    const detectedCategory = categories[Math.floor(Math.random() * categories.length)];

    const results = products.filter((p: any) => p.category === detectedCategory);
    res.json({ detectedCategory, results });
  });

  // Middleware to log requests
  app.use((req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode >= 400) {
        logActivity("ERROR", `${req.method} ${req.url} - Status: ${res.statusCode}`);
      }
    });
    next();
  });

  // API Routes
  app.get("/api/products", async (req, res) => {
    const products = await readProducts();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Ensure all products have reviews array and viewCount
    const processedProducts = products.map((p: any) => {
      const isTrending = (p.viewCount || 0) > 50 && (now - (p.lastViewed || 0)) < oneDay;
      const dynamicPrice = isTrending ? p.price * 0.9 : p.price;

      return {
        ...p,
        reviews: p.reviews || [],
        viewCount: p.viewCount || 0,
        isTrending,
        dynamicPrice: Math.round(dynamicPrice)
      };
    });
    res.json(processedProducts);
  });

  app.post("/api/products/:id/view", async (req, res) => {
    const { id } = req.params;
    const products = await readProducts();
    const productIndex = products.findIndex((p: any) => p.id === id);

    if (productIndex !== -1) {
      products[productIndex].viewCount = (products[productIndex].viewCount || 0) + 1;
      products[productIndex].lastViewed = Date.now();
      await writeProducts(products);
      res.json({ success: true, viewCount: products[productIndex].viewCount });
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  });

  app.post("/api/products/:id/review", async (req, res) => {
    const { id } = req.params;
    const { rating, comment, userName, reviewImage, videoUrl } = req.body;
    
    if (!rating || !comment || !userName) {
      return res.status(400).json({ message: "Missing review data" });
    }

    const products = await readProducts();
    const productIndex = products.findIndex((p: any) => p.id === id);

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found" });
    }

    const newReview = {
      id: Date.now().toString(),
      userName,
      rating: Number(rating),
      comment,
      reviewImage,
      videoUrl,
      createdAt: new Date().toISOString()
    };

    if (!products[productIndex].reviews) {
      products[productIndex].reviews = [];
    }

    products[productIndex].reviews.push(newReview);
    await writeProducts(products);

    res.status(201).json(newReview);
  });

  app.get("/api/settings", async (req, res) => {
    const settings = await readSettings();
    const adminRole = req.headers["x-admin-role"];
    
    if (adminRole !== "SuperAdmin") {
      // Hide sensitive fields for non-admins
      const { bots, ...publicSettings } = settings;
      return res.json(publicSettings);
    }
    
    res.json(settings);
  });

  app.post("/api/settings", async (req, res) => {
    const { logoBase64, cardNumber, cardName, paymentType, walletNumber, walletName, bots } = req.body;
    const adminRole = req.headers["x-admin-role"];
    
    if (adminRole !== "SuperAdmin") {
      return res.status(403).json({ message: "Forbidden. SuperAdmin only." });
    }

    const currentSettings = await readSettings();
    const updatedSettings = {
      ...currentSettings,
      ...(logoBase64 !== undefined && { logoBase64 }),
      ...(cardNumber !== undefined && { cardNumber }),
      ...(cardName !== undefined && { cardName }),
      ...(paymentType !== undefined && { paymentType }),
      ...(walletNumber !== undefined && { walletNumber }),
      ...(walletName !== undefined && { walletName }),
      ...(bots !== undefined && { bots })
    };

    await writeSettings(updatedSettings);

    // Security Notification for Payment Changes
    const paymentChanged = (cardNumber !== undefined && cardNumber !== currentSettings.cardNumber) ||
                           (cardName !== undefined && cardName !== currentSettings.cardName) ||
                           (walletNumber !== undefined && walletNumber !== currentSettings.walletNumber) ||
                           (walletName !== undefined && walletName !== currentSettings.walletName) ||
                           (paymentType !== undefined && paymentType !== currentSettings.paymentType);

    if (paymentChanged) {
      const activeBot = updatedSettings.bots.find((b: any) => b.status === "active") || updatedSettings.bots[0];
      const token = activeBot?.token;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (token && chatId) {
        const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
        let message = `⚠️ *SECURITY ALERT*: Payment details have been updated!\n\n` +
                      `🛠 *Type*: ${updatedSettings.paymentType === 'wallet' ? 'Click Wallet' : 'Plastic Card'}\n`;
        
        if (updatedSettings.paymentType === 'wallet') {
          message += `📱 *Wallet*: \`${updatedSettings.walletNumber}\`\n` +
                     `👤 *Name*: ${updatedSettings.walletName}\n`;
        } else {
          message += `💳 *Card*: \`${updatedSettings.cardNumber}\`\n` +
                     `👤 *Name*: ${updatedSettings.cardName}\n`;
        }
        
        message += `🕒 *Time*: ${timestamp}`;
        
        axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown"
        }).catch(err => console.error("Error sending security alert to Telegram:", err.message));
      }
    }

    res.json({ message: "Settings updated successfully", settings: updatedSettings });
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    const orders = await readOrders();
    
    // Daily Revenue (last 7 days)
    const dailyRevenue: Record<string, number> = {};
    const orderStats = { successful: 0, cancelled: 0, pending: 0 };
    
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyRevenue[dateStr] = 0;
    }

    orders.forEach((order: any) => {
      const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
      if (order.status === "Paid") {
        if (dailyRevenue[dateStr] !== undefined) {
          dailyRevenue[dateStr] += order.total;
        }
        orderStats.successful++;
      } else if (order.status === "Expired" || order.status === "Rejected") {
        orderStats.cancelled++;
      } else {
        orderStats.pending++;
      }
    });

    res.json({
      dailyRevenue: Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount })),
      orderStats
    });
  });

  app.post("/api/update-bot", async (req, res) => {
    const adminRole = req.headers["x-admin-role"];
    if (adminRole !== "SuperAdmin") {
      return res.status(403).json({ message: "Forbidden. SuperAdmin only." });
    }

    try {
      await startBot();
      res.json({ message: "Bot restarted successfully" });
    } catch (error) {
      console.error("Error restarting bot:", error);
      res.status(500).json({ message: "Failed to restart bot" });
    }
  });

  app.get("/api/promocodes", async (req, res) => {
    const codes = await readPromoCodes();
    // Only return active codes for the public API
    res.json(codes.filter((c: any) => c.isActive !== false));
  });

  app.post("/api/promocodes/validate", async (req, res) => {
    const { code } = req.body;
    const codes = await readPromoCodes();
    const promo = codes.find((c: any) => c.code.toUpperCase() === code.toUpperCase() && c.isActive !== false);
    
    if (promo) {
      // Check expiry if it exists
      if (promo.expiryDate && new Date(promo.expiryDate) < new Date()) {
        return res.status(400).json({ message: "Promo code has expired" });
      }
      res.json(promo);
    } else {
      res.status(404).json({ message: "Invalid or inactive promo code" });
    }
  });

  app.get("/api/exchange-rate", async (req, res) => {
    const rateData = await readExchangeRate();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (!rateData.manualOverride && (now - rateData.lastUpdated > oneHour)) {
      try {
        const response = await axios.get("https://cbu.uz/uz/arkhiv-kursov-valyut/json/");
        const usdData = response.data.find((item: any) => item.Ccy === "USD");
        if (usdData) {
          rateData.rate = parseFloat(usdData.Rate);
          rateData.lastUpdated = now;
          await writeExchangeRate(rateData);
          console.log("Exchange rate updated from CBU:", rateData.rate);
        }
      } catch (error) {
        console.error("Error fetching exchange rate from CBU:", error);
      }
    }

    res.json(rateData);
  });

  app.post("/api/admin/exchange-rate", async (req, res) => {
    const { rate, manualOverride } = req.body;
    const rateData = await readExchangeRate();
    
    rateData.rate = rate;
    rateData.manualOverride = manualOverride;
    rateData.lastUpdated = Date.now();
    
    await writeExchangeRate(rateData);
    res.json({ message: "Exchange rate updated successfully", rateData });
  });

  app.get("/api/admin/users", async (req, res) => {
    const users = await readUsers();
    res.json(users);
  });

  app.get("/api/admin/orders", async (req, res) => {
    const role = req.headers["x-admin-role"];
    if (role !== "SuperAdmin") {
      return res.status(403).json({ message: "Access denied. SuperAdmin only." });
    }
    const orders = await readOrders();
    res.json(orders);
  });

  app.post("/api/admin/orders/:id/status", async (req, res) => {
    const role = req.headers["x-admin-role"];
    if (role !== "SuperAdmin") {
      return res.status(403).json({ message: "Access denied. SuperAdmin only." });
    }

    const { id } = req.params;
    const { status } = req.body;
    const orders = await readOrders();
    const orderIndex = orders.findIndex((o: any) => o.id === id || o.id === `#S-${id}` || o.id === `S-${id}`);

    if (orderIndex === -1) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orders[orderIndex];
    order.status = status;
    await writeOrders(orders);

    // If it has a Telegram message ID, delete it
    if (order.admin_message_id) {
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID || process.env.ADMIN_ID;
        if (botToken && chatId) {
          await axios.post(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
            chat_id: chatId,
            message_id: order.admin_message_id
          });
        }
      } catch (error) {
        console.error("Error deleting Telegram message:", error);
      }
    }

    // Notify user via Telegram
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken && order.userId) {
        let message = "";
        if (status === "Paid") {
          message = `✅ *Sizning to'lovingiz tasdiqlandi!* Buyurtmangiz *#${order.id}* tayyorlanmoqda.`;
        } else if (status === "Rejected") {
          message = `❌ *To'lov rad etildi.* Buyurtma *#${order.id}* uchun yuborilgan chekda muammo bor.`;
        }

        if (message) {
          await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: order.userId,
            text: message,
            parse_mode: "Markdown"
          });
        }
      }
    } catch (error) {
      console.error("Error notifying user via Telegram:", error);
    }

    res.json({ success: true, order });
  });

  // Admin API Routes
  app.post("/api/admin/settings", async (req, res) => {
    const newSettings = req.body;
    await writeSettings(newSettings);
    res.json(newSettings);
  });

  app.post("/api/admin/add-product", async (req, res) => {
    const newProduct = req.body;
    const products = await readProducts();
    const productWithId = { ...newProduct, id: Date.now().toString() };
    products.push(productWithId);
    await writeProducts(products);
    res.status(201).json(productWithId);
  });

  app.delete("/api/admin/delete-product/:id", async (req, res) => {
    const { id } = req.params;
    let products = await readProducts();
    products = products.filter((p: any) => p.id !== id);
    await writeProducts(products);
    res.status(204).send();
  });

  app.delete("/api/admin/products/:productId/reviews/:reviewId", async (req, res) => {
    const role = req.headers["x-admin-role"];
    if (role !== "SuperAdmin") {
      return res.status(403).json({ message: "Access denied. SuperAdmin only." });
    }

    const { productId, reviewId } = req.params;
    const products = await readProducts();
    const productIndex = products.findIndex((p: any) => p.id === productId);

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (products[productIndex].reviews) {
      products[productIndex].reviews = products[productIndex].reviews.filter((r: any) => r.id !== reviewId);
      await writeProducts(products);
    }

    res.status(204).send();
  });

  // Admin Promo Code Routes (SuperAdmin only)
  app.get("/api/admin/promocodes", async (req, res) => {
    const role = req.headers["x-admin-role"];
    if (role !== "SuperAdmin") {
      return res.status(403).json({ message: "Access denied. SuperAdmin only." });
    }
    const codes = await readPromoCodes();
    res.json(codes);
  });

  app.post("/api/admin/promocodes", async (req, res) => {
    const role = req.headers["x-admin-role"];
    if (role !== "SuperAdmin") {
      return res.status(403).json({ message: "Access denied. SuperAdmin only." });
    }
    const newCode = req.body;
    const codes = await readPromoCodes();
    const codeWithId = { 
      ...newCode, 
      id: Date.now().toString(),
      isActive: newCode.isActive ?? true 
    };
    codes.push(codeWithId);
    await writePromoCodes(codes);
    res.status(201).json(codeWithId);
  });

  app.delete("/api/admin/promocodes/:id", async (req, res) => {
    const role = req.headers["x-admin-role"];
    if (role !== "SuperAdmin") {
      return res.status(403).json({ message: "Access denied. SuperAdmin only." });
    }
    const { id } = req.params;
    let codes = await readPromoCodes();
    codes = codes.filter((c: any) => c.id !== id);
    await writePromoCodes(codes);
    res.status(204).send();
  });

  app.get("/api/order-status/:id", async (req, res) => {
    const { id } = req.params;
    const orders = await readOrders();
    const order = orders.find((o: any) => o.id === id);
    if (order) {
      res.json({ status: order.status });
    } else {
      res.status(404).json({ message: "Order not found" });
    }
  });

  app.get("/api/track-order/:id", async (req, res) => {
    const { id } = req.params;
    const orders = await readOrders();
    const order = orders.find((o: any) => o.id === id);
    if (order) {
      // Return status and basic info for tracking
      res.json({ 
        id: order.id, 
        status: order.status, 
        customerName: order.customerName,
        createdAt: order.createdAt
      });
    } else {
      res.status(404).json({ message: "Order not found" });
    }
  });

  app.get("/api/admin/analytics", async (req, res) => {
    const role = req.headers["x-admin-role"];
    if (role !== "SuperAdmin") {
      return res.status(403).json({ message: "Access denied. SuperAdmin only." });
    }

    const orders = await readOrders();
    const products = await readProducts();
    const users = await readUsers();

    const paidOrders = orders.filter((o: any) => o.status === "Paid");
    const totalSales = paidOrders.reduce((sum: number, o: any) => sum + o.total, 0);

    // Affiliate Stats
    const affiliateStats = users
      .filter((u: any) => u.affiliateBalance > 0 || u.affiliateToken)
      .map((u: any) => ({
        username: u.username,
        token: u.affiliateToken,
        balance: u.affiliateBalance || 0
      }));

    // Top Products
    const productSales: { [key: string]: number } = {};
    paidOrders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Sales by Date (last 7 days)
    const salesByDate: { [key: string]: number } = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    last7Days.forEach(date => salesByDate[date] = 0);

    paidOrders.forEach((order: any) => {
      const date = order.createdAt.split("T")[0];
      if (salesByDate[date] !== undefined) {
        salesByDate[date] += order.total;
      }
    });

    const salesChart = last7Days.map(date => ({
      date,
      total: salesByDate[date]
    }));

    res.json({
      totalSales,
      totalOrders: paidOrders.length,
      topProducts,
      salesChart,
      affiliateStats
    });
  });

  app.get("/api/admin/diagnostics", async (req, res) => {
    const role = req.headers["x-admin-role"];
    if (role !== "SuperAdmin") {
      return res.status(403).json({ message: "Access denied. SuperAdmin only." });
    }

    const logs = await readLogs();
    const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
    
    let dbSize = 0;
    try {
      const files = await fs.readdir(DATA_DIR);
      for (const file of files) {
        const stats = await fs.stat(path.join(DATA_DIR, file));
        dbSize += stats.size;
      }
    } catch (err) {
      console.error("Error calculating DB size:", err);
    }

    res.json({
      uptime,
      logs: logs.reverse(),
      dbSize: (dbSize / 1024).toFixed(2) + " KB"
    });
  });

  app.get("/api/user/analytics", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email required" });

    try {
      const orders = await readOrders();
      const users = await readUsers();
      const user = users.find((u: any) => u.username === email); // Using username as email for simplicity in this mock
      
      const userOrders = orders.filter((o: any) => o.email === email && o.status === "Paid");
      
      const totalSpent = userOrders.reduce((sum: number, o: any) => sum + o.total, 0);
      
      const categorySpending: { [key: string]: number } = {};
      userOrders.forEach((order: any) => {
        order.items.forEach((item: any) => {
          categorySpending[item.category] = (categorySpending[item.category] || 0) + (item.price * item.quantity);
        });
      });

      const categoryBreakdown = Object.entries(categorySpending).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
      }));

      let rank = "Bronze Member";
      if (totalSpent > 500) rank = "Gold Member";
      else if (totalSpent > 200) rank = "Silver Member";

      res.json({
        totalSpent,
        categoryBreakdown,
        rank,
        orderCount: userOrders.length,
        orders: userOrders,
        sCoins: user?.sCoins || 0,
        userLevel: user?.userLevel || "Beginner",
        userPreferences: user?.userPreferences || {}
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching analytics" });
    }
  });

  app.post("/api/user/preferences", async (req, res) => {
    const { email, category } = req.body;
    if (!email || !category) return res.status(400).json({ message: "Missing data" });

    const users = await readUsers();
    let user = users.find((u: any) => u.username === email);
    
    if (!user) {
      user = {
        id: Date.now().toString(),
        username: email,
        password: "user123",
        role: "User",
        affiliateToken: `REF_${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        affiliateBalance: 0,
        sCoins: 0,
        userLevel: "Beginner",
        userPreferences: {}
      };
      users.push(user);
    }

    user.userPreferences = user.userPreferences || {};
    user.userPreferences[category] = (user.userPreferences[category] || 0) + 1;
    
    await writeUsers(users);
    res.json({ success: true });
  });

  app.get("/api/recommendations", async (req, res) => {
    const { email } = req.query;
    const products = await readProducts();
    
    if (!email) {
      // New user: show top-rated products (simulated by taking first 4)
      return res.json(products.slice(0, 4));
    }

    const users = await readUsers();
    const user = users.find((u: any) => u.username === email);

    if (!user || !user.userPreferences || Object.keys(user.userPreferences).length === 0) {
      return res.json(products.slice(0, 4));
    }

    // Sort categories by preference
    const sortedCategories = Object.entries(user.userPreferences)
      .sort((a: any, b: any) => b[1] - a[1])
      .map(entry => entry[0]);

    const recommended = products
      .filter((p: any) => sortedCategories.includes(p.category))
      .sort((a: any, b: any) => {
        const indexA = sortedCategories.indexOf(a.category);
        const indexB = sortedCategories.indexOf(b.category);
        return indexA - indexB;
      })
      .slice(0, 4);

    if (recommended.length < 4) {
      const remaining = products.filter((p: any) => !recommended.find((r: any) => r.id === p.id)).slice(0, 4 - recommended.length);
      recommended.push(...remaining);
    }

    res.json(recommended);
  });

  app.post("/api/ai-assistant", async (req, res) => {
    const { message } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: "Gemini API key not configured" });
    }

    try {
      const products = await readProducts();
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const productContext = products.map((p: any) => 
        `- ${p.name}: ${p.price} (Category: ${p.category}). Description: ${p.description}`
      ).join("\n");

      const systemInstruction = `You are the S STORE AI Shopping Assistant. 
      Help users find the best tech products from our catalog. 
      Be professional, futuristic, and helpful. 
      If a user asks for recommendations, use the following product list as context:
      ${productContext}
      
      Always mention the price and why it's a good choice. 
      If a product is not in the list, politely say we don't have it yet but suggest alternatives.
      Answer in the same language as the user (Uzbek or English).`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: message,
        config: {
          systemInstruction
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini AI Error:", error);
      res.status(500).json({ message: "AI Assistant is currently offline" });
    }
  });

  app.get("/api/my-warranties", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email required" });

    try {
      const orders = await readOrders();
      const userWarranties = orders
        .filter((o: any) => o.email === email && o.status === "Paid" && o.warrantyId)
        .map((o: any) => ({
          orderId: o.id,
          warrantyId: o.warrantyId,
          expiry: o.warrantyExpiry,
          items: o.items.filter((i: any) => i.category === "Electronics")
        }));
      res.json(userWarranties);
    } catch (error) {
      res.status(500).json({ message: "Error fetching warranties" });
    }
  });

  app.post("/api/price-alerts", async (req, res) => {
    const { productId, email, alertPrice } = req.body;
    if (!productId || !email || !alertPrice) {
      return res.status(400).json({ message: "Missing alert data" });
    }

    const alerts = await readAlerts();
    const newAlert = {
      id: Date.now().toString(),
      productId,
      email,
      alertPrice,
      createdAt: new Date().toISOString()
    };
    alerts.push(newAlert);
    await writeAlerts(alerts);
    res.status(201).json(newAlert);
  });

  // Telegram Webhook Handler
  app.post("/api/telegram-webhook", async (req, res) => {
    const { callback_query } = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (callback_query) {
      const data = callback_query.data;
      const chatId = callback_query.message.chat.id;
      const messageId = callback_query.message.message_id;

      if (data.startsWith("pay_confirm_")) {
        const orderId = data.replace("pay_confirm_", "");
        const orders = await readOrders();
        const orderIndex = orders.findIndex((o: any) => o.id === orderId);

        if (orderIndex !== -1) {
          const order = orders[orderIndex];
          order.status = "Paid";
          
          // Generate Warranty
          order.warrantyId = `W-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          order.warrantyExpiry = expiryDate.toISOString();

          await writeOrders(orders);

          // Inventory Management: Decrease stock
          const products = await readProducts();
          let stockUpdated = false;
          order.items.forEach((item: any) => {
            const product = products.find((p: any) => p.id === item.id);
            if (product && product.stockQuantity !== undefined) {
              product.stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
              stockUpdated = true;
            }
          });
          if (stockUpdated) await writeProducts(products);

          // Affiliate Commission Logic
          if (order.ref) {
            const users = await readUsers();
            const referrer = users.find((u: any) => u.affiliateToken === order.ref);
            if (referrer) {
              const commission = order.total * 0.05; // 5% commission
              referrer.affiliateBalance = (referrer.affiliateBalance || 0) + commission;
              await writeUsers(users);
              console.log(`Affiliate commission of ${commission} credited to ${referrer.username}`);
            }
          }

          // Reward Points & Levels Logic
          const users = await readUsers();
          let user = users.find((u: any) => u.username === order.email);
          if (!user) {
            user = {
              id: Date.now().toString(),
              username: order.email,
              password: "user123",
              role: "User",
              affiliateToken: `REF_${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              affiliateBalance: 0,
              sCoins: 0,
              userLevel: "Beginner",
              userPreferences: {}
            };
            users.push(user);
          }

          const earnedCoins = Math.floor(order.total / 10) * 100;
          user.sCoins = (user.sCoins || 0) + earnedCoins;
          
          const oldLevel = user.userLevel;
          if (user.sCoins > 5000) user.userLevel = "Cyber Legend";
          else if (user.sCoins > 1000) user.userLevel = "Tech Enthusiast";
          else user.userLevel = "Beginner";

          await writeUsers(users);

          // Trigger Email Notification
          await sendEmail(order);

          await axios.post(`https://api.telegram.org/bot${token}/editMessageText`, {
            chat_id: chatId,
            message_id: messageId,
            text: `💰 *TO'LOV TASDIQLANDI!*\n\nBuyurtma \`${orderId}\` muvaffaqiyatli to'landi.`,
            parse_mode: "Markdown"
          });
        }
      } else if (data.startsWith("pay_cancel_")) {
        const orderId = data.replace("pay_cancel_", "");
        const orders = await readOrders();
        const orderIndex = orders.findIndex((o: any) => o.id === orderId);

        if (orderIndex !== -1) {
          orders[orderIndex].status = "Cancelled";
          await writeOrders(orders);

          await axios.post(`https://api.telegram.org/bot${token}/editMessageText`, {
            chat_id: chatId,
            message_id: messageId,
            text: `❌ *TO'LOV BEKOR QILINDI*\n\nBuyurtma \`${orderId}\` bekor qilindi.`,
            parse_mode: "Markdown"
          });
        }
      }

      return res.json({ ok: true });
    }

    res.json({ ok: true });
  });

  app.post("/api/order", async (req, res) => {
    const orderData = req.body;
    const orders = await readOrders();
    const rateData = await readExchangeRate();
    const exchangeRate = rateData.rate;

    // Handle Group Buy logic
    if (orderData.groupId) {
      const groups = await readGroups();
      const groupIndex = groups.findIndex((g: any) => g.id === orderData.groupId);
      if (groupIndex !== -1) {
        const group = groups[groupIndex];
        if (new Date(group.expiresAt) < new Date()) {
          return res.status(400).json({ message: "Group buy session has expired" });
        }
        if (!group.participants.includes(orderData.email)) {
          group.participants.push(orderData.email);
          if (group.participants.length >= 3) {
            group.status = "completed";
          }
          await writeGroups(groups);
        }
      }
    }

    const orderId = `#S-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const formattedDate = now.toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    const newOrder = {
      ...orderData,
      id: orderId,
      status: "Awaiting Payment",
      paymentMethod: orderData.paymentMethod,
      createdAt: now.toISOString(),
      exchangeRateUsed: exchangeRate
    };
    orders.push(newOrder);
    await writeOrders(orders);

    // Format Items for Table-like display
    const tableHeader = "`Mahsulot          Soni    Narxi`";
    const tableDivider = "`------------------------------`";
    const tableRows = orderData.items.map((item: any) => {
      const name = item.name.substring(0, 15).padEnd(16);
      const qty = item.quantity.toString().padEnd(6);
      const price = `$${(item.price * item.quantity).toFixed(0)}`.padEnd(8);
      return `\`${name} ${qty} ${price}\``;
    }).join("\n");

    const vatRate = 0.12; 
    const giftWrappingPrice = orderData.giftWrapping ? 1 : 0;
    const subtotal = (orderData.total - giftWrappingPrice) / (1 + vatRate);
    const tax = (orderData.total - giftWrappingPrice) - subtotal;

    const totalInUzs = orderData.total * exchangeRate;
    const formattedTotalUzs = new Intl.NumberFormat("uz-UZ").format(Math.round(totalInUzs)) + " so'm";

    const caption = `
🧾 *YANGI BUYURTMA: #${orderId}*
━━━━━━━━━━━━━━━━━━
📅 *SANA:* ${formattedDate}
👤 *MIJOZ:* ${orderData.customerName}
📍 *MANZIL:* ${orderData.address}
━━━━━━━━━━━━━━━━━━

${tableHeader}
${tableDivider}
${tableRows}
${tableDivider}

💵 *SUBTOTAL:* $${subtotal.toFixed(2)}
⚖️ *VAT (12%):* $${tax.toFixed(2)}
💰 *JAMI:* $${orderData.total.toFixed(2)}

🏛 *KURS:* 1$ = ${exchangeRate.toLocaleString()} UZS
💎 *TO'LOV:* ${formattedTotalUzs}
━━━━━━━━━━━━━━━━━━

💳 *STATUS:* ⏳ TO'LOV KUTILMOQDA
🏦 *USUL:* ${newOrder.paymentMethod}

Iltimos, quyidagi tugma orqali to'lovni amalga oshiring:
    `;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ To'lovni tasdiqlash", callback_data: `pay_confirm_${orderId}` },
          { text: "❌ Bekor qilish", callback_data: `pay_cancel_${orderId}` }
        ]
      ]
    };

    const firstItemImage = orderData.items[0]?.image;

    if (firstItemImage) {
      await sendTelegramPhoto(firstItemImage, caption, inlineKeyboard);
    } else {
      await sendTelegramMessage(caption, inlineKeyboard);
    }

    res.status(201).json({ 
      message: "Order placed successfully!", 
      id: orderId,
      orderId: orderId,
      status: "Pending Payment"
    });
  });

  app.get("/api/sales/recent", async (req, res) => {
    try {
      const orders = await readOrders();
      const recentPaid = orders
        .filter((o: any) => o && o.status === "Paid" && o.customerName)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        })
        .slice(0, 5)
        .map((o: any) => ({
          customerName: o.customerName.charAt(0) + "***" + o.customerName.slice(-1),
          productName: o.items?.[0]?.name || "Mahsulot",
          timestamp: o.createdAt
        }));
      res.json(recentPaid);
    } catch (error) {
      console.error("Error in /api/sales/recent:", error);
      res.json([]);
    }
  });

  app.get("/api/groups/:id", async (req, res) => {
    const { id } = req.params;
    const groups = await readGroups();
    const group = groups.find((g: any) => g.id === id);
    if (group) res.json(group);
    else res.status(404).json({ message: "Group not found" });
  });

  app.post("/api/groups", async (req, res) => {
    const { productId, creatorEmail } = req.body;
    const groups = await readGroups();
    const newGroup = {
      id: `G-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      productId,
      creatorEmail,
      participants: [creatorEmail],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "active"
    };
    groups.push(newGroup);
    await writeGroups(groups);
    res.status(201).json(newGroup);
  });

  app.post("/api/ocr/receipt", async (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ message: "No image provided" });
    }

    try {
      const worker = await createWorker('eng+uzb');
      const { data: { text } } = await worker.recognize(Buffer.from(imageBase64, 'base64'));
      await worker.terminate();

      // Simple regex to find amount and transaction ID
      // Click receipts usually have "Summa: 100 000 UZS" or similar
      // Transaction ID: "ID: 123456789"
      const amountMatch = text.match(/(?:Summa|Amount|To'lov|Total)[:\s]+([\d\s,.]+)/i);
      const idMatch = text.match(/(?:ID|Tranzaksiya|Transaction|Nomer)[:\s]+(\d+)/i);

      let amount = 0;
      if (amountMatch) {
        amount = parseInt(amountMatch[1].replace(/[^\d]/g, ''));
      }

      res.json({
        text,
        amount,
        transactionId: idMatch ? idMatch[1] : null
      });
    } catch (error: any) {
      console.error("OCR Error:", error.message);
      res.status(500).json({ message: "OCR processing failed", error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startBot().catch(err => console.error("Error starting bot on server start:", err));
  });

  // Simulated Background Price Check (Every 1 minute)
  setInterval(() => {
    checkPriceAlerts().catch(err => console.error("Background price check error:", err));
  }, 60000);
}

startServer();
