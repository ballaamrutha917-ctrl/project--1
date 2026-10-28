require("dotenv").config();
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const submissionRoutes = require("./routes/submissions");

const app = express();
const port = Number(process.env.PORT) || 3000;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is missing or too short. Set a random secret of at least 32 characters in backend/.env.");
  process.exit(1);
}
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc:["'self'"], scriptSrc:["'self'"], styleSrc:["'self'","'unsafe-inline'"],
  imgSrc:["'self'","data:"], connectSrc:["'self'"], objectSrc:["'none'"],
  baseUri:["'self'"], frameAncestors:["'none'"], formAction:["'self'"]
}}}));
app.use(express.json({ limit:"20kb" }));
app.use(cookieParser());
app.use("/api", rateLimit({ windowMs:15*60*1000, limit:300, standardHeaders:"draft-8", legacyHeaders:false }));
app.get("/api/health", (req, res) => res.json({ status:"ok", service:"CampusConnect API" }));
app.use("/api/auth", authRoutes);
app.use("/api", submissionRoutes);
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.use("/api", (req, res) => res.status(404).json({ error:"API endpoint not found." }));
app.use((err, req, res, next) => {
  console.error("Request failed:", err && err.message ? err.message : "Unknown error");
  if (res.headersSent) return next(err);
  const status = Number(err.status) >= 400 && Number(err.status) < 600 ? Number(err.status) : 500;
  res.status(status).json({ error: status === 500 ? "An unexpected server error occurred. Check server configuration and database connection." : "The request could not be completed." });
});
app.listen(port, () => console.log(`CampusConnect running at http://localhost:${port}`));
