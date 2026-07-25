import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  Search,
  X,
  Settings,
  MessageSquare,
  Pencil,
  Trash2,
  Copy,
  Check,
  Users,
  ChevronRight,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'corecraft-leads'
const USER_NAME_KEY = 'corecraft-user-name'

const STATUSES = ['New', 'Contacted', 'Follow-up', 'Converted', 'Rejected']

const PLATFORMS = ['LinkedIn', 'Instagram', 'Facebook', 'Other']

const STATUS_CLASS = {
  New: 'badge-status-new',
  Contacted: 'badge-status-contacted',
  'Follow-up': 'badge-status-follow-up',
  Converted: 'badge-status-converted',
  Rejected: 'badge-status-rejected',
}

const EMPTY_LEAD = {
  name: '',
  platform: 'Instagram',
  niche: '',
  contactInfo: '',
  status: 'New',
  notes: '',
  nextFollowUp: '',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
  return crypto.randomUUID()
}

function loadLeads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadUserName() {
  return localStorage.getItem(USER_NAME_KEY) || ''
}

function getFollowUpInfo(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24))

  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, type: 'overdue', diff }
  if (diff === 0) return { label: 'Due today', type: 'today', diff }
  if (diff === 1) return { label: 'Tomorrow', type: 'upcoming', diff }
  return { label: `In ${diff} days`, type: 'upcoming', diff }
}

