
import aiohttp
import asyncio
import re

async def fetch(symbol):
    url = f"https://hq.sinajs.cn/list={symbol}"
    headers = {
        "Referer": "https://finance.sina.com.cn",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            text = await response.text(encoding='gbk')
            print(f"--- {symbol} ---")
            print(f"Raw: {text.strip()}")
            
            match = re.search(r'"([^"]+)"', text)
            if match:
                data = match.group(1).split(',')
                for i, d in enumerate(data):
                    print(f"[{i}] {d}")

async def main():
    await fetch("fx_sxauusd")
    await fetch("fx_susdtwd")
    await fetch("hf_GC")

if __name__ == "__main__":
    asyncio.run(main())
