import { useEffect, useState } from 'react'
import axios from 'axios'
import MapView from './components/MapView'
import { useT } from './i18n'
import PriorityTable from './components/PriorityTable'
import ExplainPanel from './components/ExplainPanel'
import AnalyticsDashboard from './components/AnalyticsDashboard'

const TIER_META = {
  Critical: { color: '#dc2626', bg: '#fef2f2' },
  Red: { color: '#ea580c', bg: '#fff7ed' },
  Watch: { color: '#d97706', bg: '#fffbeb' },
  Safe: { color: '#16a34a', bg: '#f0fdf4' },
}

export default function App() {
  const [villages, setVillages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [prevRanks, setPrevRanks] = useState({})
  const [simVillage, setSimVillage] = useState('')
  const [pulse, setPulse] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [lang, setLang] = useState('en')
  const t = useT(lang)

  const fetchData = () => {
    setLoading(true)
    axios.get('http://127.0.0.1:8000/v1/priority-list')
      .then((res) => setVillages(res.data.results))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  const simulateEvent = () => {
    if (!simVillage) return
    const ranksBeforeEvent = {}
    villages.forEach(v => { ranksBeforeEvent[v.village_name] = v.priority_rank })
    setPrevRanks(ranksBeforeEvent)

    axios.post('http://127.0.0.1:8000/v1/simulate-event', {
      village_name: simVillage,
      rainfall_intensity: 3200,
      past_incidents: 9,
    }).then((res) => {
      setVillages(res.data.results)
      setPulse(true)
      setTimeout(() => setPulse(false), 1500)
    })
  }

  useEffect(() => { fetchData() }, [])

  const tierCounts = villages.reduce((acc, v) => {
    acc[v.tier] = (acc[v.tier] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      fontFamily: "'Inter', sans-serif", background: '#f8fafc',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 28px',
        background: 'linear-gradient(120deg, #7c2d12 0%, #9a3412 100%)',
        color: 'white', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', zIndex: 10,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>
            {t.title}
          </h2>
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>
            {t.subtitle}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} style={btnStyle('rgba(255,255,255,0.2)')}>
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>
          <select
            value={simVillage}
            onChange={(e) => setSimVillage(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 8, border: 'none',
              fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <option value="">{t.simulateSelect}</option>
            {villages.map(v => <option key={v.village_name} value={v.village_name}>{v.village_name}</option>)}
          </select>
          <button onClick={simulateEvent} style={btnStyle('#f59e0b')}>{t.triggerEvent}</button>
          <button onClick={fetchData} style={btnStyle('rgba(255,255,255,0.15)')}>{t.reset}</button>
          <button onClick={() => setShowAnalytics(true)} style={btnStyle('#0369a1')}>{t.analytics}</button>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'flex', gap: 12, padding: '14px 28px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        {Object.entries(TIER_META).map(([tier, meta]) => (
          <div key={tier} style={{
            flex: 1, background: meta.bg, borderRadius: 10, padding: '10px 16px',
            borderLeft: `4px solid ${meta.color}`, transition: 'transform 0.2s',
          }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.tiers[tier]}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: meta.color }}>{tierCounts[tier] || 0}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ flex: 2, position: 'relative' }}>
          {loading && (
            <div style={loaderOverlay}>
              <div style={spinner}></div>
            </div>
          )}
          {!loading && <MapView villages={villages} onSelect={setSelected} pulse={pulse} />}
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid #e2e8f0', background: 'white', overflow: 'hidden' }}>
          <PriorityTable villages={villages} onSelect={setSelected} prevRanks={prevRanks} selectedName={selected?.village_name} lang={lang} />
        </div>
        <ExplainPanel village={selected} onClose={() => setSelected(null)} lang={lang} />
        {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select:hover, button:hover { filter: brightness(1.08); }
      `}</style>
    </div>
  )
}

function btnStyle(bg) {
  return {
    padding: '8px 16px', borderRadius: 8, border: 'none', background: bg,
    color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'filter 0.15s',
  }
}

const loaderOverlay = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: '#f1f5f9', zIndex: 5,
}

const spinner = {
  width: 40, height: 40, border: '4px solid #e2e8f0',
  borderTopColor: '#b45309', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
}