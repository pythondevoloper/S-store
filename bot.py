import os
import json
import asyncio
import logging
import requests
from datetime import datetime, timedelta
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from dotenv import load_dotenv

from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

# Load environment variables
load_dotenv()

def load_settings():
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logging.error(f"Error loading settings: {e}")
    return {"cardNumber": "8600 0000 0000 0000", "cardName": "Shohidbek M.", "bots": []}

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ADMIN_ID = os.getenv("TELEGRAM_CHAT_ID")
ORDERS_FILE = "data/orders.json"
SETTINGS_FILE = "data/settings.json"

# If token is missing, try loading from settings.json
if not TOKEN:
    settings = load_settings()
    active_bot = next((b for b in settings.get("bots", []) if b.get("status") == "active"), None)
    if not active_bot and settings.get("bots"):
        active_bot = settings["bots"][0]
    
    if active_bot:
        TOKEN = active_bot.get("token")
        logging.info(f"Loaded token from settings.json for bot {active_bot.get('username')}")

if not TOKEN:
    logging.error("CRITICAL: TELEGRAM_BOT_TOKEN is not set in environment or settings.json!")

# Configure logging
logging.basicConfig(level=logging.INFO)

if not TOKEN:
    # We can't initialize the bot without a token.
    # But we'll let it fail at Bot(token=TOKEN) to match the previous behavior
    # but with a clearer error message above.
    pass

bot = Bot(token=TOKEN)
dp = Dispatcher()

# Track active timeout tasks
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
        logging.error(f"Error loading orders: {e}")
    return []

