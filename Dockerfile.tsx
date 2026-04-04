# Node.js muhitini tanlaymiz
FROM node:20-slim

# Python va Pip-ni o'rnatamiz
RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app

# Node.js kutubxonalarini o'rnatish
COPY package*.json ./
RUN npm install

# Python kutubxonalarini o'rnatish (aiogram uchun)
COPY requirements.txt ./
RUN pip3 install -r requirements.txt --break-system-packages

# Barcha fayllarni nusxalash
COPY . .

# Frontendni build qilish
RUN npm run build

# Portni ochish (Render uchun)
EXPOSE 10000

# Bir vaqtning o'zida ham Botni, ham Serverni ishga tushirish
CMD python3 bot.py & npm run dev