import os
import asyncio
import logging
from threading import Thread
from flask import Flask
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from dotenv import load_dotenv

# Muhit o'zgaruvchilari
load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ADMIN_ID = os.getenv("TELEGRAM_CHAT_ID")

# 1. FLASK (VEB-SAYT) QISMI
app = Flask(__name__)

@app.route('/')
def home():
    return """
    <!DOCTYPE html>
    <html lang="uz">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>S STORE - Online Do'kon</title>
        <style>
            body { font-family: sans-serif; background-color: #f0f2f5; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
            .header { background: #0088cc; color: white; width: 100%; padding: 20px; text-align: center; border-radius: 0 0 20px 20px; margin-bottom: 30px; font-size: 24px; font-weight: bold; }
            .container { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; max-width: 1000px; width: 100%; }
            .card { background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
            .card h3 { margin: 10px 0; color: #333; }
            .price { font-size: 1.2em; color: #e74c3c; font-weight: bold; margin: 10px 0; }
            .btn { background: #0088cc; color: white; text-decoration: none; padding: 10px 25px; border-radius: 8px; display: inline-block; font-weight: bold; transition: 0.3s; }
            .btn:hover { background: #006699; transform: scale(1.05); }
        </style>
    </head>
    <body>
        <div class="header">S STORE ACCESSORIES</div>
        <div class="container">
            <div class="card">
                <h3>iPhone 15 Pro Case</h3>
                <p>Premium silikon chexol</p>
                <div class="price">120 000 UZS</div>
                <a href="https://t.me/SSTOREPaymet_bot?start=ORDER_1001_PRICE_120000" class="btn">Sotib olish</a>
            </div>
            <div class="card">
                <h3>AirPods Pro 2</h3>
                <p>Lux copy (Top sifat)</p>
                <div class="price">350 000 UZS</div>
                <a href="https://t.me/SSTOREPaymet_bot?start=ORDER_1002_PRICE_350000" class="btn">Sotib olish</a>
            </div>
        </div>
    </body>
    </html>
    """

# 2. BOT QISMI
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
            await state.update_data(order_id=order_id, price=price)
            await state.set_state(OrderStates.waiting_for_receipt)
            await message.answer(f"📦 Buyurtma #{order_id}\n💰 To'lov: {int(price):,} UZS\n\nIltimos, to'lov chekini rasm ko'rinishida yuboring.")
        except:
            await message.answer("❌ Havola xato.")
    else:
        await message.answer("S STORE Botiga xush kelibsiz! Saytdan mahsulot tanlang.")

@dp.message(OrderStates.waiting_for_receipt, F.photo)
async def handle_receipt(message: types.Message, state: FSMContext):
    data = await state.get_data()
    order_id = data.get("order_id")
    await bot.send_photo(ADMIN_ID, message.photo[-1].file_id, caption=f"📩 Yangi to'lov!\nID: #{order_id}\nKimdan: {message.from_user.full_name}")
    await message.answer("⏳ To'lov yuborildi, admin tasdiqlashini kuting.")
    await state.clear()

# 3. SERVERNI ISHGA TUSHIRISH
def run_flask():
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)

async def main():
    await bot.delete_webhook(drop_pending_updates=True)
    Thread(target=run_flask).start()
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())