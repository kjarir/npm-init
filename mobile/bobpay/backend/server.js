require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.IPFS_PORT || 3002;
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API = 'https://api.pinata.cloud';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const ESCROW_TIMEOUT_MS = Number(process.env.ESCROW_TIMEOUT_MS || 15000);

if (!PINATA_JWT) {
  console.error('❌ PINATA_JWT is missing. Create backend/.env with PINATA_JWT=');
}

const pinataHeaders = {
  Authorization: `Bearer ${PINATA_JWT}`,
};

const upload = multer({ storage: multer.memoryStorage() });

const clampNumber = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const parseJsonSafe = (value) => {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch (_) {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(value.slice(start, end + 1));
    } catch (err) {
      return null;
    }
  }
};

const getDomainHint = (title = '', description = '') => {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('blockchain') || text.includes('web3')) return 'blockchain';
  if (text.includes('mobile') || text.includes('android') || text.includes('ios')) return 'mobile app';
  if (text.includes('web') || text.includes('website')) return 'web platform';
  if (text.includes('ai') || text.includes('ml') || text.includes('machine learning')) return 'AI solution';
  if (text.includes('design') || text.includes('ui') || text.includes('ux')) return 'design system';
  return 'software product';
};

const allocateBudget = (budget, count) => {
  const normalizedBudget = Math.max(0, Number(budget) || 0);
  const weights = [];
  if (count === 1) {
    weights.push(1);
  } else if (count === 2) {
    weights.push(0.4, 0.6);
  } else if (count === 3) {
    weights.push(0.2, 0.5, 0.3);
  } else if (count === 4) {
    weights.push(0.15, 0.35, 0.35, 0.15);
  } else {
    weights.push(0.1);
    const middleCount = count - 2;
    const middleWeight = 0.8 / middleCount;
    for (let i = 0; i < middleCount; i += 1) {
      weights.push(middleWeight);
    }
    weights.push(0.1);
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const amounts = weights.map((w) => Math.round((normalizedBudget * (w / totalWeight)) * 100) / 100);
  const total = amounts.reduce((sum, value) => sum + value, 0);
  const diff = Math.round((normalizedBudget - total) * 100) / 100;
  if (amounts.length > 0 && Math.abs(diff) >= 0.01) {
    amounts[amounts.length - 1] = Math.round((amounts[amounts.length - 1] + diff) * 100) / 100;
  }
  return amounts;
};

const buildFallbackDescription = (title) => {
  const sanitizedTitle = title.trim();
  const domain = getDomainHint(title, '');
  return `This project delivers "${sanitizedTitle}" as a ${domain} with a focus on security, usability, and performance. The scope includes requirements gathering, solution design, implementation, testing, and deployment with clear documentation and handover.`;
};

const buildFallbackMilestones = ({ title, description, count, budget }) => {
  const normalizedCount = clampNumber(count, 1, 8, 4);
  const amounts = allocateBudget(budget, normalizedCount);
  const domain = getDomainHint(title, description);
  const templates = [
    {
      title: 'Discovery & Requirements',
      description: `Clarify goals, user flows, and success criteria for the ${domain}.`,
    },
    {
      title: 'Architecture & Design',
      description: 'Define technical architecture, data model, and UX direction.',
    },
    {
      title: 'Core Implementation',
      description: 'Build core functionality, integrate APIs, and deliver main features.',
    },
    {
      title: 'Testing & Hardening',
      description: 'Run QA, fix issues, improve performance, and finalize documentation.',
    },
    {
      title: 'Deployment & Handover',
      description: 'Deploy to production, deliver access, and provide handover support.',
    },
  ];

  const milestones = [];
  for (let i = 0; i < normalizedCount; i += 1) {
    const template = templates[i] || {
      title: `Phase ${i + 1}`,
      description: `Complete phase ${i + 1} deliverables for the ${domain}.`,
    };
    milestones.push({
      title: template.title,
      description: template.description,
      amount: amounts[i] ?? 0,
    });
  }
  return milestones;
};

const callOpenAi = async ({ messages }) => {
  if (!OPENAI_API_KEY) return null;
  try {
    const response = await axios.post(
      `${OPENAI_BASE_URL}/chat/completions`,
      {
        model: OPENAI_MODEL,
        messages,
        temperature: 0.4,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: ESCROW_TIMEOUT_MS,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    return parseJsonSafe(content);
  } catch (err) {
    console.warn('⚠️ Escrow AI call failed, using fallback:', err.message);
    return null;
  }
};

app.get('/api/ipfs/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create a Pinata group
app.post('/api/ipfs/groups', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const response = await axios.post(
      `${PINATA_API}/groups`,
      { name },
      { headers: { ...pinataHeaders, 'Content-Type': 'application/json' } }
    );
    res.json({ success: true, groupId: response.data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add CIDs to an existing group
app.put('/api/ipfs/groups/:id/cids', async (req, res) => {
  try {
    const { id } = req.params;
    const { cids } = req.body;
    if (!Array.isArray(cids) || cids.length === 0) {
      return res.status(400).json({ error: 'cids must be a non-empty array' });
    }
    await axios.put(
      `${PINATA_API}/groups/${id}/cids`,
      { cids },
      { headers: { ...pinataHeaders, 'Content-Type': 'application/json' } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pin JSON to IPFS
app.post('/api/ipfs/pinJSON', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'data is required' });
    const response = await axios.post(
      `${PINATA_API}/pinning/pinJSONToIPFS`,
      data,
      { headers: { ...pinataHeaders, 'Content-Type': 'application/json' } }
    );
    res.json({ success: true, ipfsHash: response.data.IpfsHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pin file to IPFS
app.post('/api/ipfs/pinFile', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);

    const response = await axios.post(
      `${PINATA_API}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          ...pinataHeaders,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
      }
    );
    const ipfsHash = response.data.IpfsHash;

    // Optionally add CID to group
    const groupId = req.body.groupId;
    if (groupId) {
      await axios.put(
        `${PINATA_API}/groups/${groupId}/cids`,
        { cids: [ipfsHash] },
        { headers: { ...pinataHeaders, 'Content-Type': 'application/json' } }
      );
    }

    res.json({ success: true, ipfsHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/escrow/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/escrow/generate-description', async (req, res) => {
  try {
    const title = (req.body?.title || '').toString().trim();
    if (!title) return res.status(400).json({ error: 'title is required' });

    let description = buildFallbackDescription(title);
    const aiResult = await callOpenAi({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful product manager. Return JSON only.',
        },
        {
          role: 'user',
          content: `Generate a concise, detailed project description for "${title}". Return JSON: {"description":"..."}.`,
        },
      ],
    });

    if (aiResult?.description && typeof aiResult.description === 'string') {
      description = aiResult.description.trim();
    }

    res.json({ description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/escrow/generate-milestones', async (req, res) => {
  try {
    const title = (req.body?.title || '').toString().trim();
    const description = (req.body?.description || '').toString().trim();
    const count = clampNumber(req.body?.count, 1, 8, 4);
    const budget = clampNumber(req.body?.budget, 0, Number.MAX_SAFE_INTEGER, 0);

    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!description) return res.status(400).json({ error: 'description is required' });
    if (!Number.isFinite(budget) || budget <= 0) {
      return res.status(400).json({ error: 'budget must be a number > 0' });
    }

    let milestones = buildFallbackMilestones({ title, description, count, budget });
    const aiResult = await callOpenAi({
      messages: [
        {
          role: 'system',
          content: 'You are a project manager. Return JSON only.',
        },
        {
          role: 'user',
          content: `Break this project into ${count} milestones with titles, descriptions, and amounts that sum to ${budget}. Title: "${title}". Description: "${description}". Return JSON: {"milestones":[{"title":"","description":"","amount":0}]}`,
        },
      ],
    });

    if (Array.isArray(aiResult?.milestones)) {
      const cleaned = aiResult.milestones
        .filter(Boolean)
        .slice(0, count)
        .map((item, index) => ({
          title: (item?.title || `Milestone ${index + 1}`).toString().trim(),
          description: (item?.description || '').toString().trim(),
          amount: Number(item?.amount),
        }));

      const totalAmount = cleaned.reduce((sum, m) => sum + (Number.isFinite(m.amount) ? m.amount : 0), 0);
      const hasValidAmounts = cleaned.every((m) => Number.isFinite(m.amount) && m.amount >= 0);
      if (cleaned.length > 0) {
        if (!hasValidAmounts || Math.abs(totalAmount - budget) > 0.01) {
          const amounts = allocateBudget(budget, cleaned.length);
          milestones = cleaned.map((m, i) => ({ ...m, amount: amounts[i] ?? 0 }));
        } else {
          milestones = cleaned;
        }
      }
    }

    res.json({ milestones });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Reputation ---
const REP_SCORE = {
  milestoneCompletion: 5,
  speedBonus: 3,
  highValueContract: 3,
  streakBonus: 2,
  missedDeadline: -5,
  contractAbandonment: -10,
};

app.get('/api/reputation/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/reputation/calculate', (req, res) => {
  try {
    const body = req.body || {};
    const milestoneCompletion = Boolean(body.milestoneCompletion);
    const speedBonus = Boolean(body.speedBonus);
    const highValueContract = Boolean(body.highValueContract);
    const streakBonus = Boolean(body.streakBonus);
    const missedDeadline = Boolean(body.missedDeadline);
    const contractAbandonment = Boolean(body.contractAbandonment);
    let currentReputation = clampNumber(body.currentReputation, 0, 100, 50);

    const details = [];
    let totalScoreChange = 0;

    if (milestoneCompletion) {
      details.push(`Milestone Completion: +${REP_SCORE.milestoneCompletion}`);
      totalScoreChange += REP_SCORE.milestoneCompletion;
    }
    if (speedBonus) {
      details.push(`Speed Bonus: +${REP_SCORE.speedBonus}`);
      totalScoreChange += REP_SCORE.speedBonus;
    }
    if (highValueContract) {
      details.push(`High Value Contract: +${REP_SCORE.highValueContract}`);
      totalScoreChange += REP_SCORE.highValueContract;
    }
    if (streakBonus) {
      details.push(`Streak Bonus: +${REP_SCORE.streakBonus}`);
      totalScoreChange += REP_SCORE.streakBonus;
    }
    if (missedDeadline) {
      details.push(`Missed Deadline: ${REP_SCORE.missedDeadline}`);
      totalScoreChange += REP_SCORE.missedDeadline;
    }
    if (contractAbandonment) {
      details.push(`Contract Abandonment: ${REP_SCORE.contractAbandonment}`);
      totalScoreChange += REP_SCORE.contractAbandonment;
    }

    const newReputation = Math.round(
      Math.min(100, Math.max(0, currentReputation + totalScoreChange)) * 100
    ) / 100;

    res.json({
      success: true,
      data: {
        currentReputation,
        totalScoreChange,
        newReputation,
        details,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Fabric / Blockchain proxy (optional) ---
// If FABRIC_UPSTREAM_URL is set, proxy /api/fabric/* to the blockchain server.
// Use same host as this server for Fabric: e.g. VITE_HL_API_URL=http://YOUR_IP:3002/api/fabric
const FABRIC_UPSTREAM = process.env.FABRIC_UPSTREAM_URL || '';
if (FABRIC_UPSTREAM) {
  const upstreamBase = FABRIC_UPSTREAM.replace(/\/$/, '');
  app.use('/api/fabric', async (req, res) => {
    const subPath = req.originalUrl.replace(/^\/api\/fabric/, '') || '/';
    const url = `${upstreamBase}${subPath}`;
    try {
      const opts = {
        method: req.method,
        url,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: 28000,
      };
      if (req.method !== 'GET' && req.body) opts.data = req.body;
      const r = await axios(opts);
      res.status(r.status).json(r.data);
    } catch (err) {
      const status = err.response?.status || 502;
      const body = err.response?.data || { error: err.message };
      res.status(status).json(body);
    }
  });
  console.log(`✅ Fabric proxy enabled: /api/fabric -> ${upstreamBase}`);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ IPFS backend running on http://0.0.0.0:${PORT}`);
});
