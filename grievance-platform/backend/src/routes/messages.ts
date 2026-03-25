import { Router, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/messages/:complaintId
router.get('/:complaintId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Verify access to this complaint
    const complaintRes = await pool.query(
      `SELECT citizen_id, assigned_officer_id FROM complaints WHERE id = $1`,
      [req.params.complaintId]
    );
    if (!complaintRes.rows[0]) { res.status(404).json({ error: 'Complaint not found' }); return; }

    const c = complaintRes.rows[0];
    const isParty =
      c.citizen_id === req.user!.id ||
      c.assigned_officer_id === req.user!.id ||
      req.user!.role === 'ministry';

    if (!isParty) { res.status(403).json({ error: 'Access denied' }); return; }

    const messages = await pool.query(
      `SELECT m.id, m.complaint_id, m.sender_id, m.sender_role, m.message, m.is_read, m.created_at,
              u.name as sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.complaint_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.complaintId]
    );

    // Mark as read for the other party
    await pool.query(
      `UPDATE messages SET is_read = true
       WHERE complaint_id = $1 AND sender_id != $2 AND is_read = false`,
      [req.params.complaintId, req.user!.id]
    );

    res.json({ messages: messages.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages/:complaintId
router.post('/:complaintId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body);

    const complaintRes = await pool.query(
      `SELECT citizen_id, assigned_officer_id, status FROM complaints WHERE id = $1`,
      [req.params.complaintId]
    );
    if (!complaintRes.rows[0]) { res.status(404).json({ error: 'Complaint not found' }); return; }

    const c = complaintRes.rows[0];
    const isParty =
      c.citizen_id === req.user!.id ||
      c.assigned_officer_id === req.user!.id;

    if (!isParty) { res.status(403).json({ error: 'Not a party to this complaint' }); return; }
    if (c.status === 'resolved') { res.status(400).json({ error: 'Cannot message on resolved complaints' }); return; }

    const result = await pool.query(
      `INSERT INTO messages (complaint_id, sender_id, sender_role, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, complaint_id, sender_id, sender_role, message, is_read, created_at`,
      [req.params.complaintId, req.user!.id, req.user!.role, message]
    );

    res.status(201).json({
      message: { ...result.rows[0], sender_name: req.user!.name },
    });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Validation failed' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
