import { Router, Response } from 'express';
import pool from '../db/pool';

const router = Router();

// POST /api/ai/suggest-ministry
router.post('/suggest-ministry', async (req, res: Response) => {
  try {
    const { description } = req.body;

    if (!description) {
      res.status(400).json({ error: 'Description required' });
      return;
    }

    const ministriesRes = await pool.query(
      `SELECT id, name, categories FROM ministries WHERE is_active = true`
    );

    const ministries = ministriesRes.rows;
    // ✅ Extract words from description
const descWords: string[] = description
  .toLowerCase()
  .replace(/[^\w\s]/g, '')
  .split(' ')
  .filter((w: string) => w.length > 2);

// ✅ Smart matching with categories
const suggestions = ministries.map((m: any) => {
  let score = 0;
  let matchedWords: string[] = [];

  const categories: string[] = (m.categories || []).map((c: string) =>
    c.toLowerCase()
  );

  descWords.forEach((word: string) => {
    categories.forEach((cat: string) => {
      if (cat.includes(word) || word.includes(cat)) {
        score += 2;
        matchedWords.push(word);
      }
    });
  });

  return {
    id: m.id,
    name: m.name,
    score,
    reason:
      matchedWords.length > 0
        ? `Matches keywords: ${[...new Set(matchedWords)].join(', ')}`
        : '',
  };
})
.filter((m: any) => m.score > 0)
.sort((a: any, b: any) => b.score - a.score)
.slice(0, 3);
    

    if (suggestions.length === 0) {
  const fallback = ministries.slice(0, 3).map((m: any) => ({
    ...m,
    reason: 'Best general match based on available ministries',
  }));

  return res.json({ suggestions: fallback });
}
    res.json({ suggestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI suggestion failed' });
  }
});

export default router;