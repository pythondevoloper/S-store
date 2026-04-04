import os
import asyncio
import logging
from threading import Thread
from flask import Flask
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

# Render Environment Variables
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ADMIN_ID = os.getenv("TELEGRAM_CHAT_ID")

# 1. VEB-SAYT (FLASK) QISMI
app = Flask(__name__)

@app.route('/')
def home():
    # Sayt dizayni (HTML/CSS)
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>S STORE - Aksessuarlar</title>
        <style>
            body { font-family: sans-serif; text-align: center; background-color: #f4f4f4; padding: 50px; }
            .card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); display: inline-block; width: 250px; }
            .btn { background: #0088cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px; }
        </style>
    </head>
    <body>
        <h1>S STORE ACCESSORIES</h1>
        <div class="card">
            <h3>iPhone 15 Pro Case</h3>
            <p>120 000 UZS</p>
            <a href="https://t.me/SSTOREPaymet_bot?start=ORDER_1001_PRICE_120000" class="btn">Sotib olish</a>
        </div>
    </body>
    </html>
    """

# 2. TELEGRAM BOT (AIOGRAM) QISMI
logging.basicConfig(level=logging.INFO)
bot = Bot(token=TOKEN)
dp = Dispatcher()

class OrderStates(StatesGroup):
    waiting_for_receipt = State()

@dp.message(CommandStart())
async def start_handler(message: types.Message, state: FSMContext):
    args = message.text.split()
    if len(args) > 1:
        try:
            parts = args[1].split("_")
            order_id, price = parts[1], parts[3]
            await state.update_data(order_id=order_id)
            await state.set_state(OrderStates.waiting_for_receipt)
            await message.answer(f"📦 Buyurtma #{order_id}\n💰 To'lov: {int(price):,} UZS\n\nIltimos, chekni rasm sifatida yuboring.")
        except:
            await message.answer("❌ Xato havola.")
    else:
        await message.answer("S STORE Botiga xush kelibsiz!")

@dp.message(OrderStates.waiting_for_receipt, F.photo)
async def handle_receipt(message: types.Message, state: FSMContext):
    data = await state.get_data()
    await bot.send_photo(ADMIN_ID, message.photo[-1].file_id, caption=f"📩 Yangi to'lov: #{data.get('order_id')}")
    await message.answer("⏳ To'lov yuborildi, admin tasdiqlashini kuting.")
    await state.clear()

# 3. ISHGA TUSHIRISH (PORT VA CONFLICT MUAMMOSI YECHIMI)
def run_flask():
    # Render talab qiladigan portni sozlash
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)

async def main():
    # Conflict xatosini oldini olish uchun webhookni tozalash
    await bot.delete_webhook(drop_pending_updates=True)
    # Flaskni alohida oqimda ishga tushirish
    Thread(target=run_flask).start()
    # Botni polling rejimida boshlash
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logging.info("Bot to'xtatildi.")