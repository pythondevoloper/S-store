import os
import json
import asyncio
import logging
import requests
from threading import Thread
from flask import Flask
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from dotenv import load_dotenv

# Muhit o'zgaruvchilari
load_dotenv()
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ADMIN_ID = os.getenv("TELEGRAM_CHAT_ID")

# 1. FLASK SAYT QISMI
app = Flask(__name__)

@app.route('/')
def home():
    return "<h1>S STORE Sayti va Boti ishlamoqda!</h1><p>Render'da muvaffaqiyatli ishga tushdi.</p>"

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
        # Format: ORDER_ID_PRICE_SUMMA
        parts = args[1].split("_")
        order_id, price = parts[1], parts[3]
        await state.update_data(order_id=order_id, price=price)
        await state.set_state(OrderStates.waiting_for_receipt)
        await message.answer(f"📦 Buyurtma #{order_id}\nSumma: {int(price):,} UZS\n\nIltimos, chekni yuboring.")
    else:
        await message.answer("S STORE Botga xush kelibsiz!")

@dp.message(OrderStates.waiting_for_receipt, F.photo)
async def handle_receipt(message: types.Message, state: FSMContext):
    data = await state.get_data()
    order_id = data.get("order_id")
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ Tasdiqlash", callback_data=f"confirm_{order_id}_{message.from_user.id}"),
        InlineKeyboardButton(text="❌ Rad etish", callback_data=f"reject_{order_id}_{message.from_user.id}")
    ]])
    await bot.send_photo(ADMIN_ID, message.photo[-1].file_id, caption=f"Yangi to'lov: #{order_id}", reply_markup=kb)
    await message.answer("⏳ To'lov yuborildi. Admin tasdiqlashini kuting.")
    await state.clear()

# 3. ISHGA TUSHIRISH (Flask va Botni birlashtirish)
def run_flask():
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)

async def main():
    # Conflict xatosini oldini olish
    await bot.delete_webhook(drop_pending_updates=True)
    # Flaskni alohida oqimda ishga tushiramiz
    Thread(target=run_flask).start()
    # Botni polling rejimida boshlaymiz
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())