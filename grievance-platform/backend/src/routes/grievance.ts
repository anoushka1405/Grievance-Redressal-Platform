import { Router } from "express";
import pool from "../db/pool";
import { authenticate, AuthRequest } from "../middleware/auth"; // 👈 use your existing one

const router = Router();

// 🔐 Protected route
// POST /api/complaints
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { title, description } = req.body;

    const result = await pool.query(
      "INSERT INTO grievances (title, description, user_id) VALUES ($1, $2, $3) RETURNING *",
      [title, description, req.user?.id]
    );

    res.json({ complaint: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create complaint" });
  }
});
// 📋 Get logged-in user's grievances
// GET /api/complaints
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM grievances WHERE user_id = $1",
      [req.user?.id]
    );

    res.json({ complaints: result.rows }); // 👈 IMPORTANT FORMAT
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

export default router;