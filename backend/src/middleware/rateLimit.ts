import { RateLimiterMemory } from "rate-limiter-flexible";

const loginLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

export async function loginRateLimit(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  const key = req.ip ?? "unknown";
  try {
    await loginLimiter.consume(key, 1);
    next();
  } catch {
    res.status(429).json({ error: "Demasiados intentos. Intente nuevamente en un minuto." });
  }
}
