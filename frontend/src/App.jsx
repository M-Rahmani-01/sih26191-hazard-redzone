import { useEffect, useState } from 'react'
import axios from 'axios'
import MapView from './components/MapView'
import { useT } from './i18n'
import PriorityTable from './components/PriorityTable'
import ExplainPanel from './components/ExplainPanel'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import { API_BASE } from './config'

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
    axios.get(`${API_BASE}/v1/priority-list`)
      .then((res) => setVillages(res.data.results))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  const simulateEvent = () => {
    if (!simVillage) return
    const ranksBeforeEvent = {}
    villages.forEach(v => { ranksBeforeEvent[v.village_name] = v.priority_rank })
    setPrevRanks(ranksBeforeEvent)

    axios.post(`${API_BASE}/v1/simulate-event`, {
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
    <div className="app-root">
      <div className="app-header">
        <div className="header-title">
          <h2>{t.title}</h2>
          <div className="header-subtitle">{t.subtitle}</div>
        </div>
        <div className="header-controls">
          <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} className="btn btn-ghost">
            {lang === 'en' ? 'हिं' : 'EN'}
          </button>
          <select
            value={simVillage}
            onChange={(e) => setSimVillage(e.target.value)}
            className="village-select"
          >
            <option value="">{t.simulateSelect}</option>
            {villages.map(v => <option key={v.village_name} value={v.village_name}>{v.village_name}</option>)}
          </select>
          <button onClick={simulateEvent} className="btn btn-amber">{t.triggerEvent}</button>
          <button onClick={fetchData} className="btn btn-ghost">{t.reset}</button>
          <button onClick={() => setShowAnalytics(true)} className="btn btn-blue">{t.analytics}</button>
        </div>
      </div>

      <div className="stat-strip">
        {Object.entries(TIER_META).map(([tier, meta]) => (
          <div key={tier} className="stat-card" style={{ background: meta.bg, borderLeftColor: meta.color }}>
            <div className="stat-label">{t.tiers[tier]}</div>
            <div className="stat-value" style={{ color: meta.color }}>{tierCounts[tier] || 0}</div>
          </div>
        ))}
      </div>

      <div className="main-content">
        <div className="map-pane">
          {loading && (
            <div className="loader-overlay">
              <div className="spinner"></div>
            </div>
          )}
          {!loading && <MapView villages={villages} onSelect={setSelected} pulse={pulse} />}
        </div>
        <div className="list-pane">
          <PriorityTable villages={villages} onSelect={setSelected} prevRanks={prevRanks} selectedName={selected?.village_name} lang={lang} />
        </div>
        <ExplainPanel village={selected} onClose={() => setSelected(null)} lang={lang} />
        {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { height: 100%; margin: 0; overflow-x: hidden; }

        .app-root {
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: 'Inter', sans-serif;
          background: #f8fafc;
          overflow-x: hidden;
        }

        .app-header {
          padding: clamp(10px, 2vw, 16px) clamp(14px, 3vw, 28px);
          background: linear-gradient(120deg, #7c2d12 0%, #9a3412 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
          z-index: 10;
        }
        .header-title h2 {
          margin: 0;
          font-size: clamp(15px, 2.2vw, 20px);
          font-weight: 800;
          letter-spacing: -0.3px;
        }
        .header-subtitle {
          font-size: clamp(10px, 1.4vw, 12.5px);
          opacity: 0.85;
          margin-top: 2px;
        }
        .header-controls {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .btn {
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          color: white;
          font-weight: 600;
          font-size: 12.5px;
          cursor: pointer;
          font-family: inherit;
          transition: filter 0.15s;
          white-space: nowrap;
        }
        .btn:hover { filter: brightness(1.08); }
        .btn-ghost { background: rgba(255,255,255,0.18); }
        .btn-amber { background: #f59e0b; }
        .btn-blue { background: #0369a1; }
        .village-select {
          padding: 8px 10px;
          border-radius: 8px;
          border: none;
          font-size: 12.5px;
          font-family: inherit;
          cursor: pointer;
          max-width: 46vw;
        }

        .stat-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: clamp(8px, 1.6vw, 14px) clamp(14px, 3vw, 28px);
          background: white;
          border-bottom: 1px solid #e2e8f0;
        }
        .stat-card {
          flex: 1 1 120px;
          border-radius: 10px;
          padding: 8px 14px;
          border-left: 4px solid;
        }
        .stat-label {
          font-size: 10.5px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stat-value { font-size: clamp(17px, 2.4vw, 22px); font-weight: 800; }

        .main-content {
          display: flex;
          flex: 1;
          position: relative;
          overflow: hidden;
          min-height: 0;
        }
        .map-pane { flex: 2; position: relative; min-width: 0; }
        .list-pane {
          flex: 1;
          min-width: 260px;
          max-width: 420px;
          border-left: 1px solid #e2e8f0;
          background: white;
          overflow-y: auto;
        }

        .loader-overlay {
          position: absolute; inset: 0; display: flex; align-items: center;
          justify-content: center; background: #f1f5f9; z-index: 5;
        }
        .spinner {
          width: 40px; height: 40px; border: 4px solid #e2e8f0;
          border-top-color: #b45309; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 860px) {
          .main-content { flex-direction: column; overflow-y: auto; }
          .map-pane { flex: none; height: 48vh; min-height: 260px; }
          .list-pane {
            flex: none; max-width: none; min-width: 0;
            border-left: none; border-top: 1px solid #e2e8f0;
          }
        }
        @media (max-width: 480px) {
          .header-title h2 { width: 100%; }
          .village-select { max-width: 100%; flex: 1 1 100%; }
          .header-controls { width: 100%; }
        }
      `}</style>
    </div>
  )
}