function generateMessage(lead, userName) {
  const name = lead.name || 'your business'
  const niche = lead.niche || 'local'
  const sender = userName || '[your name]'

  return `Hi! I came across ${name} and was really impressed by what you're doing in the ${niche} space.

I'm ${sender}, and I run CoreCraft — we help ${niche} businesses get a professional website that actually brings in customers.

Would you be open to a quick chat about how a better online presence could help ${name}? No pressure at all — happy to share some ideas even if you're not ready yet.

Looking forward to hearing from you!`
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_CLASS[status] || ''}`}>{status}</span>
}

function FollowUpTag({ dateStr }) {
  const info = getFollowUpInfo(dateStr)
  if (!info) return null
  return <span className={`follow-up-tag ${info.type}`}>{info.label}</span>
}

function LeadCard({ lead, onClick }) {
  return (
    <button type="button" className="lead-card" onClick={() => onClick(lead)}>
      <div className="lead-card-header">
        <h3 className="lead-name">{lead.name}</h3>
        <ChevronRight size={18} color="#888" />
      </div>
      <div className="lead-meta">
        <StatusBadge status={lead.status} />
        <span>{lead.platform}</span>
        <FollowUpTag dateStr={lead.nextFollowUp} />
      </div>
      {lead.niche && <p className="lead-niche">{lead.niche}</p>}
    </button>
  )
}

function LeadForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_LEAD, ...initial })

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Name / Business name *</label>
        <input id="name" value={form.name} onChange={set('name')} placeholder="e.g. Karachi Bites" required autoFocus />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="platform">Platform</label>
          <select id="platform" value={form.platform} onChange={set('platform')}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select id="status" value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="niche">Niche / Business type</label>
        <input id="niche" value={form.niche} onChange={set('niche')} placeholder="e.g. restaurant, salon, clinic" />
      </div>

      <div className="form-group">
        <label htmlFor="contact">Contact info</label>
        <input id="contact" value={form.contactInfo} onChange={set('contactInfo')} placeholder="Profile link, phone, or @handle" />
      </div>

      <div className="form-group">
        <label htmlFor="followUp">Next follow-up date</label>
        <input id="followUp" type="date" value={form.nextFollowUp} onChange={set('nextFollowUp')} />
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" value={form.notes} onChange={set('notes')} placeholder="Anything useful to remember..." />
      </div>

      <button type="submit" className="btn-primary">{initial?.id ? 'Save changes' : 'Add lead'}</button>
      <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
    </form>
  )
}

function Sheet({ title, onClose, children }) {
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-header">
          <h2 className="sheet-title">{title}</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [leads, setLeads] = useState(loadLeads)
  const [userName, setUserName] = useState(loadUserName)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPlatform, setFilterPlatform] = useState('All')

  const [sheet, setSheet] = useState(null) // null | 'add' | 'edit' | 'actions' | 'message' | 'settings'
  const [activeLead, setActiveLead] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [copied, setCopied] = useState(false)
  const [settingsName, setSettingsName] = useState(userName)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
  }, [leads])

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]))
    leads.forEach((l) => { counts[l.status] = (counts[l.status] || 0) + 1 })
    return counts
  }, [leads])

  const filteredLeads = useMemo(() => {
    const q = search.toLowerCase().trim()
    return leads
      .filter((l) => filterStatus === 'All' || l.status === filterStatus)
      .filter((l) => filterPlatform === 'All' || l.platform === filterPlatform)
      .filter((l) => {
        if (!q) return true
        return (
          l.name.toLowerCase().includes(q) ||
          l.niche.toLowerCase().includes(q) ||
          l.notes.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const aInfo = getFollowUpInfo(a.nextFollowUp)
        const bInfo = getFollowUpInfo(b.nextFollowUp)
        if (aInfo?.type === 'overdue' && bInfo?.type !== 'overdue') return -1
        if (bInfo?.type === 'overdue' && aInfo?.type !== 'overdue') return 1
        if (aInfo?.type === 'today' && bInfo?.type !== 'today') return -1
        if (bInfo?.type === 'today' && aInfo?.type !== 'today') return 1
        return new Date(b.dateAdded) - new Date(a.dateAdded)
      })
  }, [leads, search, filterStatus, filterPlatform])

  const closeSheet = useCallback(() => {
    setSheet(null)
    setActiveLead(null)
    setCopied(false)
  }, [])

  const openActions = (lead) => {
    setActiveLead(lead)
    setSheet('actions')
  }

  const addLead = (form) => {
    const lead = {
      ...form,
      id: generateId(),
      dateAdded: new Date().toISOString(),
    }
    setLeads((prev) => [lead, ...prev])
    closeSheet()
  }

  const updateLead = (form) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === activeLead.id ? { ...l, ...form } : l))
    )
    closeSheet()
  }

  const deleteLead = () => {
    if (!activeLead) return
    setLeads((prev) => prev.filter((l) => l.id !== activeLead.id))
    closeSheet()
  }

  const changeStatus = (status) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === activeLead.id ? { ...l, status } : l))
    )
    setActiveLead((l) => ({ ...l, status }))
  }

  const openMessage = () => {
    setMessageText(generateMessage(activeLead, userName))
    setSheet('message')
    setCopied(false)
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = messageText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const saveSettings = () => {
    setUserName(settingsName.trim())
    localStorage.setItem(USER_NAME_KEY, settingsName.trim())
    closeSheet()
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1 className="logo">Core<span>Craft</span></h1>
          <button
            type="button"
            className="settings-btn"
            onClick={() => { setSettingsName(userName); setSheet('settings') }}
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
        </div>

        <div className="status-counts">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`status-chip${filterStatus === s ? ' active' : ''}`}
              onClick={() => setFilterStatus(filterStatus === s ? 'All' : s)}
            >
              <span className="status-chip-count">{statusCounts[s]}</span>
              <span className="status-chip-label">{s}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search name, niche, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-row">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
            <option value="All">All platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="lead-list">
        {filteredLeads.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>{leads.length === 0 ? 'No leads yet' : 'No matches'}</p>
            <small>
              {leads.length === 0
                ? 'Tap + to add your first lead'
                : 'Try adjusting your search or filters'}
            </small>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={openActions} />
          ))
        )}
      </div>

      <button
        type="button"
        className="fab"
        onClick={() => setSheet('add')}
        aria-label="Add lead"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {sheet === 'add' && (
        <Sheet title="New lead" onClose={closeSheet}>
          <LeadForm onSave={addLead} onCancel={closeSheet} />
        </Sheet>
      )}

      {sheet === 'edit' && activeLead && (
        <Sheet title="Edit lead" onClose={closeSheet}>
          <LeadForm initial={activeLead} onSave={updateLead} onCancel={closeSheet} />
        </Sheet>
      )}

      {sheet === 'actions' && activeLead && (
        <Sheet title="Lead actions" onClose={closeSheet}>
          <div className="lead-detail">
            <h3 className="lead-detail-name">{activeLead.name}</h3>
            {activeLead.contactInfo && (
              <p className="lead-detail-contact">{activeLead.contactInfo}</p>
            )}
            <div className="lead-meta" style={{ marginTop: 8 }}>
              <StatusBadge status={activeLead.status} />
              <span>{activeLead.platform}</span>
              {activeLead.niche && <span>{activeLead.niche}</span>}
            </div>
            {activeLead.nextFollowUp && (
              <div style={{ marginTop: 8 }}>
                <FollowUpTag dateStr={activeLead.nextFollowUp} />
                <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: 8 }}>
                  {formatDate(activeLead.nextFollowUp)}
                </span>
              </div>
            )}
            {activeLead.notes && (
              <p style={{ fontSize: '0.85rem', color: '#888', marginTop: 8 }}>{activeLead.notes}</p>
            )}
          </div>

          <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: 8 }}>Change status</p>
          <div className="status-picker">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`status-option${activeLead.status === s ? ' selected' : ''}`}
                onClick={() => changeStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="actions-grid">
            <button type="button" className="action-btn" onClick={openMessage}>
              <MessageSquare size={22} />
              Generate message
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => setSheet('edit')}
            >
              <Pencil size={22} />
              Edit lead
            </button>
          </div>

          <button type="button" className="btn-danger" onClick={deleteLead}>
            <Trash2 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Delete lead
          </button>
        </Sheet>
      )}

      {sheet === 'message' && activeLead && (
        <Sheet title="Outreach message" onClose={() => setSheet('actions')}>
          <div className="lead-detail">
            <h3 className="lead-detail-name">{activeLead.name}</h3>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>
              Edit the message below, then copy it to paste into {activeLead.platform}.
            </p>
          </div>

          <textarea
            className="message-textarea"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />

          <button type="button" className="btn-primary" onClick={copyMessage}>
            {copied ? (
              <><Check size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />Copied!</>
            ) : (
              <><Copy size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />Copy to clipboard</>
            )}
          </button>
          <p className="copy-feedback">{copied ? 'Ready to paste in ' + activeLead.platform : ''}</p>
        </Sheet>
      )}

      {sheet === 'settings' && (
        <Sheet title="Settings" onClose={closeSheet}>
          <div className="form-group">
            <label htmlFor="userName">Your name (used in outreach messages)</label>
            <input
              id="userName"
              value={settingsName}
              onChange={(e) => setSettingsName(e.target.value)}
              placeholder="e.g. Ahmed"
            />
          </div>
          <button type="button" className="btn-primary" onClick={saveSettings}>Save</button>
          <p style={{ fontSize: '0.8rem', color: '#888', marginTop: 16, textAlign: 'center' }}>
            {leads.length} lead{leads.length !== 1 ? 's' : ''} stored locally
          </p>
        </Sheet>
      )}
    </div>
  )
}
