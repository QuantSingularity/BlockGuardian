"""
Enterprise rate limiting system for API protection and abuse prevention
Implements sliding window, token bucket, and adaptive rate limiting algorithms
"""

import hashlib
import json
import time
from enum import Enum
from functools import wraps
from typing import Any, Dict, Optional, Tuple

import redis
from flask import g, jsonify, request
from src.config import current_config


class RateLimitType(Enum):
    """Types of rate limiting algorithms"""

    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    FIXED_WINDOW = "fixed_window"
    ADAPTIVE = "adaptive"


class RateLimitScope(Enum):
    """Scope of rate limiting"""

    GLOBAL = "global"
    PER_IP = "per_ip"
    PER_USER = "per_user"
    PER_ENDPOINT = "per_endpoint"
    PER_API_KEY = "per_api_key"


class RateLimiter:
    """Enterprise rate limiting system"""

    def __init__(self, app: Optional[Any] = None) -> None:
        self.app = app
        self.redis_client = None
        self.default_limits = {
            "requests_per_minute": 60,
            "requests_per_hour": 1000,
            "requests_per_day": 10000,
        }
        if app is not None:
            self.init_app(app)

    def init_app(self, app: Any) -> None:
        """Initialize rate limiter with Flask app"""
        self.app = app
        try:
            redis_url = getattr(current_config, "REDIS_URL", None)
            if not redis_url:
                app.logger.warning(
                    "REDIS_URL not found in config. Rate limiting will be disabled."
                )
                return
            self.redis_client = redis.Redis.from_url(
                redis_url,
                max_connections=getattr(current_config, "REDIS_MAX_CONNECTIONS", 10),
                socket_timeout=getattr(current_config, "REDIS_SOCKET_TIMEOUT", 5),
                socket_connect_timeout=getattr(
                    current_config, "REDIS_CONNECT_TIMEOUT", 5
                ),
                decode_responses=True,
            )
            self.redis_client.ping()
            app.logger.info("Rate limiter Redis connection established")
        except Exception as e:
            app.logger.error(f"Failed to connect to Redis for rate limiting: {e}")
            self.redis_client = None

    def check_rate_limit(
        self,
        key: str,
        limit: int,
        window: int,
        algorithm: RateLimitType = RateLimitType.SLIDING_WINDOW,
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if request is within rate limit

        Args:
            key: Unique identifier for the rate limit
            limit: Maximum number of requests
            window: Time window in seconds
            algorithm: Rate limiting algorithm to use

        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        if not self.redis_client:
            self.app.logger.warning("Rate limiting disabled - Redis not available")
            return (
                True,
                {
                    "remaining": limit,
                    "reset_time": time.time() + window,
                    "limit": limit,
                },
            )
        current_time = time.time()
        if algorithm == RateLimitType.SLIDING_WINDOW:
            return self._sliding_window_check(key, limit, window, current_time)
        elif algorithm == RateLimitType.TOKEN_BUCKET:
            return self._token_bucket_check(key, limit, window, current_time)
        elif algorithm == RateLimitType.FIXED_WINDOW:
            return self._fixed_window_check(key, limit, window, current_time)
        elif algorithm == RateLimitType.ADAPTIVE:
            return self._adaptive_check(key, limit, window, current_time)
        else:
            return self._sliding_window_check(key, limit, window, current_time)

    def _sliding_window_check(
        self, key: str, limit: int, window: int, current_time: float
    ) -> Tuple[bool, Dict[str, Any]]:
        """Sliding window rate limiting algorithm"""
        pipe = self.redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, current_time - window)
        pipe.zcard(key)
        pipe.zadd(key, {str(current_time): current_time})
        pipe.expire(key, window + 1)
        results = pipe.execute()
        current_count = results[1]
        if current_count < limit:
            remaining = limit - current_count - 1
            reset_time = current_time + window
            return (
                True,
                {
                    "remaining": remaining,
                    "reset_time": reset_time,
                    "current_count": current_count + 1,
                    "limit": limit,
                },
            )
        else:
            self.redis_client.zrem(key, str(current_time))
            oldest_requests = self.redis_client.zrange(key, 0, 0, withscores=True)
            reset_time = (
                oldest_requests[0][1] + window
                if oldest_requests
                else current_time + window
            )
            return (
                False,
                {
                    "remaining": 0,
                    "reset_time": reset_time,
                    "current_count": current_count,
                    "limit": limit,
                },
            )

    def _token_bucket_check(
        self, key: str, limit: int, window: int, current_time: float
    ) -> Tuple[bool, Dict[str, Any]]:
        """Token bucket rate limiting algorithm"""
        bucket_key = f"bucket:{key}"
        refill_rate = limit / window
        lua_script = "\n            local bucket_key = KEYS[1]\n            local capacity = tonumber(ARGV[1])\n            local refill_rate = tonumber(ARGV[2])\n            local current_time = tonumber(ARGV[3])\n\n            local data = redis.call('GET', bucket_key)\n            local tokens = capacity\n            local last_refill = current_time\n\n            if data then\n                local decoded = cjson.decode(data)\n                tokens = tonumber(decoded['tokens'])\n                last_refill = tonumber(decoded['last_refill'])\n            end\n\n            local time_elapsed = current_time - last_refill\n            local tokens_to_add = time_elapsed * refill_rate\n            tokens = math.min(capacity, tokens + tokens_to_add)\n\n            local is_allowed = false\n            if tokens >= 1 then\n                tokens = tokens - 1\n                is_allowed = true\n            end\n\n            local reset_time = current_time + (capacity - tokens) / refill_rate\n            \n            local new_data = cjson.encode({tokens=tokens, last_refill=current_time})\n            redis.call('SETEX', bucket_key, ARGV[4], new_data)\n\n            return {is_allowed, tokens, reset_time}\n        "
        try:
            results = self.redis_client.eval(
                lua_script, 1, bucket_key, limit, refill_rate, current_time, window * 2
            )
            is_allowed = bool(results[0])
            tokens = float(results[1])
            reset_time = float(results[2])
            remaining = int(tokens)
            current_count = limit - remaining
            return (
                is_allowed,
                {
                    "remaining": remaining,
                    "reset_time": reset_time,
                    "current_count": current_count,
                    "limit": limit,
                },
            )
        except Exception as e:
            self.app.logger.error(f"Token bucket Lua script failed: {e}")
            return (
                True,
                {
                    "remaining": limit,
                    "reset_time": current_time + window,
                    "limit": limit,
                },
            )

    def _fixed_window_check(
        self, key: str, limit: int, window: int, current_time: float
    ) -> Tuple[bool, Dict[str, Any]]:
        """Fixed window rate limiting algorithm"""
        window_start = int(current_time // window) * window
        window_key = f"{key}:{window_start}"
        pipe = self.redis_client.pipeline()
        pipe.incr(window_key)
        pipe.expire(window_key, window)
        results = pipe.execute()
        current_count = results[0]
        if current_count <= limit:
            remaining = limit - current_count
            reset_time = window_start + window
            return (
                True,
                {
                    "remaining": remaining,
                    "reset_time": reset_time,
                    "current_count": current_count,
                    "limit": limit,
                },
            )
        else:
            reset_time = window_start + window
            return (
                False,
                {
                    "remaining": 0,
                    "reset_time": reset_time,
                    "current_count": current_count,
                    "limit": limit,
                },
            )

    def _adaptive_check(
        self, key: str, limit: int, window: int, current_time: float
    ) -> Tuple[bool, Dict[str, Any]]:
        """Adaptive rate limiting based on system load and user behavior"""
        system_load = self._get_system_load()
        user_reputation = self._get_user_reputation(key)
        adjusted_limit = self._calculate_adaptive_limit(
            limit, system_load, user_reputation
        )
        return self._sliding_window_check(key, adjusted_limit, window, current_time)

    def _get_system_load(self) -> float:
        """Get current system load (simplified implementation)"""
        try:
            info = self.redis_client.info("memory")
            used_memory = info.get("used_memory", 0)
            max_memory = info.get("maxmemory", 1024 * 1024 * 1024)
            if max_memory > 0:
                memory_usage = used_memory / max_memory
                return min(1.0, memory_usage)
        except Exception:
            pass
        return 0.5

    def _get_user_reputation(self, key: str) -> float:
        """Get user reputation score (0.0 to 1.0)"""
        reputation_key = f"reputation:{key}"
        try:
            reputation_data = self.redis_client.get(reputation_key)
            if reputation_data:
                data = json.loads(reputation_data)
                return data.get("score", 0.5)
        except Exception:
            pass
        return 0.5

    def _calculate_adaptive_limit(
        self, base_limit: int, system_load: float, user_reputation: float
    ) -> int:
        """Calculate adaptive rate limit based on system load and user reputation"""
        load_factor = 1.0 - system_load * 0.5
        reputation_factor = 0.5 + user_reputation
        adjusted_limit = int(base_limit * load_factor * reputation_factor)
        return max(1, adjusted_limit)

    def update_user_reputation(self, key: str, behavior_score: float) -> Any:
        """Update user reputation based on behavior (0.0 to 1.0)"""
        reputation_key = f"reputation:{key}"
        try:
            reputation_data = self.redis_client.get(reputation_key)
            if reputation_data:
                data = json.loads(reputation_data)
                current_score = data.get("score", 0.5)
                request_count = data.get("request_count", 0)
            else:
                current_score = 0.5
                request_count = 0
            alpha = 0.1
            new_score = (1 - alpha) * current_score + alpha * behavior_score
            new_score = max(0.0, min(1.0, new_score))
            updated_data = {
                "score": new_score,
                "request_count": request_count + 1,
                "last_updated": time.time(),
            }
            self.redis_client.setex(
                reputation_key, 30 * 24 * 3600, json.dumps(updated_data)
            )
        except Exception as e:
            self.app.logger.error(f"Failed to update user reputation: {e}")

    def get_rate_limit_key(
        self, scope: RateLimitScope, identifier: Optional[str] = None
    ) -> str:
        """Generate rate limit key based on scope"""
        if scope == RateLimitScope.GLOBAL:
            return "global"
        elif scope == RateLimitScope.PER_IP:
            ip = request.remote_addr if request else identifier
            return f"ip:{ip}"
        elif scope == RateLimitScope.PER_USER:
            user_id = (
                getattr(g, "current_user_id", None)
                if hasattr(g, "current_user_id")
                else identifier
            )
            return f"user:{user_id}"
        elif scope == RateLimitScope.PER_ENDPOINT:
            endpoint = request.endpoint if request else identifier
            return f"endpoint:{endpoint}"
        elif scope == RateLimitScope.PER_API_KEY:
            api_key = request.headers.get("X-API-Key") if request else identifier
            if api_key:
                key_hash = hashlib.sha256(api_key.encode()).hexdigest()[:16]
                return f"api_key:{key_hash}"
        return "unknown"

    def create_rate_limit_response(
        self, rate_limit_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create standardized rate limit response"""
        return {
            "error": "Rate limit exceeded",
            "rate_limit": {
                "limit": rate_limit_info["limit"],
                "remaining": rate_limit_info["remaining"],
                "reset_time": rate_limit_info["reset_time"],
                "retry_after": max(0, int(rate_limit_info["reset_time"] - time.time())),
            },
        }


rate_limiter = RateLimiter()


def rate_limit(
    limit: int = 60,
    window: int = 60,
    scope: RateLimitScope = RateLimitScope.PER_IP,
    algorithm: RateLimitType = RateLimitType.SLIDING_WINDOW,
    key_func: Optional[callable] = None,
) -> Any:
    """
    Rate limiting decorator

    Args:
        limit: Maximum number of requests
        window: Time window in seconds
        scope: Scope of rate limiting
        algorithm: Rate limiting algorithm
        key_func: Custom function to generate rate limit key
    """

    def decorator(f):

        @wraps(f)
        def decorated_function(*args, **kwargs):
            if key_func:
                key = key_func()
            else:
                key = rate_limiter.get_rate_limit_key(scope)
            is_allowed, rate_limit_info = rate_limiter.check_rate_limit(
                key, limit, window, algorithm
            )
            if not is_allowed:
                response = rate_limiter.create_rate_limit_response(rate_limit_info)
                return (jsonify(response), 429)
            response = f(*args, **kwargs)
            if isinstance(response, tuple):
                response_obj = response[0]
                status_code = response[1] if len(response) > 1 else 200
                headers = response[2] if len(response) > 2 else {}
            else:
                response_obj = response
                status_code = 200
                headers = {}
            if hasattr(response_obj, "headers"):
                response_obj.headers["X-RateLimit-Limit"] = str(
                    rate_limit_info["limit"]
                )
                response_obj.headers["X-RateLimit-Remaining"] = str(
                    rate_limit_info["remaining"]
                )
                response_obj.headers["X-RateLimit-Reset"] = str(
                    int(rate_limit_info["reset_time"])
                )
            elif isinstance(headers, dict):
                headers["X-RateLimit-Limit"] = str(rate_limit_info["limit"])
                headers["X-RateLimit-Remaining"] = str(rate_limit_info["remaining"])
                headers["X-RateLimit-Reset"] = str(int(rate_limit_info["reset_time"]))
                response = (response_obj, status_code, headers)
            return response

        return decorated_function

    return decorator
