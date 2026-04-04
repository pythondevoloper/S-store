import os
import json
import asyncio
import logging
import requests
import base64
from datetime import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from dotenv import load_dotenv

# Muhit o'zgaruvchilarini yuklash
load_dotenv()

# Render sozlamalaridan o'zgaruvchilarni olish
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ADMIN_ID = os.getenv("TELEGRAM_CHAT_ID")
ORDERS_FILE = "data/orders.json"
SETTINGS_FILE = "data/settings.json"

# Loggingni sozlash
logging.basicConfig(level=logging.INFO)

if not TOKEN:
    logging.error("TELEGRAM_BOT_TOKEN topilmadi!")
    exit(1)

bot = Bot(token=TOKEN)
dp = Dispatcher()

# Aktiv taymerlar uchun lug'at
active_timers = {}

class OrderStates(StatesGroup):
    waiting_for_receipt = State()

def load_orders():
    try:
        if os.path.exists(ORDERS_FILE):
            with open(ORDERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logging.error(f"Orders yuklashda xato: {e}")
    return []

def load_settings():
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {"cardNumber": "8600 0000 0000 0000", "cardName": "S STORE Admin"}

def save_orders(orders):
    os.makedirs(os.path.dirname(ORDERS_FILE), exist_ok=True)
    with open(ORDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(orders, f, indent=2, ensure_ascii=False)

def update_status(order_id, status):
    orders = load_orders()
    for order in orders:
        if str(order.get("id")) == str(order_id):
            order["status"] = status
            save_orders(orders)
            return True
    return False

async def timeout_handler(order_id, user_id):
    await asyncio.sleep(1800) # 30 daqiqa
    if order_id in active_timers:
        update_status(order_id, "Expired")
        await bot.send_message(user_id, "⚠️ To'lov vaqti tugadi. Buyurtma bekor qilindi.")
        del active_timers[order_id]

@dp.message(CommandStart())
async def start(message: types.Message, state: FSMContext):
    args = message.text.split()
    if len(args) > 1:
        try:
            payload = args[1].split("_")
            order_id, price = payload[1], payload[3]
            await state.update_data(order_id=order_id, price=price)
            await state.set_state(OrderStates.waiting_for_receipt)
            
            settings = load_settings()
            text = (
                f"📦 *Buyurtma #{order_id}*\n"
                f"To'lov: *{int(price):,} UZS*\n"
                f"Karta: `{settings['cardNumber']}`\n\n"
                f"📸 Chekni shu yerga yuboring (30 daqiqa vaqt)."
            )
            await message.answer(text, parse_mode="Markdown")
            active_timers[order_id] = asyncio.create_task(timeout_handler(order_id, message.from_user.id))
        except Exception:
            await message.answer("❌ Xato havola.")
    else:
        await message.answer("S STORE Bot faol!")

@dp.message(OrderStates.waiting_for_receipt, F.photo)
async def handle_photo(message: types.Message, state: FSMContext):
    data = await state.get_data()
    order_id = data.get("order_id")
    
    if order_id in active_timers:
        active_timers[order_id].cancel()
        del active_timers[order_id]

    # Admin tugmalari
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ Tasdiqlash", callback_data=f"ok_{order_id}_{message.from_user.id}"),
        InlineKeyboardButton(text="❌ Rad etish", callback_data=f"no_{order_id}_{message.from_user.id}")
    ]])

    await bot.send_photo(
        chat_id=ADMIN_ID,
        photo=message.photo[-1].file_id,
        caption=f"📩 *Yangi to'lov!*\nID: #{order_id}\nKimdan: {message.from_user.full_name}",
        parse_mode="Markdown",
        reply_markup=kb
    )
    await message.answer("⏳ To'lov yuborildi, admin tasdiqlashini kuting.")
    await state.clear()

@dp.callback_query(F.data.startswith(("ok_", "no_")))
async def process_admin(callback: types.CallbackQuery):
    action, order_id, user_id = callback.data.split("_")
    if action == "ok":
        update_status(order_id, "Paid")
        await bot.send_message(user_id, f"✅ Buyurtma #{order_id} tasdiqlandi!")
    else:
        update_status(order_id, "Rejected")
        await bot.send_message(user_id, f"❌ Buyurtma #{order_id} rad etildi.")
    
    await callback.message.delete()
    await callback.answer()

async def main():
    await bot.delete_webhook(drop_pending_updates=True) # Conflict oldini olish
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())