const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const supabase = require("../supabase");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many authentication attempts. Please wait and try again." } });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function publicUser(user) { return { id:user.id, name:user.name, email:user.email, role:user.role }; }
function setToken(res, user) {
  const token = jwt.sign({ sub:user.id }, process.env.JWT_SECRET, { expiresIn:"8h", issuer:"campusconnect" });
  res.cookie("campus_token", token, { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", maxAge:8*60*60*1000, path:"/" });
}

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (name.length < 2 || name.length > 100) return res.status(400).json({ error:"Name must be between 2 and 100 characters." });
    if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ error:"Enter a valid email address." });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error:"Password must be between 8 and 128 characters." });
    const { data: existing, error: lookupError } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return res.status(409).json({ error:"An account with this email already exists." });
    const password_hash = await bcrypt.hash(password, 12);
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const role = adminEmail && email === adminEmail ? "admin" : "student";
    const { data:user, error } = await supabase.from("users").insert({ name, email, password_hash, role }).select("id,name,email,role").single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error:"An account with this email already exists." });
      throw error;
    }
    setToken(res, user);
    return res.status(201).json({ user:publicUser(user) });
  } catch (error) { next(error); }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!emailPattern.test(email) || !password) return res.status(400).json({ error:"Enter your email and password." });
    const { data:user, error } = await supabase.from("users").select("id,name,email,role,password_hash,is_active").eq("email", email).maybeSingle();
    if (error) throw error;
    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error:"Email or password is incorrect." });
    setToken(res, user);
    return res.json({ user:publicUser(user) });
  } catch (error) { next(error); }
});

router.post("/logout", (req, res) => {
  res.clearCookie("campus_token", { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", path:"/" });
  res.json({ message:"Signed out successfully." });
});
router.get("/me", authenticate, (req, res) => res.json({ user:req.user }));

module.exports = router;
