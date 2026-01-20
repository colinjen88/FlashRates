
import asyncio
import sys
import os

# Add current dir to path
sys.path.append(os.getcwd())

from backend.sources.sina import SinaFinanceSource

async def main():
    s = SinaFinanceSource()
    price = await s.fetch_price('XAU-USD')
    print(f"Sina XAU-USD Price: {price}")
    
    price_twd = await s.fetch_price('USD-TWD')
    print(f"Sina USD-TWD Price: {price_twd}")

if __name__ == "__main__":
    asyncio.run(main())
