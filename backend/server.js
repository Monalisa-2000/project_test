const express = require('express');
const cors = require('cors');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, 'data', 'jobs.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const STATUSES = ['New request', 'Needs quote', 'Awaiting approval', 'Ready to schedule', 'Scheduled', 'Completed'];
const PRIORITIES = ['Normal', 'Urgent'];

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

function day(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

const demoJobs = [
  { id: randomUUID(), customer: 'Harbor House Grill', contact: 'Maya Chen', phone: '(415) 555-0182', email: 'maya@harborhouse.example', equipment: 'Walk-in freezer', issue: 'Freezer not holding temperature; food at risk.', status: 'Needs quote', priority: 'Urgent', source: 'Phone', followUpDate: day(), notes: 'Called Friday afternoon. Call before 10am.', createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), customer: 'Juniper Market', contact: 'Luis Romero', phone: '(415) 555-0136', email: 'luis@juniper.example', equipment: 'Display cooler', issue: 'Produce case running warm.', status: 'Awaiting approval', priority: 'Normal', source: 'Website', followUpDate: day(), notes: 'Quote sent by email; check in today.', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), customer: 'The Lantern Cafe', contact: 'Sam Patel', phone: '(415) 555-0119', email: '', equipment: 'Ice machine', issue: 'Machine stopped making ice.', status: 'Ready to schedule', priority: 'Normal', source: 'Text', followUpDate: day(), notes: 'Approved estimate. Confirm a time with Sam.', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), customer: 'Westside Provisions', contact: 'Erin Brooks', phone: '(415) 555-0191', email: 'erin@westside.example', equipment: 'Walk-in cooler', issue: 'Door seal needs replacing.', status: 'Scheduled', priority: 'Normal', source: 'Referral', followUpDate: day(2), notes: 'Visit booked for Thursday morning.', createdAt: new Date(Date.now() - 4 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), customer: 'Parkview Hotel', contact: 'Nina Foster', phone: '(415) 555-0174', email: '', equipment: 'Prep cooler', issue: 'Intermittent compressor noise.', status: 'New request', priority: 'Normal', source: 'Phone', followUpDate: day(-1), notes: 'New lead from office line.', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString() },
  { id: randomUUID(), customer: 'Redwood Bakery', contact: 'Alex Kim', phone: '(415) 555-0145', email: 'alex@redwood.example', equipment: 'Reach-in freezer', issue: 'Ice building up around the evaporator.', status: 'Completed', priority: 'Normal', source: 'Repeat customer', followUpDate: '', notes: 'Repair completed; customer happy.', createdAt: new Date(Date.now() - 9 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
];

async function readJobs() {
  try { return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(demoJobs, null, 2));
    return demoJobs;
  }
}

async function saveJobs(jobs) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(jobs, null, 2));
}

function cleanJob(input, existing = {}) {
  const fields = ['customer', 'contact', 'phone', 'email', 'equipment', 'issue', 'status', 'priority', 'source', 'followUpDate', 'notes'];
  const job = { ...existing };
  for (const field of fields) if (input[field] !== undefined) job[field] = String(input[field]).trim();
  if (!job.customer) return { error: 'Customer name is required.' };
  if (!STATUSES.includes(job.status)) return { error: 'Choose a valid job status.' };
  if (!PRIORITIES.includes(job.priority)) return { error: 'Choose a valid priority.' };
  if (job.followUpDate && !/^\d{4}-\d{2}-\d{2}$/.test(job.followUpDate)) return { error: 'Follow-up date must use YYYY-MM-DD.' };
  job.updatedAt = new Date().toISOString();
  return job;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/jobs', async (_req, res, next) => {
  try { res.json(await readJobs()); } catch (error) { next(error); }
});
app.post('/api/jobs', async (req, res, next) => {
  try {
    const job = cleanJob(req.body);
    if (job.error) return res.status(400).json({ error: job.error });
    job.id = randomUUID();
    job.createdAt = new Date().toISOString();
    const jobs = await readJobs();
    jobs.unshift(job);
    await saveJobs(jobs);
    res.status(201).json(job);
  } catch (error) { next(error); }
});
app.patch('/api/jobs/:id', async (req, res, next) => {
  try {
    const jobs = await readJobs();
    const index = jobs.findIndex((job) => job.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Job not found.' });
    const job = cleanJob(req.body, jobs[index]);
    if (job.error) return res.status(400).json({ error: job.error });
    jobs[index] = job;
    await saveJobs(jobs);
    res.json(job);
  } catch (error) { next(error); }
});
app.delete('/api/jobs/:id', async (req, res, next) => {
  try {
    const jobs = await readJobs();
    const remaining = jobs.filter((job) => job.id !== req.params.id);
    if (remaining.length === jobs.length) return res.status(404).json({ error: 'Job not found.' });
    await saveJobs(remaining);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.use(express.static(DIST_DIR));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(DIST_DIR, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => console.log(`ColdTrack API ready at http://localhost:${PORT}`));
