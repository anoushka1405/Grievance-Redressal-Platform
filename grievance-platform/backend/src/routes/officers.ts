import { Router, Response } from 'express';
import pool from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const officerRouter = Router();
officerRouter.use(authenticate);

// GET /api/officers — list all officers (for ministry view, top performers)
officerRouter.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone,
              o.ministry_id, m.name as ministry_name,
              o.designation, o.photo_url, o.rating, o.total_resolved
       FROM officers o
       JOIN users u ON u.id = o.id
       JOIN ministries m ON m.id = o.ministry_id
       WHERE u.is_active = true
       ORDER BY o.rating DESC, o.total_resolved DESC`
    );
    res.json({ officers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch officers' });
  }
});

// 🔥 FIXED POSITION — MUST BE ABOVE /:id
// GET /api/officers/top-performers — leaderboard
officerRouter.get('/top-performers', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.name,
        o.designation, o.photo_url,
        COALESCE(o.rating, 0) as rating,
        COALESCE(o.total_resolved, 0) as total_resolved
      FROM officers o
      JOIN users u ON u.id = o.id
      WHERE u.is_active = true
      ORDER BY o.total_resolved DESC, o.rating DESC
      LIMIT 5
    `);

    const officers = result.rows;

    // 🔥 ADD REVIEWS FOR EACH OFFICER
    for (let officer of officers) {
      const reviewsRes = await pool.query(
        `SELECT r.rating, r.review, u.name as citizen_name
         FROM officer_ratings r
         JOIN users u ON u.id = r.citizen_id
         WHERE r.officer_id = $1
         ORDER BY r.created_at DESC
         LIMIT 5`,
        [officer.id]
      );

      officer.reviews = reviewsRes.rows;
    }

    res.json({ officers });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
});

// GET /api/officers/:id — officer profile
officerRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone,
              o.ministry_id, m.name as ministry_name,
              o.designation, o.photo_url, o.rating, o.total_resolved
       FROM officers o
       JOIN users u ON u.id = o.id
       JOIN ministries m ON m.id = o.ministry_id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Officer not found' }); return; }

    // Get recent reviews
    const reviews = await pool.query(
      `SELECT r.rating, r.review, r.created_at, u.name as citizen_name
       FROM officer_ratings r
       JOIN users u ON u.id = r.citizen_id
       WHERE r.officer_id = $1
       ORDER BY r.created_at DESC LIMIT 10`,
      [req.params.id]
    );

    // Stats
    const stats = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
         COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress,
         AVG(EXTRACT(EPOCH FROM (resolved_at - submitted_at))/86400) FILTER (WHERE resolved_at IS NOT NULL) as avg_days
       FROM complaints WHERE assigned_officer_id = $1`,
      [req.params.id]
    );

    res.json({ officer: result.rows[0], reviews: reviews.rows, stats: stats.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch officer' });
  }
});

// Ministry router
const ministryRouter = Router();

// GET /api/ministries — public list
ministryRouter.get('/', async (_req, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, name, jurisdiction, categories, contact, escalation_level
       FROM ministries WHERE is_active = true ORDER BY name ASC`
    );
    res.json({ ministries: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ministries' });
  }
});

// GET /api/ministries/:id
ministryRouter.get('/:id', async (req, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, name, jurisdiction, categories, contact, escalation_level FROM ministries WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Ministry not found' }); return; }

    // Get officers in this ministry
    const officers = await pool.query(
      `SELECT u.id, u.name, o.designation, o.photo_url, o.rating, o.total_resolved
       FROM officers o JOIN users u ON u.id = o.id
       WHERE o.ministry_id = $1 AND u.is_active = true
       ORDER BY o.rating DESC`,
      [req.params.id]
    );

    // Stats for this ministry
    const stats = await pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
         COUNT(*) FILTER (WHERE status IN ('submitted','assigned','in-progress')) as pending
       FROM complaints WHERE ministry_id = $1`,
      [req.params.id]
    );

    res.json({ ministry: result.rows[0], officers: officers.rows, stats: stats.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ministry' });
  }
});

export { officerRouter, ministryRouter };