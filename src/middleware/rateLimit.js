// Basit, bellek içi sabit-pencere (fixed-window) rate limiter.
// Harici bir pakete ihtiyaç duymadan brute-force login/şifre denemelerini sınırlamak için yazıldı.
// Tek process/tek instance için yeterlidir; çoklu instance/cluster senaryosunda paylaşımlı bir
// store (Redis vb.) gerekir.

function createRateLimiter({ windowMs, max, message }) {
    const hits = new Map(); // key -> { count, resetAt }

    // Süresi dolmuş kayıtları periyodik temizle, bellek sızıntısını önle.
    const sweeper = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (entry.resetAt <= now) hits.delete(key);
        }
    }, windowMs);
    sweeper.unref?.();

    return (req, res, next) => {
        const key = req.ip || req.connection?.remoteAddress || 'unknown';
        const now = Date.now();
        let entry = hits.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(key, entry);
        }
        entry.count++;

        if (entry.count > max) {
            const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
            res.set('Retry-After', String(retryAfterSec));
            return res.status(429).json({ error: message || 'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.' });
        }
        next();
    };
}

module.exports = { createRateLimiter };
