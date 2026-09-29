import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCheck, ChevronDown, CircleHelp, Clock3, Command, Filter, LayoutDashboard, ListTodo, LoaderCircle, Menu, MoreHorizontal, Plus, Search, Settings2, SlidersHorizontal, Snowflake, Sparkles, ThermometerSnowflake, Trash2, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '/api';
const STATUSES = ['New request', 'Needs quote', 'Awaiting approval', 'Ready to schedule', 'Scheduled', 'Completed'];
const EMPTY = { customer: '', contact: '', phone: '', email: '', equipment: '', issue: '', status: 'New request', priority: 'Normal', source: 'Phone', followUpDate: new Date().toLocaleDateString('en-CA'), notes: '' };
const today = (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; })();
const fmtDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not set';
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

async function request(path, options) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Could not connect to the service desk.');
  }
  return response.status === 204 ? null : response.json();
}

function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeView, setActiveView] = useState('Today');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  async function refresh() {
    setLoadError('');
    try { setJobs(await request('/jobs')); }
    catch (error) { setLoadError(error.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer); }, [toast]);

  const followUps = useMemo(() => jobs.filter((job) => job.status !== 'Completed' && (!job.followUpDate || job.followUpDate <= today)).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'Urgent' ? -1 : 1;
    return (a.followUpDate || '').localeCompare(b.followUpDate || '');
  }), [jobs]);
  const openJobs = jobs.filter((job) => job.status !== 'Completed');
  const overdue = jobs.filter((job) => job.status !== 'Completed' && job.followUpDate && job.followUpDate < today);
  const quotes = openJobs.filter((job) => ['Needs quote', 'Awaiting approval'].includes(job.status));
  const needsScheduling = openJobs.filter((job) => job.status === 'Ready to schedule');

  const visibleJobs = useMemo(() => {
    let list = activeView === 'Today' ? followUps : activeView === 'All jobs' ? jobs : activeView === 'Needs quote' ? jobs.filter((job) => job.status === 'Needs quote') : activeView === 'Awaiting approval' ? jobs.filter((job) => job.status === 'Awaiting approval') : activeView === 'Ready to schedule' ? jobs.filter((job) => job.status === 'Ready to schedule') : activeView === 'Scheduled' ? jobs.filter((job) => job.status === 'Scheduled') : jobs.filter((job) => job.status === 'Completed');
    if (statusFilter !== 'All statuses' && activeView !== 'Today') list = list.filter((job) => job.status === statusFilter);
    if (query.trim()) {
      const term = query.trim().toLowerCase();
      list = list.filter((job) => [job.customer, job.contact, job.equipment, job.issue, job.phone].some((field) => field?.toLowerCase().includes(term)));
    }
    return list;
  }, [activeView, followUps, jobs, query, statusFilter]);

  async function saveJob(form) {
    setSaving(true);
    try {
      const saved = modal?.id ? await request(`/jobs/${modal.id}`, { method: 'PATCH', body: JSON.stringify(form) }) : await request('/jobs', { method: 'POST', body: JSON.stringify(form) });
      setJobs((current) => modal?.id ? current.map((job) => job.id === saved.id ? saved : job) : [saved, ...current]);
      setModal(null);
      setToast(modal?.id ? 'Job updated' : 'Request added to your desk');
    } catch (error) { setToast(error.message); }
    finally { setSaving(false); }
  }

  async function updateJob(job, changes, message) {
    try {
      const saved = await request(`/jobs/${job.id}`, { method: 'PATCH', body: JSON.stringify(changes) });
      setJobs((current) => current.map((item) => item.id === saved.id ? saved : item));
      setToast(message);
    } catch (error) { setToast(error.message); }
  }

  async function deleteJob(job) {
    if (!window.confirm(`Remove the request from ${job.customer}?`)) return;
    try {
      await request(`/jobs/${job.id}`, { method: 'DELETE' });
      setJobs((current) => current.filter((item) => item.id !== job.id));
      setModal(null);
      setToast('Request removed');
    } catch (error) { setToast(error.message); }
  }

  const navItems = [
    { label: 'Today', icon: ListTodo, count: followUps.length, group: 'WORKSPACE' },
    { label: 'All jobs', icon: LayoutDashboard, count: openJobs.length },
    { label: 'Needs quote', icon: ArrowUpRight, count: jobs.filter((job) => job.status === 'Needs quote').length },
    { label: 'Awaiting approval', icon: Clock3, count: jobs.filter((job) => job.status === 'Awaiting approval').length },
    { label: 'Ready to schedule', icon: CalendarDays, count: needsScheduling.length },
    { label: 'Scheduled', icon: Check, count: jobs.filter((job) => job.status === 'Scheduled').length },
    { label: 'Completed', icon: CheckCheck, count: jobs.filter((job) => job.status === 'Completed').length, group: 'MORE' },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Snowflake size={19} strokeWidth={2.2} /></div><span>coldtrack<span className="brand-dot">.</span></span><button className="sidebar-close icon-button" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={17} /></button></div>
        <button className="workspace-switch"><div className="workspace-icon">H</div><span><strong>Harbor Service Co.</strong><small>Service desk</small></span><ChevronDown size={15} /></button>
        <div className="nav-section"><p className="nav-label">WORKSPACE</p>
          {navItems.slice(0, 1).map((item) => <NavItem key={item.label} item={item} active={activeView === item.label} onClick={() => { setActiveView(item.label); setMobileNav(false); }} />)}
          <div className="nav-divider" />
          {navItems.slice(1, 6).map((item) => <NavItem key={item.label} item={item} active={activeView === item.label} onClick={() => { setActiveView(item.label); setMobileNav(false); }} />)}
        </div>
        <div className="nav-section nav-more"><p className="nav-label">MORE</p>{navItems.slice(6).map((item) => <NavItem key={item.label} item={item} active={activeView === item.label} onClick={() => { setActiveView(item.label); setMobileNav(false); }} />)}</div>
        <div className="sidebar-spacer" />
        <div className="sidebar-nudge"><div className="nudge-icon"><Sparkles size={15} /></div><strong>Keep the work moving</strong><p>Every follow-up is one less job left behind.</p><button onClick={() => { setActiveView('Today'); setMobileNav(false); }}>See today's list <ArrowRight size={14} /></button></div>
        <button className="help-link"><CircleHelp size={16} /> Help & support <ArrowUpRight size={13} /></button>
        <div className="profile"><div className="profile-avatar">DM</div><span><strong>Denise Miller</strong><small>Owner</small></span><MoreHorizontal size={18} /></div>
      </aside>
      {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <main className="main-area">
        <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="breadcrumbs"><span>Harbor Service Co.</span><span className="crumb-sep">/</span><strong>{activeView}</strong></div><div className="topbar-right"><div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs..." /><kbd>⌘ K</kbd></div><div className="top-date"><CalendarDays size={15} />{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div><button className="top-settings icon-button" aria-label="Settings"><Settings2 size={17} /></button></div></header>

        <div className="page-content">
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR SERVICE DESK</div><h1>{activeView === 'Today' ? 'Good morning, Denise' : activeView}<span className="heading-period">.</span></h1><p className="heading-sub">{activeView === 'Today' ? 'Here’s what needs your attention today.' : activeView === 'All jobs' ? 'Every request, all in one place.' : `Keep track of your ${activeView.toLowerCase()} requests.`}</p></div><button className="primary-button" onClick={() => setModal({ job: { ...EMPTY }, mode: 'create' })}><Plus size={17} strokeWidth={2.3} /> New request</button></div>

          <section className="stats-grid" aria-label="Job summary">
            <StatCard icon={ListTodo} label="Needs your attention" value={followUps.length} note={overdue.length ? `${overdue.length} past due` : 'All caught up on overdue'} tone={overdue.length ? 'alert' : 'green'} />
            <StatCard icon={ArrowUpRight} label="Quotes in progress" value={quotes.length} note="Sent or still to prepare" tone="blue" />
            <StatCard icon={CalendarDays} label="Ready to schedule" value={needsScheduling.length} note="Approved and waiting" tone="amber" />
            <StatCard icon={Activity} label="Open requests" value={openJobs.length} note={`${jobs.filter((job) => job.status === 'Completed').length} completed this period`} tone="violet" />
          </section>

          <section className="jobs-panel">
            <div className="panel-heading"><div className="panel-title-wrap"><div className="panel-icon"><ListTodo size={17} /></div><div><h2>{activeView === 'Today' ? 'Today’s follow-ups' : activeView}</h2><p>{activeView === 'Today' ? 'The people waiting to hear from you.' : 'Your service requests at a glance.'}</p></div></div><div className="panel-actions"><span className="record-count">{visibleJobs.length} {visibleJobs.length === 1 ? 'request' : 'requests'}</span><label className="filter-control"><Filter size={14} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option>All statuses</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={13} /></label><button className="icon-button filter-mobile" aria-label="Filter jobs"><SlidersHorizontal size={16} /></button></div></div>
            {loadError && <div className="error-banner"><AlertCircle size={16} /><span>{loadError}</span><button onClick={refresh}>Try again</button></div>}
            {loading ? <div className="loading-state"><LoaderCircle className="spin" size={22} /> Loading your service desk…</div> : visibleJobs.length ? <div className="table-scroll"><table className="jobs-table"><thead><tr><th>CUSTOMER & JOB</th><th>STATUS</th><th>FOLLOW UP</th><th>PRIORITY</th><th className="th-action"></th></tr></thead><tbody>{visibleJobs.map((job) => <JobRow key={job.id} job={job} onEdit={() => setModal({ job, id: job.id, mode: 'edit' })} />)}</tbody></table></div> : <div className="empty-state"><div className="empty-art"><CheckCheck size={25} /></div><strong>{query ? 'No matching requests' : activeView === 'Today' ? 'You’re all caught up' : 'Nothing here yet'}</strong><p>{query ? 'Try another name or equipment type.' : activeView === 'Today' ? 'No follow-ups are due today. New requests will show up here.' : 'Requests will appear here as you add them.'}</p>{activeView === 'Today' && !query && <button className="text-button" onClick={() => setActiveView('All jobs')}>View all jobs <ArrowRight size={14} /></button>}</div>}
            <div className="panel-footer"><span><span className="footer-pulse" /> Synced just now</span><button onClick={() => setActiveView('All jobs')}>View all jobs <ArrowRight size={14} /></button></div>
          </section>

          <div className="bottom-row"><section className="workflow-card"><div className="bottom-card-heading"><div className="bottom-heading-icon"><ThermometerSnowflake size={17} /></div><div><h3>Job pipeline</h3><p>See where every request stands.</p></div><button className="icon-button" aria-label="Pipeline options"><MoreHorizontal size={18} /></button></div><div className="pipeline-list">{STATUSES.map((status, index) => { const amount = jobs.filter((job) => job.status === status).length; return <button className="pipeline-row" key={status} onClick={() => setActiveView(status === 'New request' ? 'All jobs' : status)}><span className={`pipeline-dot dot-${index}`} /><span className="pipeline-name">{status}</span><span className="pipeline-track"><i style={{ width: `${Math.max(3, jobs.length ? amount / Math.max(...STATUSES.map((s) => jobs.filter((j) => j.status === s).length), 1) * 100 : 3)}%` }} /></span><strong>{amount}</strong></button>; })}</div></section>
            <section className="tip-card"><div className="tip-orb"><Sparkles size={17} /></div><span className="tip-label">A LITTLE REMINDER</span><h3>Small follow-ups<br />make a big difference.</h3><p>A quick call today can turn a waiting quote into tomorrow’s booked job.</p><button onClick={() => setActiveView('Today')}>Back to your list <ArrowRight size={14} /></button><div className="tip-decoration tip-decoration-one" /><div className="tip-decoration tip-decoration-two" /></section></div>
          <footer className="page-footer"><span>Made for the people who keep things running.</span><span><Command size={12} /> A calmer way to run the day</span></footer>
        </div>
      </main>
      {modal && <JobModal initial={modal.job} saving={saving} onClose={() => setModal(null)} onSave={saveJob} onDelete={modal.id ? () => deleteJob(modal.job) : null} />}
      {toast && <div className="toast"><Check size={15} />{toast}</div>}
    </div>
  );
}

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return <button className={`nav-item ${active ? 'nav-active' : ''}`} onClick={onClick}><Icon size={17} strokeWidth={active ? 2.1 : 1.8} /><span>{item.label}</span>{item.count > 0 && <small>{item.count}</small>}</button>;
}

