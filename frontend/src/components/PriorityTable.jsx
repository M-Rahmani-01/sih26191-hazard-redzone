import { useT, villageNamesHi } from '../i18n'

const TIER_META = {
  Critical: { color: '#dc2626', bg: '#fef2f2' },
  Red: { color: '#ea580c', bg: '#fff7ed' },
  Watch: { color: '#d97706', bg: '#fffbeb' },
  Safe: { color: '#16a34a', bg: '#f0fdf4' },
}

export default function PriorityTable({ villages, onSelect, prevRanks = {}, selectedName, lang = 'en' }) {
  const t = useT(lang)

  const displayName = (name) => (lang === 'hi' ? (villageNamesHi[name] || name) : name)

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '10px 10px 10px 0' }}>
      {villages.map((v) => {
        const meta = TIER_META[v.tier] || { color: '#64748b', bg: '#f8fafc' }
        const prev = prevRanks[v.village_name]
        let moveIndicator = null
        if (prev && prev !== v.priority_rank) {
          moveIndicator = prev > v.priority_rank
            ? <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 700 }}> ▲ {t.was} #{prev}</span>
            : <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 700 }}> ▼ {t.was} #{prev}</span>
        }
        const isSelected = selectedName === v.village_name
        return (
          <div
            key={v.village_name}
            onClick={() => onSelect(v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              margin: '6px 10px', borderRadius: 12, cursor: 'pointer',
              background: isSelected ? '#fff7ed' : 'white',
              border: `1px solid ${isSelected ? '#fdba74' : '#e2e8f0'}`,
              boxShadow: isSelected ? '0 2px 8px rgba(180,83,9,0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: meta.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 13, color: meta.color, flexShrink: 0,
            }}>
              {v.priority_rank}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                {displayName(v.village_name)}{moveIndicator}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {t.score} {v.hazard_score} {v.recommended_site && `· ${t.relocateTo} ${displayName(v.recommended_site)}`}
              </div>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
              background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
            }}>
              {t.tiers[v.tier] || v.tier}
            </div>
          </div>
        )
      })}
    </div>
  )
}