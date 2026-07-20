import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import pdfRoutes from "./routes/pdf.routes.js";
import youtubeRoutes from "./routes/youtube.routes.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_ORIGIN].filter(Boolean);

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin(origin, callback) {

      // Allow requests without an Origin header
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`Origin ${origin} is not allowed by CORS.`)
      );
    },
    credentials: false,
  })
);

app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "ClydeTools API" });
});

app.use("/api/youtube", youtubeRoutes);
app.use("/api/pdf", apiRateLimiter, pdfRoutes);

app.all(
  ["/api/import-url", "/api/fetch-url", "/api/remote"],
  (_req, res) => {
    res.status(404).json({
      message: "Remote URL import is not supported.",
    });
  }
);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "One of the uploaded files is too large.",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(413).json({
        message: "Too many files were uploaded.",
      });
    }

    return res.status(400).json({ message: error.message });
  }

  console.error(error.message);

  return res.status(error.statusCode || 500).json({
    message:
      error.statusCode && error.statusCode < 500
        ? error.message
        : "The server could not process the files.",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ClydeTools backend",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ClydeTools API running on http://localhost:${PORT}`);
});
