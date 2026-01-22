import redis.asyncio as redis
from backend.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

class RedisClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.redis = None
            cls._instance.use_fake = False
        return cls._instance
    
    async def connect(self):
        if not self.redis:
            try:
                # 嘗試連接真實 Redis
                self.redis = await redis.from_url(
                    f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}",
                    db=settings.REDIS_DB,
                    password=settings.REDIS_PASSWORD or None,
                    encoding="utf-8",
                    decode_responses=True
                )
                # 測試連線
                await self.redis.ping()
                logger.info("Connected to Redis")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}, using FakeRedis")
                # 使用 FakeRedis 作為備選
                import fakeredis.aioredis
                self.redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
                self.use_fake = True
                logger.info("Connected to FakeRedis (in-memory)")
    
    async def close(self):
        if self.redis and not self.use_fake:
            await self.redis.close()
            logger.info("Redis connection closed")
    
    async def get(self, key):
        if not self.redis:
            await self.connect()
        return await self.redis.get(key)
    
    async def set(self, key, value, ex=None):
        if not self.redis:
            await self.connect()
        await self.redis.set(key, value, ex=ex)
    
    async def publish(self, channel, message):
        if not self.redis:
            await self.connect()
        await self.redis.publish(channel, message)

    async def sismember(self, key, member):
        if not self.redis:
            await self.connect()
        return await self.redis.sismember(key, member)

    async def smembers(self, key):
        if not self.redis:
            await self.connect()
        return await self.redis.smembers(key)

    async def sadd(self, key, member):
        if not self.redis:
            await self.connect()
        return await self.redis.sadd(key, member)

    async def srem(self, key, member):
        if not self.redis:
            await self.connect()
        return await self.redis.srem(key, member)

    async def zadd(self, key, mapping):
        if not self.redis:
            await self.connect()
        return await self.redis.zadd(key, mapping)

    async def zrange(self, key, start, end, withscores=False):
        if not self.redis:
            await self.connect()
        return await self.redis.zrange(key, start, end, withscores=withscores)

    async def zrevrange(self, key, start, end, withscores=False):
        if not self.redis:
            await self.connect()
        return await self.redis.zrevrange(key, start, end, withscores=withscores)

    async def zrangebyscore(self, key, min_score, max_score, withscores=False):
        if not self.redis:
            await self.connect()
        return await self.redis.zrangebyscore(key, min_score, max_score, withscores=withscores)

    async def zremrangebyrank(self, key, start, end):
        if not self.redis:
            await self.connect()
        return await self.redis.zremrangebyrank(key, start, end)

    async def zremrangebyscore(self, key, min_score, max_score):
        if not self.redis:
            await self.connect()
        return await self.redis.zremrangebyscore(key, min_score, max_score)

    async def zcard(self, key):
        if not self.redis:
            await self.connect()
        return await self.redis.zcard(key)

redis_client = RedisClient()
