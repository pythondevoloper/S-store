import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTS_FILE = path.join(__dirname, "products.json");
const SETTINGS_FILE = path.join(__dirname, "settings.json");

async function readProducts() {
  try {
    const data = await fs.readFile(PRODUCTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading products:", error);
    return [];
  }
}

async function writeProducts(products: any[]) {
  try {
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  } catch (error) {
    console.error("Error writing products:", error);
  }
}

async function readSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return { logoBase64: "" };
  }
}

async function writeSettings(settings: any) {
  try {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("Error writing settings:", error);
  }
}

async function sendTelegramMessage(message: string) {
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
    });
  } catch (error: any) {
    console.error("Error sending Telegram message:", error.response?.data || error.message);
  }
}

async function sendTelegramPhoto(photo: string, caption: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === "YOUR_BOT_TOKEN") {
    console.log("Telegram credentials not set. Skipping notification.");
    return;
  }

  try {
    // If it's a base64 string, we need to handle it differently or just send as text if it fails
    // For simplicity, if it's a URL, sendPhoto works directly.
    // If it's base64, we'll try to send it as a URL first (which will fail) or just fallback to sendMessage
    
    if (photo.startsWith("data:image")) {
      // Telegram sendPhoto doesn't support raw base64 strings directly in the JSON body.
      // We would need multipart/form-data. 
      // As a fallback for this specific request, we'll send the message with the caption.
      // But let's try to send the photo if it's a URL.
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: `[Image Attached (Base64)]\n\n${caption}`,
        parse_mode: "Markdown",
      });
    } else {
      await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, {
        chat_id: chatId,
        photo: photo,
        caption: caption,
        parse_mode: "Markdown",
      });
    }
  } catch (error: any) {
    console.error("Error sending Telegram photo:", error.response?.data || error.message);
    // Fallback to text message if photo fails
    await sendTelegramMessage(caption);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/products", async (req, res) => {
    const products = await readProducts();
    res.json(products);
  });

  app.get("/api/settings", async (req, res) => {
    const settings = await readSettings();
    res.json(settings);
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

  app.post("/api/order", async (req, res) => {
    const orderData = req.body;
    console.log("New Order Received:", orderData);

    // Format Telegram Message
    const itemsList = orderData.items
      .map((item: any) => `- ${item.name} (x${item.quantity}) - $${item.price * item.quantity}`)
      .join("\n");

    const message = `
🚀 *New Order Received!*

👤 *Customer:* ${orderData.customerName}
📞 *Phone:* ${orderData.phone}
📍 *Address:* ${orderData.address}

📦 *Items:*
${itemsList}

💰 *Total Price:* $${orderData.total.toFixed(2)}
    `;

    const firstItemImage = orderData.items[0]?.image;

    if (firstItemImage) {
      await sendTelegramPhoto(firstItemImage, message);
    } else {
      await sendTelegramMessage(message);
    }

    res.status(201).json({ 
      message: "Order placed successfully!", 
      orderId: Math.random().toString(36).substr(2, 9) 
    });
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
  });
}

startServer();
