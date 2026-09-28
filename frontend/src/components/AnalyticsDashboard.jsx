import { useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE } from '../config'

const TIER_COLORS = { Critical: '#dc2626', Red: '#ea580c', Watch: '#d97706', Safe: '#16a34a' }

export default function AnalyticsDashboard({ onClose }) {
  const [data, setData] = useState(null)
  const [fullHistory, setFullHistory] = useState(null)
  const [view, setView] = useState('overview')
  const [filterVillage, setFilterVillage] = useState('')

  useEffect(() => {
    axios.get(`${API_BASE}/v1/analytics`).then((res) => setData(res.data))
  }, [])

  useEffect(() => {
    if (view === 'history' && !fullHistory) {
      axios.get(`${API_BASE}/v1/history-all`).then((res) => setFullHistory(res.data.records))
    }
  }, [view])

  if (!data) return null

  const villageNames = [...new Set((fullHistory || []).map(r => r.village_name))]
  const filteredHistory = filterVillage
    ? (fullHistory || []).filter(r => r.village_name === filterVillage)
    : fullHistory

  return (
    <div className="analytics-overlay">
      <div className="analytics-modal">
        <div className="analytics-head">
          <h2>📊 System Analytics</h2>
          <button onClick={onClose} className="analytics-close">✕</button>
        </div>

        <div className="analytics-tabs">
          <TabButton active={view === 'overview'} onClick={() => setView('overview')}>Overview</TabButton>
          <TabButton active={view === 'history'} onClick={() => setView('history')}>Live History Store</TabButton>
        </div>

        {view === 'overview' && (
          <>
            <div className="analytics-stats">
              <StatCard label="Total Snapshots Logged" value={data.total_snapshots} color="#0369a1" />
              <StatCard label="Events Triggered" value={data.total_events_triggered} color="#b45309" />
            </div>

            <SectionTitle text="🔥 Most Frequently Critical Habitations" />
            {data.most_critical_villages.length === 0 ? (
              <EmptyNote text="No village has reached Critical tier yet." />
            ) : (
              data.most_critical_villages.map((v) => (
                <div key={v.village_name} className="analytics-row">
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{v.village_name}</span>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>{v.critical_count}×</span>
                </div>
              ))
            )}
          </>
        )}

        {view === 'history' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <select
                value={filterVillage}
                onChange={(e) => setFilterVillage(e.target.value)}
                className="analytics-select"
              >
                <option value="">All villages ({(fullHistory || []).length} records)</option>
                {villageNames.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {!fullHistory ? (
              <EmptyNote text="Loading stored records..." />
            ) : filteredHistory.length === 0 ? (
              <EmptyNote text="No records found." />
            ) : (
              filteredHistory.map((r, i) => (
                <div key={i} className="analytics-row" style={{ borderLeft: `3px solid ${TIER_COLORS[r.tier] || '#94a3b8'}` }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{r.village_name}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>#{r.priority_rank} · {r.triggered_by}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: TIER_COLORS[r.tier] || '#1e293b', fontSize: 13 }}>{r.hazard_score}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(r.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      <style>{`
        .analytics-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,0.5);
          display: flex; align-items: center; justify-content: center; z-index: 2000;
          padding: 16px;
        }
        .analytics-modal {
          background: white; border-radius: 18px; padding: clamp(16px, 3vw, 28px);
          width: 100%; max-width: 600px; max-height: 82vh; overflow-y: auto;
          font-family: 'Inter', sans-serif; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .analytics-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .analytics-head h2 { margin: 0; color: #1e293b; font-size: clamp(16px, 2.4vw, 20px); }
        .analytics-close {
          cursor: pointer; border: none; background: #f1f5f9; border-radius: 50%;
          width: 30px; height: 30px; font-size: 14px; flex-shrink: 0;
        }
        .analytics-tabs { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
        .analytics-stats { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 22px; }
        .analytics-select { padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; font-family: inherit; max-width: 100%; }
        .analytics-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 6px; font-size: 13px;
          flex-wrap: wrap; gap: 4px;
        }
      `}</style>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
      fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
      color: active ? '#b45309' : '#94a3b8',
      borderBottom: active ? '2px solid #b45309' : '2px solid transparent',
    }}>{children}</button>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ flex: '1 1 140px', background: '#f8fafc', borderRadius: 12, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function SectionTitle({ text }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '18px 0 8px' }}>{text}</div>
}

function EmptyNote({ text }) {
  return <div style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>{text}</div>
}