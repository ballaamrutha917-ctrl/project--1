const express = require("express");
const supabase = require("../supabase");
const { authenticate, requireAdmin } = require("../middleware/auth");
const router = express.Router();
const TYPES = ["compliment","grievance"];
const STATUSES = ["submitted","under_review","in_progress","resolved","rejected"];
const CATEGORIES = ["Faculty & Teaching","Facilities & Maintenance","Library","Hostel","Cleanliness","Safety & Security","Transport","Administration","Other"];
const columns = "id,user_id,type,title,category,description,status,admin_note,created_at,updated_at";

router.get("/stats", async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("submissions").select("type,status");
    if (error) throw error;
    const records = data || [];
    res.json({
      total:records.length,
      compliments:records.filter(item => item.type === "compliment").length,
      openGrievances:records.filter(item => item.type === "grievance" && !["resolved","rejected"].includes(item.status)).length,
      resolved:records.filter(item => item.status === "resolved").length
    });
  } catch (error) { next(error); }
});

router.get("/submissions", authenticate, async (req, res, next) => {
  try {
    let query = supabase.from("submissions").select(`${columns},users(name,email)`).order("created_at", { ascending:false }).limit(100);
    if (req.user.role !== "admin") query = query.eq("user_id", req.user.id);
    if (req.query.type && TYPES.includes(req.query.type)) query = query.eq("type", req.query.type);
    if (req.query.status && STATUSES.includes(req.query.status)) query = query.eq("status", req.query.status);
    const { data, error } = await query;
    if (error) throw error;
    const submissions = (data || []).map(item => {
      const { users, ...rest } = item;
      return { ...rest, ...(req.user.role === "admin" ? { submitter_name:users?.name || "Unknown", submitter_email:users?.email || "" } : {}) };
    });
    res.json({ submissions });
  } catch (error) { next(error); }
});

router.post("/submissions", authenticate, async (req, res, next) => {
  try {
    const type = req.body.type;
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const category = req.body.category;
    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    if (!TYPES.includes(type)) return res.status(400).json({ error:"Choose compliment or grievance." });
    if (title.length < 3 || title.length > 120) return res.status(400).json({ error:"Subject must be between 3 and 120 characters." });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error:"Choose a valid category." });
    if (description.length < 10 || description.length > 3000) return res.status(400).json({ error:"Details must be between 10 and 3000 characters." });
    const { data, error } = await supabase.from("submissions").insert({ user_id:req.user.id, type, title, category, description }).select(columns).single();
    if (error) throw error;
    res.status(201).json({ submission:data });
  } catch (error) { next(error); }
});

router.patch("/submissions/:id/status", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status, admin_note = "" } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ error:"Choose a valid status." });
    if (typeof admin_note !== "string" || admin_note.length > 1000) return res.status(400).json({ error:"Admin note must be 1000 characters or fewer." });
    const { data, error } = await supabase.from("submissions").update({ status, admin_note:admin_note.trim() || null }).eq("id", req.params.id).select(columns).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error:"Submission not found." });
    res.json({ submission:data });
  } catch (error) { next(error); }
});
module.exports = router;