def save_orders(orders):
    try:
        # Ensure data directory exists
        os.makedirs(os.path.dirname(ORDERS_FILE), exist_ok=True)
        with open(ORDERS_FILE, "w", encoding="utf-8") as f:
            json.dump(orders, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Error saving orders: {e}")

def update_order_status(order_id, status, extra_fields=None):
    orders = load_orders()
    updated = False
    for order in orders:
        # Match #S-1024 or S-1024 or 1024
        if order.get("id") == order_id or \
           order.get("id") == f"#S-{order_id}" or \
           order.get("id") == f"S-{order_id}":
            order["status"] = status
            if extra_fields:
                order.update(extra_fields)
            updated = True
            break
    if updated:
        save_orders(orders)
    return updated

async def order_timeout_task(order_id, user_id, message_id):
    """Background task to handle 30-minute timeout"""
    try:
        # 30 minutes = 1800 seconds
        # We can update the message every 5 minutes to show remaining time
        for remaining in range(30, 0, -5):
            if order_id not in active_timers:
                return # Task was cancelled (receipt received)
            
            # Update message with remaining time (optional visual feedback)
            if remaining < 30:
                try:
                    await bot.edit_message_text(
                        chat_id=user_id,
                        message_id=message_id,
                        text=(
                            f"⏳ *To'lov kutilmoqda...*\n"
                            f"Vaqt tugashiga: *{remaining} daqiqa* qoldi.\n\n"
                            f"Iltimos, chekni yuboring, aks holda buyurtma bekor qilinadi."
                        ),
                        parse_mode="Markdown"
                    )
                except Exception:
                    pass # Message might have been deleted or not changed
            
            await asyncio.sleep(300) # Wait 5 minutes
            
        # If we reached here, time is up
        if order_id in active_timers:
            update_order_status(order_id, "Expired")
            await bot.send_message(user_id, "⚠️ Buyurtma vaqti tugadi va u bekor qilindi. Iltimos, qaytadan buyurtma bering.")
            await bot.send_message(ADMIN_ID, f"Order #{order_id} was cancelled due to timeout.")
            del active_timers[order_id]
            
    except asyncio.CancelledError:
        pass # Task was cancelled normally
    except Exception as e:
        logging.error(f"Error in timeout task: {e}")

@dp.message(CommandStart())
async def start_handler(message: types.Message, state: FSMContext):
    args = message.text.split()
    if len(args) > 1:
        payload = args[1]
        # Format: ORDER_1024_PRICE_1500000
        try:
            parts = payload.split("_")
            order_id = parts[1]
            price = parts[3]
            
            # Store in FSM
            await state.update_data(order_id=order_id, price=price)
            await state.set_state(OrderStates.waiting_for_receipt)
            
            # Format price with separators
            formatted_price = "{:,}".format(int(price)).replace(",", " ")
            
            # Load dynamic settings
            settings = load_settings()
            payment_type = settings.get("paymentType", "card")
            
            # Store order_time in orders.json
            order_time = datetime.now().isoformat()
            update_order_status(order_id, "Awaiting Payment", {"order_time": order_time})
            
            if payment_type == "wallet":
                wallet_number = settings.get("walletNumber", "+998 90 123 45 67")
                wallet_name = settings.get("walletName", "Shohidbek M.")
                clean_phone = wallet_number.replace(" ", "").replace("+", "")
                click_link = f"https://my.click.uz/services/p2p?phone={clean_phone}&amount={price}"
                
                text = (
                    f"🚀 *Buyurtma #{order_id} tasdiqlandi.*\n\n"
                    f"Iltimos, *{formatted_price} UZS* miqdoridagi to'lovni *Click Hamyon* orqali amalga oshiring:\n"
                    f"📱 `{wallet_number}` ({wallet_name})\n\n"
                    f"⚠️ *Sizda to'lovni amalga oshirish va chekni yuborish uchun 30 daqiqa vaqt bor.*\n"
                    f"Aks holda buyurtma avtomatik bekor qilinadi.\n\n"
                    f"📸 *To'lovdan so'ng, chekni (skrinshot) shu yerga yuboring.*"
                )
                btn_text = "📱 Click Hamyon bilan to'lash"
            else:
                card_number = settings.get("cardNumber", "8600 0000 0000 0000")
                card_name = settings.get("cardName", "Shohidbek M.")
                clean_card = card_number.replace(" ", "")
                click_link = f"https://my.click.uz/services/p2p?card_number={clean_card}&amount={price}"
                
                text = (
                    f"🚀 *Order #{order_id} confirmed.*\n\n"
                    f"Please transfer *{formatted_price} UZS* to this card:\n"
                    f"💳 `{card_number}` ({card_name})\n\n"
                    f"⚠️ *Sizda to'lovni amalga oshirish va chekni yuborish uchun 30 daqiqa vaqt bor.*\n"
                    f"Aks holda buyurtma avtomatik bekor qilinadi.\n\n"
                    f"📸 *After paying, send a screenshot of the receipt here.*"
                )
                btn_text = "💳 Click orqali to'lash"
            
            builder = InlineKeyboardBuilder()
            builder.row(InlineKeyboardButton(text=btn_text, url=click_link))
            
            sent_msg = await message.answer(text, reply_markup=builder.as_markup(), parse_mode="Markdown")
            
            # Start timeout timer
            task = asyncio.create_task(order_timeout_task(order_id, message.from_user.id, sent_msg.message_id))
            active_timers[order_id] = task
            
        except Exception as e:
            logging.error(f"Start handler error: {e}")
            await message.answer("❌ Invalid order link. Please try again from the website.")
    else:
        builder = InlineKeyboardBuilder()
        builder.row(InlineKeyboardButton(text="👨‍💻 Qo'llab-quvvatlash", callback_data="support_contact"))
        await message.answer(
            "Welcome to S STORE Payment Bot! Please use the checkout link from our website.",
            reply_markup=builder.as_markup()
        )

@dp.callback_query(F.data == "support_contact")
async def support_contact_handler(callback: types.CallbackQuery, state: FSMContext):
    await state.set_state(OrderStates.waiting_for_support_message)
    await callback.message.answer(
        "📝 *Xabaringizni yozing...*\n\n"
        "Admin tez orada sizga javob beradi.",
        parse_mode="Markdown"
    )
    await callback.answer()

@dp.message(OrderStates.waiting_for_support_message)
async def support_message_received(message: types.Message, state: FSMContext):
    await state.clear()
    
    # Forward to Admin
    admin_msg = (
        f"📩 *Yangi xabar!*\n\n"
        f"👤 *Foydalanuvchi*: {message.from_user.full_name}\n"
        f"🆔 ID: `{message.from_user.id}`\n"
        f"💬 *Xabar*: {message.text}"
    )
    
    try:
        await bot.send_message(chat_id=ADMIN_ID, text=admin_msg, parse_mode="Markdown")
        await message.answer("✅ *Xabaringiz yuborildi!* Tez orada javob olasiz.", parse_mode="Markdown")
    except Exception as e:
        logging.error(f"Error forwarding to admin: {e}")
        await message.answer("❌ *Xatolik yuz berdi.* Iltimos, keyinroq urinib ko'ring.")

@dp.message(F.chat.id == int(ADMIN_ID) if ADMIN_ID and ADMIN_ID.strip().isdigit() else F.chat.id == 0)
async def admin_reply_handler(message: types.Message):
    """Handle admin replies to forward back to user"""
    if message.reply_to_message and "🆔 ID: " in message.reply_to_message.text:
        try:
            # Extract user ID from the original message text
            user_id_line = [line for line in message.reply_to_message.text.split("\n") if "🆔 ID: " in line][0]
            user_id = user_id_line.replace("🆔 ID: ", "").strip().replace("`", "")
            
            reply_text = (
                f"👨‍💻 *Admin javobi:*\n\n"
                f"{message.text}"
            )
            
            await bot.send_message(chat_id=user_id, text=reply_text, parse_mode="Markdown")
            await message.reply("✅ *Javob yuborildi!*")
        except Exception as e:
            logging.error(f"Error replying to user: {e}")
            await message.reply("❌ *Xatolik:* Foydalanuvchiga yuborib bo'lmadi.")

@dp.message(OrderStates.waiting_for_receipt, F.photo)
async def handle_receipt(message: types.Message, state: FSMContext):
    data = await state.get_data()
    order_id = data.get("order_id")
    price = data.get("price")
    
    # Stop the timer
    if order_id in active_timers:
        active_timers[order_id].cancel()
        del active_timers[order_id]
    
    # AI OCR Processing
    ocr_status = "⏳ OCR processing..."
    await message.answer(f"📸 *Receipt received!* {ocr_status}")
    
    ocr_result = None
    try:
        # Get file path
        file = await bot.get_file(message.photo[-1].file_id)
        file_path = file.file_path
        
        # Download image
        token = os.getenv("TELEGRAM_BOT_TOKEN")
        img_url = f"https://api.telegram.org/file/bot{token}/{file_path}"
        img_response = requests.get(img_url)
        
        if img_response.status_code == 200:
            import base64
            img_base64 = base64.b64encode(img_response.content).decode('utf-8')
            
            # Call Server OCR API
            # Note: Using localhost since bot and server are in the same container
            api_res = requests.post("http://localhost:3000/api/ocr/receipt", json={"imageBase64": img_base64})
            if api_res.status_code == 200:
                ocr_result = api_res.json()
    except Exception as e:
        logging.error(f"OCR Error: {e}")

    # AI Verification Logic
    ai_match = "❌ No match found"
    extracted_amount = 0
    if ocr_result:
        extracted_amount = ocr_result.get("amount", 0)
        # Check if amount matches (allow small difference or exact match)
        if abs(extracted_amount - int(price)) < 100:
            ai_match = "✅ AI MATCH: Amount matches!"
        else:
            ai_match = f"⚠️ AI ALERT: Amount mismatch! (Extracted: {extracted_amount} UZS)"

    caption = (
        f"📩 *New Payment Receipt*\n"
        f"Order ID: *#{order_id}*\n"
        f"Expected: *{price} UZS*\n"
        f"Extracted: *{extracted_amount} UZS*\n"
        f"From: {message.from_user.full_name} (@{message.from_user.username})\n\n"
        f"🤖 *AI Analysis*: {ai_match}\n\n"
        f"Please verify and click below."
    )
    
    admin_msg = await bot.send_photo(
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
    
    # Store admin_message_id, userId, and OCR results in orders.json
    update_order_status(order_id, "Awaiting Approval", {
        "admin_message_id": admin_msg.message_id,
        "userId": message.from_user.id,
        "ocr_amount": extracted_amount,
        "ai_match": ai_match
    })
    
    await message.answer("⏳ *To'lov tekshirilmoqda...* Admin tez orada to'lovingizni tasdiqlaydi. Sizga xabar beramiz.")
    await state.clear()

@dp.callback_query(F.data.startswith("confirm_"))
async def confirm_payment(callback: types.CallbackQuery):
    parts = callback.data.split("_")
    order_id = parts[1]
    user_id = parts[2]
    
    # Update orders.json
    update_order_status(order_id, "Paid")
    
    await bot.send_message(user_id, f"✅ *Sizning to'lovingiz tasdiqlandi!* Buyurtmangiz *#{order_id}* tayyorlanmoqda va tez orada yuboriladi. S STORE bilan birga bo'lganingiz uchun rahmat!")
    
    # Delete the admin notification message
    try:
        await callback.message.delete()
    except Exception as e:
        logging.error(f"Error deleting admin message: {e}")
        
    await callback.answer("To'lov tasdiqlandi.")

@dp.callback_query(F.data.startswith("reject_"))
async def reject_payment(callback: types.CallbackQuery):
    parts = callback.data.split("_")
    order_id = parts[1]
    user_id = parts[2]
    
    # Update orders.json
    update_order_status(order_id, "Rejected")
    
    await bot.send_message(user_id, f"❌ *To'lov rad etildi.* Buyurtma *#{order_id}* uchun yuborilgan chekda muammo bor. Iltimos, yordam uchun @SstoreSupport bilan bog'laning.")
    
    # Delete the admin notification message
    try:
        await callback.message.delete()
    except Exception as e:
        logging.error(f"Error deleting admin message: {e}")
        
    await callback.answer("To'lov rad etildi.")

@dp.callback_query(F.data.startswith("pay_confirm_"))
async def pay_confirm_handler(callback: types.CallbackQuery):
    order_id = callback.data.replace("pay_confirm_", "")
    update_order_status(order_id, "Paid")
    await callback.message.edit_caption(
        caption=callback.message.caption + "\n\n✅ *TASDIQLANDI*",
        parse_mode="Markdown"
    )
    await callback.answer("Buyurtma tasdiqlandi.")

@dp.callback_query(F.data.startswith("pay_cancel_"))
async def pay_cancel_handler(callback: types.CallbackQuery):
    order_id = callback.data.replace("pay_cancel_", "")
    update_order_status(order_id, "Rejected")
    await callback.message.edit_caption(
        caption=callback.message.caption + "\n\n❌ *BEKOR QILINDI*",
        parse_mode="Markdown"
    )
    await callback.answer("Buyurtma bekor qilindi.")

async def main():
    print("Bot is starting...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
