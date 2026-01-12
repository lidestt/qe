from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
bot = Bot(token="ВАШ_ТОКЕН_ЗДЕСЬ")
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    builder = InlineKeyboardBuilder()
    builder.button(
        text="📱 Открыть приложение",
        web_app=WebAppInfo(url="https://ВАШ_ДОМЕН.github.io/frontend/")
    )
    
    await message.answer(
        "👋 Добро пожаловать в MeetApp!\n\n"
        "Нажмите кнопку ниже, чтобы открыть мини-приложение для знакомств:",
        reply_markup=builder.as_markup()
    )

@dp.message(Command("app"))
async def cmd_app(message: types.Message):
    builder = InlineKeyboardBuilder()
    builder.button(
        text="✨ Открыть MeetApp",
        web_app=WebAppInfo(url="https://ВАШ_ДОМЕН.github.io/frontend/")
    )
    
    await message.answer(
        "Откройте мини-приложение для знакомств:",
        reply_markup=builder.as_markup()
    )

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())