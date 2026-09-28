import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useT, villageNamesHi, tehsilNamesHi } from '../i18n'
import { API_BASE } from '../config'

const TIER_META = {
  Critical: { color: '#dc2626', bg: '#fef2f2' },
  Red: { color: '#ea580c', bg: '#fff7ed' },
  Watch: { color: '#d97706', bg: '#fffbeb' },
  Safe: { color: '#16a34a', bg: '#f0fdf4' },
}

const PANEL_WIDTH = 340
const MARGIN = 16

function clampPos(x, y) {
  const isMobile = window.innerWidth <= 768
  if (isMobile) return { x: MARGIN, y: MARGIN }
  const maxX = Math.max(MARGIN, window.innerWidth - PANEL_WIDTH - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - 80)
  return { x: Math.max(MARGIN, Math.min(x, maxX)), y: Math.max(MARGIN, Math.min(y, maxY)) }
}

export default function ExplainPanel({ village, onClose, lang = 'en' }) {
  const t = useT(lang)
  const [history, setHistory] = useState([])
  const [narrative, setNarrative] = useState(null)
  const [loadingNarrative, setLoadingNarrative] = useState(false)
  const [pos, setPos] = useState({ x: null, y: 16 })
  const dragRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 })
  const panelRef = useRef(null)

  useEffect(() => {
    if (!village) return
    axios.get(`${API_BASE}/v1/history/${encodeURIComponent(village.village_name)}`)
      .then((res) => setHistory(res.data.history))
      .catch(() => setHistory([]))
  }, [village?.village_name, village?.hazard_score])

  useEffect(() => {
    setNarrative(null)
  }, [village?.village_name, lang])

  const fetchNarrative = () => {
    setLoadingNarrative(true)
    axios.get(`${API_BASE}/v1/narrative/${encodeURIComponent(village.village_name)}?lang=${lang}`)
      .then((res) => setNarrative(res.data))
      .catch(() => setNarrative({ text: 'Could not generate summary.', source: 'local', cached: false }))
      .finally(() => setLoadingNarrative(false))
  }

  useEffect(() => {
    if (village && pos.x === null) {
      setPos(clampPos(window.innerWidth - PANEL_WIDTH - MARGIN, MARGIN))
    }
  }, [village])

  useEffect(() => {
    const onResize = () => setPos((p) => (p.x === null ? p : clampPos(p.x, p.y)))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onMouseDown = (e) => {
    if (window.innerWidth <= 768) return
    dragRef.current = {
      dragging: true,
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y,
    }
  }

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragRef.current.dragging) return
      const next = clampPos(e.clientX - dragRef.current.offsetX, e.clientY - dragRef.current.offsetY)
      setPos(next)
    }
    const onMouseUp = () => { dragRef.current.dragging = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  if (!village) return null
  const meta = TIER_META[village.tier] || { color: '#64748b', bg: '#f8fafc' }

  const scores = history.map(h => h.hazard_score)
  const maxScore = Math.max(...scores, village.hazard_score, 0.01)
  const minScore = Math.min(...scores, village.hazard_score)

  const displayName = (name) => (lang === 'hi' ? (villageNamesHi[name] || name) : name)

  return (
    <div
      ref={panelRef}
      className="explain-panel"
      style={{ left: pos.x ?? 16, top: pos.y }}
    >
      <div className="explain-header" onMouseDown={onMouseDown}>
        <div>
          <h3>⠿ {displayName(village.village_name)}</h3>
          <div className="explain-sub">
            {lang === 'hi' ? (tehsilNamesHi[village.tehsil] || village.tehsil) : village.tehsil} {t.tehsil}
          </div>
        </div>
        <button onMouseDown={(e) => e.stopPropagation()} onClick={onClose} className="explain-close">✕</button>
      </div>

      <div className="explain-body">
        <div className="explain-stats">
          <div className="stat-box">
            <div className="stat-box-label">{t.score}</div>
            <div className="stat-box-value">{village.hazard_score}</div>
          </div>
          <div className="stat-box" style={{ background: meta.bg }}>
            <div className="stat-box-label">{t.tier}</div>
            <div className="stat-box-value" style={{ color: meta.color }}>{t.tiers[village.tier] || village.tier}</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-label">{t.confidence}</div>
            <div className="stat-box-value">{Math.round(village.confidence * 100)}%</div>
          </div>
        </div>

        <div className="specs-box">
          <div className="section-label">{t.specsTitle}</div>
          <div className="specs-grid">
            <SpecRow label={t.elevation} value={`${village.elevation_m} m`} />
            <SpecRow label={t.population} value={village.population?.toLocaleString()} />
            <SpecRow label={t.riverDistance} value={`${village.distance_to_river_km} km`} />
            <SpecRow label={t.hexCell} value={village.hex_id?.slice(0, 8) + '…'} />
          </div>
        </div>

        {history.length > 1 && (
          <div className="history-box">
            <div className="section-label">{t.scoreHistory} ({history.length} {t.updates})</div>
            <svg width="100%" height="50" viewBox="0 0 300 50" preserveAspectRatio="none">
              <polyline
                fill="none" stroke={meta.color} strokeWidth="2"
                points={history.map((h, i) => {
                  const x = (i / (history.length - 1)) * 300
                  const y = 45 - ((h.hazard_score - minScore) / (maxScore - minScore || 1)) * 40
                  return `${x},${y}`
                }).join(' ')}
              />
            </svg>
          </div>
        )}

        <div className="ai-box">
          {!narrative ? (
            <button onClick={fetchNarrative} disabled={loadingNarrative} className="ai-btn">
              {loadingNarrative ? t.generating : t.getAiSummary}
            </button>
          ) : (
            <div className="ai-result">
              <div className="ai-result-head">
                <span>{narrative.source === 'gemini' ? t.aiSummary : t.localSummary}</span>
                {narrative.cached && <span className="ai-cached">{t.cached}</span>}
              </div>
              <div className="ai-text">{narrative.text}</div>
            </div>
          )}
        </div>

        {village.recommended_site && (
          <div className="relocation-box">
            <div className="relocation-title">{t.relocationTitle}</div>
            <div>{t.site}: <b>{displayName(village.recommended_site)}</b></div>
            <div>{t.distance}: {village.distance_to_site_km} km</div>
            <div>{t.capacityLeft}: <b>{village.site_remaining_capacity}</b> {t.people}</div>
          </div>
        )}

        <div className="section-label" style={{ marginBottom: 8 }}>{t.whyScore}</div>
        {village.breakdown.map((f) => (
          <div key={f.factor} className="factor-row">
            <div className="factor-head">
              <span style={{ textTransform: 'capitalize' }}>{t.factors[f.factor] || f.factor.replace('_', ' ')}</span>
              <span style={{ fontWeight: 700 }}>{(f.contribution * 100).toFixed(1)}%</span>
            </div>
            <div className="factor-bar-track">
              <div className="factor-bar-fill" style={{ width: `${Math.min(f.contribution * 200, 100)}%` }} />
            </div>
            <div className="factor-raw">raw: {f.raw_value}</div>
          </div>
        ))}
      </div>

      <style>{`
        .explain-panel {
          position: fixed;
          width: 340px;
          max-width: calc(100vw - 32px);
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.25);
          z-index: 1000;
          font-family: 'Inter', sans-serif;
          animation: slideIn 0.2s ease-out;
        }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .explain-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 18px 18px 0 18px; cursor: grab; user-select: none;
        }
        .explain-header h3 { margin: 0; font-size: 17px; color: #1e293b; }
        .explain-sub { font-size: 12px; color: #94a3b8; }
        .explain-close {
          cursor: pointer; border: none; background: #f1f5f9; border-radius: 50%;
          width: 26px; height: 26px; font-size: 13px; color: #64748b; flex-shrink: 0;
        }
        .explain-body { padding: 0 18px 18px 18px; }
        .explain-stats { display: flex; gap: 8px; margin: 12px 0; }
        .stat-box { flex: 1; background: #f8fafc; border-radius: 8px; padding: 8px; text-align: center; }
        .stat-box-label { font-size: 10px; color: #94a3b8; font-weight: 600; }
        .stat-box-value { font-size: 15px; font-weight: 800; color: #1e293b; }
        .section-label { font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px; }
        .specs-box { background: #f8fafc; border-radius: 10px; padding: 12px; margin-bottom: 14px; }
        .specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; }
        .history-box { margin-bottom: 14px; }
        .ai-box { margin-bottom: 14px; }
        .ai-btn {
          width: 100%; padding: 9px; border-radius: 8px; border: 1px dashed #cbd5e1;
          background: #f8fafc; color: #475569; font-size: 12.5px; font-weight: 600;
          cursor: pointer; font-family: inherit;
        }
        .ai-result { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px; }
        .ai-result-head { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; font-weight: 700; color: #1d4ed8; }
        .ai-cached { color: #94a3b8; font-weight: 400; }
        .ai-text { font-size: 12.5px; color: #1e3a8a; line-height: 1.5; }
        .relocation-box {
          background: #fff7ed; border: 1px solid #fde68a; border-radius: 10px;
          padding: 12px; margin-bottom: 14px; font-size: 13px; color: #78350f;
        }
        .relocation-title { font-weight: 700; color: #92400e; margin-bottom: 6px; }
        .factor-row { margin-bottom: 10px; }
        .factor-head { display: flex; justify-content: space-between; font-size: 12.5px; color: #475569; }
        .factor-bar-track { background: #f1f5f9; height: 6px; border-radius: 3px; overflow: hidden; }
        .factor-bar-fill { background: linear-gradient(90deg, #f59e0b, #b45309); height: 6px; border-radius: 3px; }
        .factor-raw { font-size: 10.5px; color: #94a3b8; margin-top: 2px; }

        @media (max-width: 768px) {
          .explain-panel {
            left: 16px !important;
            right: 16px;
            top: 16px !important;
            width: auto;
            max-width: none;
            max-height: calc(100vh - 32px);
          }
          .explain-header { cursor: default; }
        }
      `}</style>
    </div>
  )
}

function SpecRow({ label, value }) {
  return (
    <div>
      <div style={{ color: '#94a3b8', fontSize: 10.5 }}>{label}</div>
      <div style={{ fontWeight: 600, color: '#1e293b' }}>{value ?? '—'}</div>
    </div>
  )
}