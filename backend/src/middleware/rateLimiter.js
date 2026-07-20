import rateLimit from "express-rate-limit";

const windowMinutes = Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15);
const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 30);

export const apiRateLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    return req.ip;
  },

  message: {
    message: "Too many requests. Please try again later.",
  },
});