const fs = require('fs');
const path = require('path');

// Shared data store backed by a single JSON file: { rev, meta, records }.
// `rev` is a monotonically increasing version number used for optimistic
// concurrency — clients send the rev they last saw, and a mismatch means
// someone else saved in between (conflict), so we don't silently clobber.
//
// NOTE (v1 limitation): saves replace the whole document. For a small team
// mostly editing different vehicles this is fine, and clients poll frequently
// so everyone stays fresh. Hardening to per-record writes is a later step.

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const TMP_PATH = STORE_PATH + '.tmp';

let cache = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function blank() {
  return { rev: 0, meta: { updatedAt: null, updatedBy: null }, records: [] };
}

function load() {
  if (cache) return cache;
  ensureDir();
  if (fs.existsSync(STORE_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
      cache = {
        rev: parsed.rev || 0,
        meta: parsed.meta || { updatedAt: null, updatedBy: null },
        records: Array.isArray(parsed.records) ? parsed.records : [],
      };
    } catch {
      cache = blank();
    }
  } else {
    cache = blank();
  }
  return cache;
}

function getAll() {
  const d = load();
  return { rev: d.rev, meta: d.meta, records: d.records };
}

// Persists a new full snapshot. If expectedRev is a number and does not match
// the current rev, returns { conflict: true, current } without writing.
function save({ records, meta, expectedRev, updatedBy }) {
  const d = load();
  if (typeof expectedRev === 'number' && expectedRev !== d.rev) {
    return { conflict: true, current: getAll() };
  }
  const next = {
    rev: d.rev + 1,
    meta: {
      updatedAt: (meta && meta.updatedAt) || null,
      updatedBy: updatedBy || (meta && meta.updatedBy) || null,
    },
    records: Array.isArray(records) ? records : [],
  };
  ensureDir();
  fs.writeFileSync(TMP_PATH, JSON.stringify(next));
  fs.renameSync(TMP_PATH, STORE_PATH); // atomic replace
  cache = next;
  return { ok: true, rev: next.rev, meta: next.meta };
}

module.exports = { getAll, save };
