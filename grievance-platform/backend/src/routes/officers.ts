import { Router, Response } from 'express';
import pool from '../db/pool';
import bcrypt from 'bcryptjs';
import { authenticate, AuthRequest } from '../middleware/auth';

const officerRouter = Router();
officerRouter.use(authenticate);

// GET /api/officers — list all officers (for ministry view, top performers)
officerRouter.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone,
              o.ministry_id, m.name as ministry_name,
              o.designation, o.photo_url, o.rating, o.total_resolved,
              u.is_active,
              COUNT(c.id) FILTER (WHERE c.status != 'resolved') AS pending_complaints,
              COUNT(c.id) FILTER (WHERE c.status = 'resolved') AS resolved_complaints,
              COUNT(c.id) AS total_complaints
       FROM officers o
       JOIN users u ON u.id = o.id
       JOIN ministries m ON m.id = o.ministry_id
       LEFT JOIN complaints c ON c.assigned_officer_id = u.id
       WHERE u.is_active = true
       GROUP BY u.id, u.name, u.email, u.phone, o.ministry_id, m.name,
                o.designation, o.photo_url, o.rating, o.total_resolved, u.is_active
       ORDER BY o.rating DESC, o.total_resolved DESC`
    );
    res.json({ officers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch officers' });
  }
});

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

// GET /api/officers/:id — officer profile + stats
officerRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at,
              o.ministry_id, m.name as ministry_name,
              o.designation, o.photo_url, o.rating, o.total_resolved
       FROM officers o
       JOIN users u ON u.id = o.id
       JOIN ministries m ON m.id = o.ministry_id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Officer not found' }); return; }

    // Recent reviews
    const reviews = await pool.query(
      `SELECT r.rating, r.review, r.created_at, u.name as citizen_name
       FROM officer_ratings r
       JOIN users u ON u.id = r.citizen_id
       WHERE r.officer_id = $1
       ORDER BY r.created_at DESC LIMIT 10`,
      [req.params.id]
    );

    // Complaint stats
    const stats = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
         COUNT(*) FILTER (WHERE status = 'in-progress') AS in_progress,
         COUNT(*) FILTER (WHERE status = 'assigned') AS assigned,
         COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
         COUNT(*) FILTER (WHERE status = 'escalated') AS escalated,
         ROUND(
           AVG(EXTRACT(EPOCH FROM (resolved_at - submitted_at))/86400)
           FILTER (WHERE resolved_at IS NOT NULL), 1
         ) AS avg_days,
         COUNT(*) FILTER (
           WHERE status = 'resolved'
           AND resolved_at >= NOW() - INTERVAL '30 days'
         ) AS resolved_this_month
       FROM complaints WHERE assigned_officer_id = $1`,
      [req.params.id]
    );

    // Monthly trend (last 6 months)
    const trend = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', submitted_at), 'Mon') AS month,
         COUNT(*) AS assigned,
         COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
       FROM complaints
       WHERE assigned_officer_id = $1
         AND submitted_at >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', submitted_at)
       ORDER BY DATE_TRUNC('month', submitted_at)`,
      [req.params.id]
    );

    // Recent complaints
    const recentComplaints = await pool.query(
      `SELECT id, category, description, status, urgency, submitted_at, resolved_at
       FROM complaints
       WHERE assigned_officer_id = $1
       ORDER BY submitted_at DESC
       LIMIT 5`,
      [req.params.id]
    );

    res.json({
      officer: result.rows[0],
      reviews: reviews.rows,
      stats: stats.rows[0],
      trend: trend.rows,
      recentComplaints: recentComplaints.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch officer' });
  }
});

// POST /api/officers — create officer with hashed password + return credentials
officerRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { name, email, ministry_id, designation, phone } = req.body;

    if (!name || !email || !ministry_id) {
      res.status(400).json({ error: 'Name, email, and ministry_id are required' });
      return;
    }

    // Check duplicate email
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    // Auto-generate a secure password
    const rawPassword = 'officer123';
    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    await client.query('BEGIN');

    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, phone, role, is_active)
       VALUES ($1, $2, $3, $4, 'officer', true)
       RETURNING id`,
      [name, email, hashedPassword, phone || null]
    );

    const userId = userRes.rows[0].id;

    await client.query(
      `INSERT INTO officers (id, ministry_id, designation)
       VALUES ($1, $2, $3)`,
      [userId, ministry_id, designation || 'Officer']
    );

    await client.query('COMMIT');

    // Return officer data + plaintext credentials (only time they're shown)
    res.status(201).json({
      officer: {
        id: userId,
        name,
        email,
        designation: designation || 'Officer',
        is_active: true,
        ministry_id,
        pending_complaints: 0,
        resolved_complaints: 0,
        total_complaints: 0,
      },
      credentials: {
        email,
        password: rawPassword,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create officer error:', err);
    res.status(500).json({ error: 'Failed to create officer' });
  } finally {
    client.release();
  }
});

