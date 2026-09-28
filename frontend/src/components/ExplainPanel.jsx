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
  }, [village?.village_name])

  const fetchNarrative = () => {
    setLoadingNarrative(true)
      axios.get(`${API_BASE}/v1/narrative/${encodeURIComponent(village.village_name)}`)
      .then((res) => setNarrative(res.data))
      .catch(() => setNarrative({ text: 'Could not generate summary.', source: 'local', cached: false }))
      .finally(() => setLoadingNarrative(false))
  }

  useEffect(() => {
    if (village && pos.x === null) {
      setPos({ x: window.innerWidth - 360, y: 16 })
    }
  }, [village])

  const onMouseDown = (e) => {
    dragRef.current = {
      dragging: true,
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y,
    }
  }

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragRef.current.dragging) return
      const panelWidth = 340
      const headerHeight = 50
      const maxX = window.innerWidth - panelWidth
      const maxY = window.innerHeight - headerHeight
      let newX = e.clientX - dragRef.current.offsetX
      let newY = e.clientY - dragRef.current.offsetY
      newX = Math.max(0, Math.min(newX, maxX))
      newY = Math.max(0, Math.min(newY, maxY))
      setPos({ x: newX, y: newY })
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

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute', left: pos.x ?? 16, top: pos.y, width: 340,
        maxHeight: 'calc(100% - 32px)', overflowY: 'auto',
        background: 'white', border: '1px solid #e2e8f0', borderRadius: 16,
        boxShadow: '0 12px 32px rgba(0,0,0,0.25)', zIndex: 1000,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        onMouseDown={onMouseDown}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '18px 18px 0 18px', cursor: 'grab', userSelect: 'none',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 17, color: '#1e293b' }}>
            ⠿ {lang === 'hi' ? (villageNamesHi[village.village_name] || village.village_name) : village.village_name}
          </h3>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {lang === 'hi' ? (tehsilNamesHi[village.tehsil] || village.tehsil) : village.tehsil} {t.tehsil}
          </div>
        </div>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
          style={{
            cursor: 'pointer', border: 'none', background: '#f1f5f9', borderRadius: '50%',
            width: 26, height: 26, fontSize: 13, color: '#64748b',
          }}
        >✕</button>
      </div>

      <div style={{ padding: '0 18px 18px 18px' }}>
        <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{t.score}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{village.hazard_score}</div>
          </div>
          <div style={{ flex: 1, background: meta.bg, borderRadius: 8, padding: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{t.tier}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: meta.color }}>{t.tiers[village.tier] || village.tier}</div>
          </div>
          <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{t.confidence}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{Math.round(village.confidence * 100)}%</div>
          </div>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>{t.specsTitle}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
            <SpecRow label={t.elevation} value={`${village.elevation_m} m`} />
            <SpecRow label={t.population} value={village.population?.toLocaleString()} />
            <SpecRow label={t.riverDistance} value={`${village.distance_to_river_km} km`} />
            <SpecRow label={t.hexCell} value={village.hex_id?.slice(0, 8) + '…'} />
          </div>
        </div>

        {history.length > 1 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>{t.scoreHistory} ({history.length} {t.updates})</div>
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

        <div style={{ marginBottom: 14 }}>
          {!narrative ? (
            <button
              onClick={fetchNarrative}
              disabled={loadingNarrative}
              style={{
                width: '100%', padding: '9px', borderRadius: 8, border: '1px dashed #cbd5e1',
                background: '#f8fafc', color: '#475569', fontSize: 12.5, fontWeight: 600,
                cursor: loadingNarrative ? 'default' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {loadingNarrative ? t.generating : t.getAiSummary}
            </button>
          ) : (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>
                  {narrative.source === 'gemini' ? t.aiSummary : t.localSummary}
                </span>
                {narrative.cached && <span style={{ fontSize: 10, color: '#94a3b8' }}>{t.cached}</span>}
              </div>
              <div style={{ fontSize: 12.5, color: '#1e3a8a', lineHeight: 1.5 }}>{narrative.text}</div>
            </div>
          )}
        </div>

        {village.recommended_site && (
          <div style={{
            background: '#fff7ed', border: '1px solid #fde68a', borderRadius: 10,
            padding: 12, marginBottom: 14, fontSize: 13,
          }}>
            <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 6 }}>{t.relocationTitle}</div>
                        <div style={{ color: '#78350f' }}>{t.site}: <b>{lang === 'hi' ? (villageNamesHi[village.recommended_site] || village.recommended_site) : village.recommended_site}</b></div>
            <div style={{ color: '#78350f' }}>{t.distance}: {village.distance_to_site_km} km</div>
            <div style={{ color: '#78350f' }}>{t.capacityLeft}: <b>{village.site_remaining_capacity}</b> {t.people}</div>
          </div>
        )}

        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>{t.whyScore}</div>
        {village.breakdown.map((f) => (
          <div key={f.factor} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#475569' }}>
              <span style={{ textTransform: 'capitalize' }}>{t.factors[f.factor] || f.factor.replace('_', ' ')}</span>
              <span style={{ fontWeight: 700 }}>{(f.contribution * 100).toFixed(1)}%</span>
            </div>
            <div style={{ background: '#f1f5f9', height: 6, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(f.contribution * 200, 100)}%`,
                background: 'linear-gradient(90deg, #f59e0b, #b45309)',
                height: 6, borderRadius: 3, transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>raw: {f.raw_value}</div>
          </div>
        ))}
      </div>
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