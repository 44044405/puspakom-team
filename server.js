require('dotenv').config();
const express = require('express');
const path = require('path');
const dataStore = require('./data-store');

const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Shared team passcode. Required — the app holds customer PII + financials, so
// it must never be reachable without it. Fail loudly if it isn't configured.
const ACCESS_CODE = process.env.ACCESS_CODE;
if (!ACCESS_CODE) {
  console.warn('WARNING: ACCESS_CODE is not set. Set it in .env before using this for real data.');
}

// Simple shared-passcode gate: the client sends the code in the x-access-code
// header on every request. Not per-user accounts — matches how the team already
// works (one shared code), and keeps the sensitive data behind a login.
function requireCode(req, res, next) {
  if (!ACCESS_CODE) {
    return res.status(500).json({ error: 'Server has no ACCESS_CODE configured.' });
  }
  const provided = req.get('x-access-code');
  if (provided !== ACCESS_CODE) {
    return res.status(401).json({ error: 'Wrong or missing passcode.' });
  }
  next();
}

// Tells the client whether a passcode is required (always true here) so it can
// show the login screen.
app.get('/api/mode', (req, res) => {
  res.json({ requiresAccessCode: true });
});

app.post('/api/login', (req, res) => {
  const { code } = req.body || {};
  if (!ACCESS_CODE) return res.status(500).json({ error: 'Server has no ACCESS_CODE configured.' });
  if (code === ACCESS_CODE) return res.json({ ok: true });
  return res.status(401).json({ error: 'Incorrect passcode.' });
});

// Fetch the whole shared dataset (records + version).
app.get('/api/data', requireCode, (req, res) => {
  res.json(dataStore.getAll());
});

// Replace the shared dataset. Body: { records, meta, rev }. `rev` is the version
// the client last saw — a mismatch means someone else saved in between, so we
// return 409 with the current server copy instead of clobbering it.
app.put('/api/data', requireCode, (req, res) => {
  const { records, meta, rev } = req.body || {};
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'records must be an array.' });
  }
  const result = dataStore.save({
    records,
    meta,
    expectedRev: typeof rev === 'number' ? rev : undefined,
    updatedBy: (meta && meta.updatedBy) || null,
  });
  if (result.conflict) {
    return res.status(409).json({ error: 'conflict', current: result.current });
  }
  res.json({ ok: true, rev: result.rev, meta: result.meta });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Puspakom Team server running at http://localhost:${PORT}`);
});
