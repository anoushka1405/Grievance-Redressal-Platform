import { Router, Response } from 'express';
import pool from '../db/pool';
import axios from 'axios';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });
const router = Router();


// ✅ NEW: Groq API Integration (Faster & Stable)
async function callGroqAI(systemPrompt: string, userMessage: string, history: any[]) {
  const API_KEY = process.env.GROQ_API_KEY;
  const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(msg => ({
        role: msg.role === "bot" ? "assistant" : "user",
        content: msg.text
      })),
      { role: "user", content: userMessage }
    ];

    const response = await axios.post(
      GROQ_URL,
      {
        model: "llama-3.1-8b-instant",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
      },
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error("Groq API Error:", error.response?.data || error.message);
    return "I'm having trouble connecting to the network. Please check the ministry list manually.";
  }
}
router.post('/speech-to-text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio provided" });

    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, 'recording.m4a');
    formData.append('model', 'whisper-large-v3'); // Best for multilingual/Indian accents
    formData.append('language', 'hi'); // Optional: can auto-detect

    const response = await axios.post(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      formData,
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    res.json({ text: response.data.text });
  } catch (error: any) {
    console.error("Whisper Error:", error.message);
    res.status(500).json({ error: "Speech recognition failed" });
  }
});
// ✅ Corrected Route
router.post('/chat-assistant', async (req, res: Response) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Fetch ministries from DB
    const ministriesRes = await pool.query(
      `SELECT name, categories FROM ministries WHERE is_active = true`
    );

    const availableMinistries = ministriesRes.rows.map(m =>
      `- ${m.name} (Handles: ${m.categories?.join(', ')})`
    ).join('\n');

    // 2. Define Prompt
    const systemPrompt = `
      You are "GovAssistant", an expert AI for the Indian Government Grievance Platform.
      Your task is to help citizens identify the correct ministry and draft professional complaints.
      
      Available Ministries in our database:
      ${availableMinistries}

      Instructions:
      - ONLY suggest ministries from the list above.
      - If the user's issue is related to Water/Potholes, suggest 'Ministry of Housing and Urban Affairs' or similar if present.
      - If they ask 'How to write a complaint?', provide a formal 3-4 line template based on their issue.
      - Keep responses short, helpful, and professional. Use 'Namaste' or 'Hello'.

      MULTILINGUAL RULES:
      - You are a polyglot assistant.
      - If the user speaks in Hindi, reply in Hindi.
      - If they use "Hinglish", reply in a mix of Hindi and English.
      - Support regional languages like Punjabi, Bengali, Tamil, etc., if asked.
      - Always keep the tone helpful and professional.

      CORE CAPABILITIES:
  - You are fully multilingual. 
  - ALWAYS detect the user's input language and respond in the EXACT same language (Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Punjabi, or English).
  - If the user uses a mix (Hinglish/Tanglish), respond in that mixed style to be more friendly.
    `;

    // 3. Call Groq
    const responseText = await callGroqAI(systemPrompt, message, history || []);

    res.json({ response: responseText });
  } catch (err) {
    console.error('Chat AI Error:', err);
    res.status(500).json({ error: 'Assistant is currently offline' });
  }
});

// ✅ Existing Keyword-based Suggestion
router.post('/suggest-ministry', async (req, res: Response) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Description required' });

    const ministriesRes = await pool.query(
      `SELECT id, name, categories FROM ministries WHERE is_active = true`
    );

    const ministries = ministriesRes.rows;
    const descWords: string[] = description.toLowerCase().replace(/[^\w\s]/g, '').split(' ').filter((w: string) => w.length > 2);

    const suggestions = ministries.map((m: any) => {
      let score = 0;
      let matchedWords: string[] = [];
      const categories: string[] = (m.categories || []).map((c: string) => c.toLowerCase());

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
        reason: matchedWords.length > 0 ? `Matches keywords: ${[...new Set(matchedWords)].join(', ')}` : '',
      };
    })
      .filter((m: any) => m.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3);

    if (suggestions.length === 0) {
      const fallback = ministries.slice(0, 3).map((m: any) => ({ ...m, reason: 'General Match' }));
      return res.json({ suggestions: fallback });
    }
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: 'AI suggestion failed' });
  }
});

export default router;