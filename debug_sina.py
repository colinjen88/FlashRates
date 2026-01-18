
import asyncio
import aiohttp
from backend.http_client import get_text, close_session

async def check_sina():
    url = "https://hq.sinajs.cn/list=fx_susdtwd"
    headers = {"Referer": "https://finance.sina.com.cn"}
    status, text = await get_text(url, headers=headers, encoding="gbk")
    print(f"Status: {status}")
    print(f"Text: {text}")
    await close_session()

if __name__ == "__main__":
    asyncio.run(check_sina())
