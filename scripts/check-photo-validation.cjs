// Run with: node scripts/check-photo-validation.cjs
// Exercise API boundaries without changing demo data or calling a paid model.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const filename = path.join(root, file);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  const req = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id === 'server-only') return {};
    if (id.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), id)) + '.ts', mocks);
    return require(id);
  };
  new Function('require', 'module', 'exports', output)(req, mod, mod.exports);
  return mod.exports;
}
async function main() {
  const validation = load('lib/photo-validation.ts');
  const valid = { by: 'claude', is_road_issue: true, category: 'Road surface', subcategory: 'Pothole', description: 'Visible pothole', severity: 'medium', hazards: [] };
  const unrelated = { ...valid, is_road_issue: false };
  assert.equal(validation.isAcceptedPhoto(valid), true);
  for (const review of [null, unrelated, { ...valid, by: 'offline' }, { ...valid, subcategory: 'Logo' }, { ...valid, category: 'Footpath' }]) {
    assert.equal(validation.isAcceptedPhoto(review), false);
  }
  const responses = { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
  const reviews = new Map();
  let photoResult = unrelated;
  let photoError = false;
  const photoRoute = load('app/api/ai/photo/route.ts', {
    'next/server': responses,
    '@/lib/serverLang': { getLang: async () => 'en' },
    '@/lib/ai': { analyzePhoto: async () => { if (photoError) throw Error('provider unavailable'); return photoResult; } },
    '@/lib/photos': { savePhoto: async () => ({ url: '/api/photo/test.jpg', data: '', type: 'image/jpeg' }) },
    '@/lib/store': { hydrate: async () => {}, flush: async () => {}, recordPhotoReview: (url, review) => reviews.set(url, review) },
    '@/lib/photo-validation': validation,
  });
  const request = (body) => ({ json: async () => body });
  assert.equal((await photoRoute.POST(request({ image: 'test' }))).status, 422);
  assert.equal(reviews.get('/api/photo/test.jpg').is_road_issue, false);
  photoError = true;
  const unavailable = await photoRoute.POST(request({ image: 'test' }));
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.body.ai, null);
  photoError = false;
  photoResult = valid;
  assert.equal((await photoRoute.POST(request({ image: 'test' }))).status, 200);
  let saved;
  const complaintRoute = load('app/api/complaints/route.ts', {
    'next/server': responses,
    '@/lib/session': { getSession: async () => ({ role: 'citizen', id: 'test', name: 'Test' }) },
    '@/lib/store': { getPhotoReview: (url) => reviews.get(url), addComplaint: (c) => (saved = { ...c, complaint_id: 'test' }), flush: async () => {} },
    '@/lib/data': { locate: () => ({ lat: 19, lon: 72, ward_code: 'L' }) },
    '@/lib/taxonomy': { categoryOf: () => 'Road surface', nowStamp: () => '2026-11-21' },
    '@/lib/triage': { runTriage: async () => {} },
    '@/lib/lang': { detectLang: () => 'en' },
    '@/lib/photo-validation': validation,
  });
  const body = { photo: '/api/photo/forged.jpg', ai: valid, subcategory: 'Pothole', description: 'Reported road issue', lat: 19, lon: 72 };
  assert.equal((await complaintRoute.POST(request(body))).status, 422);
  assert.equal(saved, undefined);
  reviews.set(body.photo, unrelated);
  assert.equal((await complaintRoute.POST(request(body))).status, 422);
  reviews.set(body.photo, valid);
  assert.equal((await complaintRoute.POST(request({ ...body, ai: unrelated }))).status, 200);
  assert.equal(saved.ai, valid);
  assert.equal((await complaintRoute.POST(request({ ...body, photo: null }))).status, 200);
  assert.equal(saved.ai, null);
  const priorKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const ai = load('lib/ai.ts');
    await assert.rejects(ai.analyzePhoto('', 'image/png'), /could not verify/i);
    const review = await ai.triage({ category: 'Pothole', locality: 'Kurla' });
    assert.equal(review.validity, 'Needs more info');
    assert.equal(review.review_version, validation.TRIAGE_REVIEW_VERSION);
  } finally {
    if (priorKey !== undefined) process.env.ANTHROPIC_API_KEY = priorKey;
  }
  console.log('Photo validation passed: unrelated, unavailable, accepted, forged tags, text-only, officer review.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
