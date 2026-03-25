import { Router, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authenticate);

// File upload config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, process.env.UPLOAD_DIR || 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const createSchema = z.object({
  ministryId: z.string().uuid(),
  category: z.string().min(1),
  description: z.string().min(20),
  location: z.string().min(2),
  urgency: z.enum(['low', 'medium', 'high']),
});

const updateStatusSchema = z.object({
  status: z.enum(['assigned', 'in-progress', 'resolved', 'rejected']),
  note: z.string().optional(),
  resolutionNotes: z.string().optional(),
});

const generateComplaintId = () => {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 900000) + 100000);
  return `GRV${year}${num}`;
};

// GET /api/complaints — list (citizen sees own, officer sees assigned, ministry sees all in ministry)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, urgency, search, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (req.user!.role === 'citizen') {
      params.push(req.user!.id);
      conditions.push(`c.citizen_id = $${params.length}`);
    } else if (req.user!.role === 'officer') {
      params.push(req.user!.id);
      conditions.push(`c.assigned_officer_id = $${params.length}`);
    }
    // ministry role sees all (could be filtered by ministry_id from officers table if needed)

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`c.status = $${params.length}`);
    }
    if (urgency && urgency !== 'all') {
      params.push(urgency);
      conditions.push(`c.urgency = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(c.id ILIKE $${params.length} OR c.description ILIKE $${params.length} OR cu.name ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM complaints c
       JOIN users cu ON cu.id = c.citizen_id
       ${where}`,
      params
    );

    params.push(parseInt(limit as string), offset);
    const dataRes = await pool.query(
      `SELECT c.id, c.category, c.description, c.location, c.urgency, c.status,
              c.submitted_at, c.updated_at, c.assigned_at, c.resolved_at,
              cu.id as citizen_id, cu.name as citizen_name, cu.email as citizen_email, cu.phone as citizen_phone,
              m.id as ministry_id, m.name as ministry_name,
              ou.id as officer_id, ou.name as officer_name,
              o.designation as officer_designation
       FROM complaints c
       JOIN users cu ON cu.id = c.citizen_id
       JOIN ministries m ON m.id = c.ministry_id
       LEFT JOIN users ou ON ou.id = c.assigned_officer_id
       LEFT JOIN officers o ON o.id = c.assigned_officer_id
       ${where}
       ORDER BY c.submitted_at ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      complaints: dataRes.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page as string),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit as string)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// GET /api/complaints/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.category, c.description, c.location, c.urgency, c.status,
              c.resolution_notes, c.resolution_proof_url,
              c.submitted_at, c.updated_at, c.assigned_at, c.resolved_at,
              cu.id as citizen_id, cu.name as citizen_name, cu.email as citizen_email, cu.phone as citizen_phone,
              m.id as ministry_id, m.name as ministry_name,
              ou.id as officer_id, ou.name as officer_name, ou.email as officer_email,
              o.designation as officer_designation, o.photo_url as officer_photo,
              o.rating as officer_rating, o.total_resolved as officer_total_resolved
       FROM complaints c
       JOIN users cu ON cu.id = c.citizen_id
       JOIN ministries m ON m.id = c.ministry_id
       LEFT JOIN users ou ON ou.id = c.assigned_officer_id
       LEFT JOIN officers o ON o.id = c.assigned_officer_id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) { res.status(404).json({ error: 'Complaint not found' }); return; }

    const complaint = result.rows[0];

    // Access control
    if (req.user!.role === 'citizen' && complaint.citizen_id !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' }); return;
    }

    // Fetch documents
    const docs = await pool.query(
      `SELECT id, file_name, file_url, file_type, uploaded_at FROM complaint_documents WHERE complaint_id = $1`,
      [req.params.id]
    );

    // Fetch history
    const history = await pool.query(
      `SELECT id, changed_by_name, old_status, new_status, note, created_at
       FROM complaint_history WHERE complaint_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );

    res.json({ ...complaint, documents: docs.rows, history: history.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

// POST /api/complaints — create (citizen only)
router.post('/', upload.array('documents', 5), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createSchema.parse(req.body);
    const complaintId = generateComplaintId();

    // Find officer for this ministry (round-robin could be implemented here)
    const officerRes = await pool.query(
      `SELECT u.id, u.name FROM officers o
       JOIN users u ON u.id = o.id
       WHERE o.ministry_id = $1 AND u.is_active = true
       ORDER BY o.total_resolved ASC LIMIT 1`,
      [data.ministryId]
    );
    const assignedOfficer = officerRes.rows[0] || null;

    const status = assignedOfficer ? 'assigned' : 'submitted';

    await pool.query(
      `INSERT INTO complaints (id, citizen_id, ministry_id, category, description, location, urgency, status, assigned_officer_id, assigned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        complaintId,
        req.user?.id || 'demo-user-id',
        data.ministryId,
        data.category,
        data.description,
        data.location,
        data.urgency,
        status,
        assignedOfficer?.id || null,
        assignedOfficer ? new Date() : null,
      ]
    );

    // Save uploaded documents
    const files = req.files as Express.Multer.File[];
    if (files?.length) {
      for (const file of files) {
        await pool.query(
          `INSERT INTO complaint_documents (complaint_id, file_name, file_url, file_type, file_size, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [complaintId, file.originalname, `/uploads/${file.filename}`, file.mimetype, file.size, req.user!.id]
        );
      }
    }

    // Log history
    await pool.query(
      `INSERT INTO complaint_history (complaint_id, changed_by_name, new_status, note)
       VALUES ($1, 'System', 'submitted', 'Complaint registered by citizen')`,
      [complaintId]
    );
    if (assignedOfficer) {
      await pool.query(
        `INSERT INTO complaint_history (complaint_id, changed_by_name, old_status, new_status, note)
         VALUES ($1, 'System', 'submitted', 'assigned', $2)`,
        [complaintId, `Assigned to ${assignedOfficer.name}`]
      );
    }

    res.status(201).json({
      complaintId,
      status,
      assignedOfficer: assignedOfficer ? { id: assignedOfficer.id, name: assignedOfficer.name } : null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Validation failed', details: err.errors }); return; }
    console.error(err);
    res.status(500).json({ error: 'Failed to submit complaint' });
  }
});

// PATCH /api/complaints/:id/status — officer updates status
router.patch('/:id/status', requireRole('officer'), upload.single('proofDocument'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, note, resolutionNotes } = updateStatusSchema.parse(req.body);

    const complaintRes = await pool.query(
      `SELECT id, assigned_officer_id, status as current_status FROM complaints WHERE id = $1`,
      [req.params.id]
    );
    if (!complaintRes.rows[0]) { res.status(404).json({ error: 'Complaint not found' }); return; }

    const complaint = complaintRes.rows[0];
    // if (complaint.assigned_officer_id !== req.user!.id) {
    //   res.status(403).json({ error: 'Not your assigned complaint' }); return;
    // }

    const proofFile = req.file as Express.Multer.File | undefined || null;
    const proofUrl = proofFile ? `/uploads/${proofFile.filename}` : null;

    await pool.query(
  `UPDATE complaints SET
     status = $1::text,
     resolution_notes = COALESCE($2::text, resolution_notes),
     resolution_proof_url = COALESCE($3::text, resolution_proof_url),
     resolved_at = CASE WHEN $1::text = 'resolved' THEN NOW() ELSE resolved_at END,
     updated_at = NOW()
   WHERE id = $4`,
      [status, resolutionNotes || null, proofUrl, req.params.id]
    );

    // Update officer stats if resolved
    if (status === 'resolved') {
      await pool.query(
        `UPDATE officers SET total_resolved = total_resolved + 1 WHERE id = $1`,
        [req.user!.id]
      );
    }

    // Log history
    await pool.query(
      `INSERT INTO complaint_history (complaint_id, changed_by, changed_by_name, old_status, new_status, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.params.id, req.user!.id, req.user!.name, complaint.current_status, status, note || null]
    );

    res.json({ success: true, status });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: 'Validation failed', details: err.errors }); return; }
    console.log("UPDATE ERROR:", err);
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST /api/complaints/:id/rate — citizen rates officer after resolution
router.post('/:id/rate', requireRole('citizen'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rating, review } = z.object({
      rating: z.number().int().min(1).max(5),
      review: z.string().optional(),
    }).parse(req.body);

    const complaintRes = await pool.query(
      `SELECT citizen_id, assigned_officer_id, status FROM complaints WHERE id = $1`,
      [req.params.id]
    );
    if (!complaintRes.rows[0]) { res.status(404).json({ error: 'Not found' }); return; }

    const c = complaintRes.rows[0];
    if (c.citizen_id !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }
    if (c.status !== 'resolved') { res.status(400).json({ error: 'Can only rate resolved complaints' }); return; }

    await pool.query(
      `INSERT INTO officer_ratings (officer_id, complaint_id, citizen_id, rating, review)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (complaint_id, citizen_id) DO UPDATE SET rating=$4, review=$5`,
      [c.assigned_officer_id, req.params.id, req.user!.id, rating, review || null]
    );

    // Recalculate officer's average rating
    const avgRes = await pool.query(
      `SELECT AVG(rating) as avg FROM officer_ratings WHERE officer_id = $1`,
      [c.assigned_officer_id]
    );
    await pool.query(
      `UPDATE officers SET rating = $1 WHERE id = $2`,
      [parseFloat(avgRes.rows[0].avg).toFixed(2), c.assigned_officer_id]
    );

    await pool.query(`UPDATE complaints SET citizen_rating=$1, citizen_review=$2 WHERE id=$3`,
      [rating, review || null, req.params.id]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Rating failed' });
  }
});

export default router;
