import rateLimit from "express-rate-limit";

const windowMinutes = Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15);
const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 30);

export const apiRateLimiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    message: "Too many requests. Please try again later.",
  },
});

export const youtubeConversionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    message:
      "Too many conversion requests. Please wait before starting another conversion.",
  },
});