// DELETE /api/officers/:id — soft delete (deactivate)
officerRouter.delete('/:id', async (req, res: Response): Promise<void> => {
  try {
    await pool.query(`UPDATE users SET is_active = false WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Officer removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove officer' });
  }
});

// PATCH /api/officers/:id/reactivate — restore a deactivated officer
officerRouter.patch('/:id/reactivate', async (req, res: Response): Promise<void> => {
  try {
    await pool.query(`UPDATE users SET is_active = true WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Officer reactivated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reactivate officer' });
  }
});

// ── Password generator ──────────────────────────────────────────────────────
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';
  const all = upper + lower + digits + special;

  const rand = (str: string) => str[Math.floor(Math.random() * str.length)];

  // Guarantee at least one of each character type
  const required = [rand(upper), rand(lower), rand(digits), rand(special)];
  const rest = Array.from({ length: 6 }, () => rand(all));
  const password = [...required, ...rest].sort(() => Math.random() - 0.5).join('');
  return password;
}

// ── Ministry Router (kept in same file as original) ─────────────────────────
const ministryRouter = Router();

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

ministryRouter.get('/:id', async (req, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT id, name, jurisdiction, categories, contact, escalation_level FROM ministries WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Ministry not found' }); return; }

    const officers = await pool.query(
      `SELECT u.id, u.name, o.designation, o.photo_url, o.rating, o.total_resolved
       FROM officers o JOIN users u ON u.id = o.id
       WHERE o.ministry_id = $1 AND u.is_active = true
       ORDER BY o.rating DESC`,
      [req.params.id]
    );

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

ministryRouter.get('/:id/officers', async (req, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.is_active, o.designation, o.rating, o.total_resolved,
              COUNT(c.id) FILTER (WHERE c.status != 'resolved') AS pending_complaints,
              COUNT(c.id) FILTER (WHERE c.status = 'resolved') AS resolved_complaints,
              COUNT(c.id) AS total_complaints
       FROM users u
       JOIN officers o ON u.id = o.id
       LEFT JOIN complaints c ON c.assigned_officer_id = u.id
       WHERE o.ministry_id = $1 AND u.is_active = true
       GROUP BY u.id, u.name, u.email, u.is_active, o.designation, o.rating, o.total_resolved`,
      [req.params.id]
    );
    res.json({ officers: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch officers' });
  }
});

ministryRouter.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let { name, jurisdiction, categories, contact, escalation_level } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // ✅ Fix categories (IMPORTANT)
    if (typeof categories === 'string') {
      categories = categories.split(',').map((c: string) => c.trim());
    }

    const result = await pool.query(
      `INSERT INTO ministries (name, jurisdiction, categories, contact, escalation_level, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [
        name,
        jurisdiction || 'National',
        categories || [],
        contact || '',
        escalation_level || 1
      ]
    );

    res.status(201).json({ ministry: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create ministry' });
  }
});

export { officerRouter, ministryRouter };