function StatCard({ icon: Icon, label, value, note, tone }) {
  return <div className="stat-card"><div className={`stat-icon stat-${tone}`}><Icon size={17} strokeWidth={2} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small className={tone === 'alert' ? 'stat-alert-note' : ''}>{note}</small></div><span className={`stat-corner corner-${tone}`} /></div>;
}

function JobRow({ job, onEdit }) {
  const overdue = job.followUpDate && job.followUpDate < today;
  const dueToday = job.followUpDate === today;
  const label = !job.followUpDate ? 'Set a date' : overdue ? `${fmtDate(job.followUpDate)} · overdue` : dueToday ? 'Today' : fmtDate(job.followUpDate);
  return <tr onClick={onEdit} className="job-row"><td><div className="customer-cell"><div className={`customer-avatar avatar-${job.priority === 'Urgent' ? 'urgent' : initials(job.customer).charCodeAt(0) % 5}`}>{initials(job.customer)}</div><div className="customer-info"><div><strong>{job.customer}</strong>{job.priority === 'Urgent' && <span className="urgent-inline"><span /> Urgent</span>}</div><span>{job.equipment || 'Service request'} <i>·</i> {job.contact || job.source}</span></div></div></td><td><span className={`status-pill ${statusClass(job.status)}`}><i />{job.status}</span></td><td><span className={`follow-cell ${overdue ? 'follow-overdue' : ''}`}><CalendarDays size={14} />{label}</span></td><td><span className={`priority-pill priority-${job.priority.toLowerCase()}`}>{job.priority === 'Urgent' ? <ArrowUpRight size={12} /> : <span className="priority-dash">—</span>}{job.priority}</span></td><td className="row-action" onClick={(event) => event.stopPropagation()}><button className="row-more icon-button" onClick={onEdit} aria-label={`Edit ${job.customer}`}><MoreHorizontal size={18} /></button></td></tr>;
}

