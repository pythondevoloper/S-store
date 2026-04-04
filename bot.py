import os
import asyncio
import logging
from aiogram import Bot, Dispatcher, types
from flask import Flask, render_template_string
from threading import Thread

# Flask ilovasi (Sayt qismi)
app = Flask(__name__)

@app.route('/')
def index():
    return "<h1>S STORE Sayti ishlamoqda!</h1><p>Bot ham faol.</p>"

# Bot qismi
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
bot = Bot(token=TOKEN)
dp = Dispatcher()

async def start_bot():
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

def run_flask():
    # Render portni avtomatik beradi
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)

if __name__ == "__main__":
    # Flaskni alohida oqimda ishga tushirish
    Thread(target=run_flask).start()
    # Botni asosiy oqimda ishga tushirish
    asyncio.run(start_bot())