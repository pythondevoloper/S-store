import os
import json
import asyncio
import logging
import requests
from datetime import datetime
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from dotenv import load_dotenv

from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

# Muhit o'zgaruvchilarini yuklash
load_dotenv()

# Render sozlamalaridagi Environment Variables nomlari bilan bir xil bo'lishi shart
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ADMIN_ID = os.getenv("TELEGRAM_CHAT_ID")
ORDERS_FILE = "data/orders.json"
SETTINGS_FILE = "data/settings.json"

# Loggingni sozlash
logging.basicConfig(level=logging.INFO)

if not TOKEN:
    logging.error("Xatolik: TELEGRAM_BOT_TOKEN topilmadi!")
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
    except Exception as e:
        logging.error(f"Buyurtmalarni yuklashda xatolik: {e}")
    return []

def load_settings():
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logging.error(f"Sozlamalarni yuklashda xatolik: {e}")
    return {"cardNumber": "8600 0000 0000 0000", "cardName": "S STORE Admin"}

def save_orders(orders):
    try:
        os.makedirs(os.path.dirname(ORDERS_FILE), exist_ok=True)
        with open(ORDERS_FILE, "w", encoding="utf-8") as f:
            json.dump(orders, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Saqlashda xatolik: {e}")

def update_order_status(order_id, status, extra_fields=None):
    orders = load_orders()
    updated = False
    for order in orders:
        if str(order.get("id")) == str(order_id) or order.get("id") == f"#S-{order_id}":
            order["status"] = status
            if extra_fields:
                order.update(extra_fields)
            updated = True
            break
    if updated:
        save_orders(orders)
    return updated

async def order_timeout_task(order_id, user_id, message_id):
    """30 daqiqalik taymer"""
    try:
        await asyncio.sleep(1800) 
        if order_id in active_timers:
            update_order_status(order_id, "Expired")
            await bot.send_message(user_id, "⚠️ To'lov vaqti tugadi va buyurtma bekor qilindi.")
            del active_timers[order_id]
    except Exception as e:
        logging.error(f"Taymer xatosi: {e}")

@dp.message(CommandStart())
async def start_handler(message: types.Message, state: FSMContext):
    args = message.text.split()
    if len(args) > 1:
        try:
            payload = args[1]
            parts = payload.split("_")
            order_id = parts[1]
            price = parts[3]
            
            await state.update_data(order_id=order_id, price=price)
            await state.set_state(OrderStates.waiting_for_receipt)
            
            formatted_price = "{:,}".format(int(price)).replace(",", " ")
            settings = load_settings()
            card_num = settings.get("cardNumber")
            
            text = (
                f"🚀 *Buyurtma #{order_id} tasdiqlandi.*\n\n"
                f"To'lov miqdori: *{formatted_price} UZS*\n"
                f"Karta: `{card_num}`\n\n"
                f"📸 *To'lovdan so'ng chekni (skrinshot) shu yerga yuboring.*"
            )
            
            sent_msg = await message.answer(text, parse_mode="Markdown")
            active_timers[order_id] = asyncio.create_task(order_timeout_task(order_id, message.from_user.id, sent_msg.message_id))
        except Exception:
            await message.answer("❌ Xatolik! Saytdan qayta urinib ko'ring.")
    else:
        await message.answer("S STORE to'lov botiga xush kelibsiz!")

@dp.message(OrderStates.waiting_for_receipt, F.photo)
async def handle_receipt(message: types.Message, state: FSMContext):
    data = await state.get_data()
    order_id = data.get("order_id")
    price = data.get("price")
    
    if order_id in active_timers:
        active_timers[order_id].cancel()
        del active_timers[order_id]

    # Admin xabari va OCR tahlili (Server bilan bog'liqlik tuzatilgan)
    caption = (
        f"📩 *Yangi to'lov cheki*\n"
        f"Buyurtma ID: *#{order_id}*\n"
        f"Kutilgan summa: *{price} UZS*\n"
        f"Foydalanuvchi: {message.from_user.full_name} (@{message.from_user.username})\n\n"
        f"🤖 *AI Analysis*: To'lovni qo'lda tekshiring."
    )
    
    try:
        await bot.send_photo(
            chat_id=ADMIN_ID,
            photo=message.photo[-1].file_id,
            caption=caption,
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [
                    InlineKeyboardButton(text="✅ Tasdiqlash", callback_data=f"confirm_{order_id}_{message.from_user.id}"),
                    InlineKeyboardButton(text="❌ Rad etish", callback_data=f"reject_{order_id}_{message.from_user.id}")
                ]
            ])
        )
        await message.answer("⏳ *To'lov yuborildi!* Admin tez orada tasdiqlaydi.")
    except Exception as e:
        logging.error(f"Xabar yuborishda xato: {e}")
    
    await state.clear()

@dp.callback_query(F.data.startswith("confirm_"))
async def confirm_payment(callback: types.CallbackQuery):
    _, order_id, user_id = callback.data.split("_")
    update_order_status(order_id, "Paid")
    await bot.send_message(user_id, f"✅ To'lovingiz tasdiqlandi! Buyurtma #{order_id} tayyorlanmoqda.")
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
    logging.info("Bot ishga tushmoqda...")
    await bot.delete_webhook(drop_pending_updates=True) # To'qnashuvni oldini olish
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())