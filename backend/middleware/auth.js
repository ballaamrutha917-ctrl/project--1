const jwt = require("jsonwebtoken");
const supabase = require("../supabase");

function getToken(req) {
  const cookie = req.cookies && req.cookies.campus_token;
  const header = req.headers.authorization;
  return cookie || (header && header.startsWith("Bearer ") ? header.slice(7) : null);
}
async function authenticate(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "Please sign in to continue." });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabase.from("users").select("id,name,email,role,is_active").eq("id", payload.sub).maybeSingle();
    if (error || !user || !user.is_active) return res.status(401).json({ error: "Your session is no longer valid. Please sign in again." });
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (_) { return res.status(401).json({ error: "Your session is invalid or has expired. Please sign in again." }); }
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Administrator permission is required." });
  next();
}
module.exports = { authenticate, requireAdmin };
