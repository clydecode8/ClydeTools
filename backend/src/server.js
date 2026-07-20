import express from "express";
import cors from "cors";
import helmet from "helmet";
import pdfRoutes from "./routes/pdf.routes.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { ensureTempRoot, cleanupOldJobs } from "./services/cleanup.service.js";

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

await ensureTempRoot();
cleanupOldJobs();
setInterval(cleanupOldJobs, 10 * 60 * 1000);

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(cors({ origin: FRONTEND_ORIGIN }));

app.use(express.json({ limit: "100kb" }));

app.use("/api", apiRateLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "ClydeTools API" });
});

app.use("/api/pdf", pdfRoutes);

// Block URL-import style endpoints completely
app.all(["/api/import-url", "/api/fetch-url", "/api/remote"], (_req, res) => {
  res.status(404).json({
    message: "Remote URL import is not supported.",
  });
});

// Safe error response
app.use((err, _req, res, _next) => {
  console.error(err.message);

  const status = err.statusCode || 500;

  res.status(status).json({
    message: err.publicMessage || "Something went wrong while processing your files.",
  });
});

app.listen(PORT, () => {
  console.log(`ClydeTools API running on http://localhost:${PORT}`);
});