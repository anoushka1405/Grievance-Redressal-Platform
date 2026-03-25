import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from '../db/pool';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN as string;

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(['citizen', 'officer', 'ministry']),
  // Officer-specific
  ministryId: z.string().uuid().optional(),
  designation: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);

    // Check duplicate email
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, created_at`,
      [data.name, data.email, passwordHash, data.phone || null, data.role]
    );
    const user = result.rows[0];

    // Create role-specific record
    if (data.role === 'officer' && data.ministryId) {
      await pool.query(
        `INSERT INTO officers (id, ministry_id, designation) VALUES ($1, $2, $3)`,
        [user.id, data.ministryId, data.designation || 'Officer']
      );
    } else if (data.role === 'ministry' && data.ministryId) {
      await pool.query(
        `INSERT INTO ministry_users (id, ministry_id) VALUES ($1, $2)`,
        [user.id, data.ministryId]
      );
    }

    const token = jwt.sign(
  {
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name
  },
  JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.is_active,
              o.ministry_id, o.designation, o.photo_url, o.rating, o.total_resolved
       FROM users u
       LEFT JOIN officers o ON o.id = u.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];
    if (!user.is_active) {
      res.status(403).json({ error: 'Account deactivated' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
  {
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name
  },
  JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        ministryId: user.ministry_id || null,
        designation: user.designation || null,
        photoUrl: user.photo_url || null,
        rating: user.rating || null,
        totalResolved: user.total_resolved || null,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token' });
    return;
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone,
              o.ministry_id, o.designation, o.photo_url, o.rating, o.total_resolved
       FROM users u LEFT JOIN officers o ON o.id = u.id WHERE u.id = $1`,
      [decoded.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user: result.rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
