import os
import json
import asyncio
import logging
import requests
from datetime import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from dotenv import load_dotenv

# Muhit o'zgaruvchilarini yuklash
load_dotenv()

# Render sozlamalaridan to'g'ri nomlar bilan chaqiramiz
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

# Aktiv taymerlarni kuzatish
active_timers = {}

class OrderStates(StatesGroup):
    waiting_for_receipt = State()
    waiting_for_support_message = State()

def load_orders():
    try:
        if os.path.exists(ORDERS_FILE):
            with open(ORDERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception: return []
    return []

def load_settings():
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception: pass
    return {"cardNumber": "8600 0000 0000 0000", "cardName": "S STORE Admin"}

def save_orders(orders):
    os.makedirs(os.path.dirname(ORDERS_FILE), exist_ok=True)
    with open(ORDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(orders, f, indent=2, ensure_ascii=False)

def update_order_status(order_id, status, extra_fields=None):
    orders = load_orders()
    updated = False
    for order in orders:
        if str(order.get("id")) == str(order_id) or order.get("id") == f"#S-{order_id}":
            order["status"] = status
            if extra_fields: order.update(extra_fields)
            updated = True
            break
    if updated: save_orders(orders)
    return updated

async def order_timeout_task(order_id, user_id):
    """30 daqiqalik taymer"""
    await asyncio.sleep(1800) 
    if order_id in active_timers:
        update_order_status(order_id, "Expired")
        await bot.send_message(user_id, "⚠️ To'lov vaqti tugadi va buyurtma bekor qilindi.")
        del active_timers[order_id]

@dp.message(CommandStart())
async def start_handler(message: types.Message, state: FSMContext):
    args = message.text.split()
    if len(args) > 1:
        try:
            # Format: ORDER_123_PRICE_50000
            parts = args[1].split("_")
            order_id, price = parts[1], parts[3]
            await state.update_data(order_id=order_id, price=price)
            await state.set_state(OrderStates.waiting_for_receipt)
            
            settings = load_settings()
            text = (
                f"📦 *Buyurtma #{order_id}*\n"
                f"To'lov summasi: *{int(price):,} UZS*\n"
                f"Karta: `{settings['cardNumber']}`\n\n"
                f"📸 *Iltimos, chekni shu yerga yuboring (30 daqiqa vaqt).* "
            )
            await message.answer(text, parse_mode="Markdown")
            active_timers[order_id] = asyncio.create_task(order_timeout_task(order_id, message.from_user.id))
        except Exception:
            await message.answer("❌ Havola noto'g'ri.")
    else:
        await message.answer("S STORE Botga xush kelibsiz!")

@dp.message(OrderStates.waiting_for_receipt, F.photo)
async def handle_receipt(message: types.Message, state: FSMContext):
    data = await state.get_data()
    order_id = data.get("order_id")
    
    if order_id in active_timers:
        active_timers[order_id].cancel()
        del active_timers[order_id]

    # Admin xabari
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ Tasdiqlash", callback_data=f"confirm_{order_id}_{message.from_user.id}"),
        InlineKeyboardButton(text="❌ Rad etish", callback_data=f"reject_{order_id}_{message.from_user.id}")
    ]])

    await bot.send_photo(
        chat_id=ADMIN_ID,
        photo=message.photo[-1].file_id,
        caption=f"📩 *Yangi to'lov!*\nID: #{order_id}\nFoydalanuvchi: {message.from_user.full_name}",
        parse_mode="Markdown",
        reply_markup=kb
    )
    await message.answer("⏳ To'lov yuborildi. Admin tasdiqlashini kuting.")
    await state.clear()

@dp.callback_query(F.data.startswith("confirm_"))
async def confirm_payment(callback: types.CallbackQuery):
    _, order_id, user_id = callback.data.split("_")
    update_order_status(order_id, "Paid")
    await bot.send_message(user_id, f"✅ To'lovingiz tasdiqlandi! Buyurtma #{order_id} tayyor.")
    await callback.message.delete()
    await callback.answer("Tasdiqlandi")

@dp.callback_query(F.data.startswith("reject_"))
async def reject_payment(callback: types.CallbackQuery):
    _, order_id, user_id = callback.data.split("_")
    update_order_status(order_id, "Rejected")
    await bot.send_message(user_id, f"❌ To'lov rad etildi (Buyurtma #{order_id}). Qayta yuboring.")
    await callback.message.delete()
    await callback.answer("Rad etildi")

async def main():
    # To'qnashuvni oldini olish
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())