function statusClass(status = '') { return status.toLowerCase().replaceAll(' ', '-'); }

function JobModal({ initial, saving, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  function submit(event) {
    event.preventDefault();
    if (!form.customer.trim()) { setError('Add a customer or business name to continue.'); return; }
    setError('');
    onSave(form);
  }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="job-modal" onSubmit={submit}><div className="modal-heading"><div><span className="modal-eyebrow">SERVICE REQUEST</span><h2>{initial.id ? 'Update request' : 'Add a new request'}</h2><p>Keep the important details and next step in one place.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><div className="modal-body">{error && <div className="form-error"><AlertCircle size={15} />{error}</div>}<label className="field full-field">Customer or business name <b>*</b><input autoFocus value={form.customer} onChange={(event) => set('customer', event.target.value)} placeholder="e.g. Harbor House Grill" /></label><div className="form-grid"><label className="field">Contact person<input value={form.contact || ''} onChange={(event) => set('contact', event.target.value)} placeholder="Name" /></label><label className="field">Phone number<input type="tel" value={form.phone || ''} onChange={(event) => set('phone', event.target.value)} placeholder="(555) 000-0000" /></label><label className="field">Equipment<input value={form.equipment || ''} onChange={(event) => set('equipment', event.target.value)} placeholder="Walk-in cooler" /></label><label className="field">Request came in by<select value={form.source || 'Phone'} onChange={(event) => set('source', event.target.value)}>{['Phone', 'Website', 'Text', 'Referral', 'Repeat customer', 'Other'].map((source) => <option key={source}>{source}</option>)}</select></label><label className="field">Job status<select value={form.status} onChange={(event) => set('status', event.target.value)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><label className="field">Priority<select value={form.priority} onChange={(event) => set('priority', event.target.value)}><option>Normal</option><option>Urgent</option></select></label><label className="field">Follow-up date<input type="date" value={form.followUpDate || ''} onChange={(event) => set('followUpDate', event.target.value)} /></label><label className="field">Email<input type="email" value={form.email || ''} onChange={(event) => set('email', event.target.value)} placeholder="name@business.com" /></label><label className="field full-field">What’s going on?<textarea rows="2" value={form.issue || ''} onChange={(event) => set('issue', event.target.value)} placeholder="What does the customer need help with?" /></label><label className="field full-field">Notes for yourself<textarea rows="2" value={form.notes || ''} onChange={(event) => set('notes', event.target.value)} placeholder="Last conversation, quote details, next step…" /></label></div></div><div className="modal-footer">{onDelete ? <button type="button" className="delete-button" onClick={onDelete}><Trash2 size={15} /> Remove</button> : <span className="required-note"><b>*</b> Required field</span>}<div><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{initial.id ? 'Save changes' : 'Add request'}</button></div></div></form></div>;
}

export default App;
