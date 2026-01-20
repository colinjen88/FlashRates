
import asyncio
import aiohttp
import json
import time

async def websocket_client():
    url = "ws://localhost:8000/ws/stream?api_key=dev_key"
    async with aiohttp.ClientSession() as session:
        async with session.ws_connect(url) as ws:
            print("Connected to WebSocket")
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    symbol = data.get('symbol')
                    ts = data.get('timestamp')
                    price = data.get('price')
                    
                    now = time.time()
                    diff = now - ts
                    
                    print(f"[{symbol}] Price: {price}, TS: {ts}, Source Latency: {diff*1000:.1f}ms")
                    
                    if symbol == 'XAU-USD':
                        # print details
                        print(f"   Sources: {data.get('details')}")

                elif msg.type == aiohttp.WSMsgType.ERROR:
                    break

if __name__ == "__main__":
    asyncio.run(websocket_client())
