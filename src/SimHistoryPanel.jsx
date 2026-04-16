import { useState, useMemo } from 'react'
import { C, font } from './theme.js'

const MONO = "'IBM Plex Mono', 'SF Mono', 'Consolas', monospace"

function StatusBadge({ success, designId }) {
  if (designId === 4 && success) return <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 12 }}>HIT</span>
  if (designId === 4) return <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: 12 }}>MARGINAL</span>
  if (designId === 3) return <span style={{ color: '#f97316', fontWeight: 700, fontSize: 12 }}>SENSOR</span>
  if (designId === 2) return <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 12 }}>PARTIAL</span>
  return <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 12 }}>FAIL</span>
}

function RunDetail({ run, onClose }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(8,12,18,0.98)', zIndex: 5,
      overflow: 'auto', padding: '24px 32px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: C.accent, letterSpacing: 3, fontWeight: 700 }}>{run.id}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 4 }}>{run.designName} — {run.charge}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {new Date(run.timestamp).toLocaleString()} · {run.preset}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '8px 20px', color: '#ccc', fontSize: 14, cursor: 'pointer', fontFamily: font,
        }}>CLOSE</button>
      </div>

      {/* Result summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'UNGUIDED MISS', value: `${run.uMiss} m`, color: '#b45454' },
          { label: 'GUIDED MISS', value: `${run.gMiss} m`, color: run.success ? '#4ade80' : '#fbbf24' },
          { label: 'IMPROVEMENT', value: `${run.improvement}x`, color: C.accent },
          { label: 'FLIGHT TIME', value: `${run.flightTime}s`, color: '#22d3ee' },
          { label: 'STATUS', value: run.success ? 'HIT' : 'MISS', color: run.success ? '#4ade80' : '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, color: '#888', letterSpacing: 2, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: MONO }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Parameters */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, padding: '16px 20px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>FIRE PARAMETERS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, fontSize: 14 }}>
          {[
            { k: 'Charge', v: run.params.charge },
            { k: 'Muzzle Vel', v: `${run.params.mv} m/s` },
            { k: 'QE', v: `${run.params.qe} mils` },
            { k: 'Target', v: `${run.params.target} m` },
            { k: 'Wind', v: `${run.params.wind} m/s @ ${run.params.windDir}°` },
            { k: 'Temperature', v: `${run.params.temp}°C` },
            { k: 'Pressure', v: `${run.params.pressure} hPa` },
            { k: 'Design', v: run.designName },
          ].map(p => (
            <div key={p.k}>
              <span style={{ color: '#888' }}>{p.k}: </span>
              <span style={{ color: '#fff', fontFamily: MONO }}>{p.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shot perturbations */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, padding: '16px 20px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>MONTE CARLO PERTURBATIONS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, fontSize: 14 }}>
          <div><span style={{ color: '#888' }}>ΔMV: </span><span style={{ color: '#fbbf24', fontFamily: MONO }}>{run.perturbations.mvError} m/s</span></div>
          <div><span style={{ color: '#888' }}>ΔWind: </span><span style={{ color: '#fbbf24', fontFamily: MONO }}>{run.perturbations.windGust} m/s</span></div>
          <div><span style={{ color: '#888' }}>Cross: </span><span style={{ color: '#fbbf24', fontFamily: MONO }}>{run.perturbations.crossWind} m/s</span></div>
          <div><span style={{ color: '#888' }}>ΔTemp: </span><span style={{ color: '#fbbf24', fontFamily: MONO }}>{run.perturbations.tempDelta}°C</span></div>
        </div>
      </div>

      {/* Design-specific status */}
      <div style={{
        borderLeft: `3px solid ${run.designId === 4 ? '#4ade80' : run.designId === 1 ? '#ef4444' : '#fbbf24'}`,
        padding: '12px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: '0 10px 10px 0',
        fontSize: 14, color: '#ccc', marginBottom: 24,
      }}>
        <div style={{ fontSize: 10, color: '#888', letterSpacing: 2, marginBottom: 6 }}>GUIDANCE STATUS</div>
        {run.status}
      </div>

      {/* Raw data preview (simulated log lines) */}
      <div style={{
        background: '#0a0e14', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, padding: '16px 20px', fontFamily: MONO, fontSize: 12,
        color: '#888', maxHeight: 300, overflow: 'auto',
      }}>
        <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: 8, letterSpacing: 2 }}>SIMULATION LOG — {run.id}</div>
        <div>[{new Date(run.timestamp).toISOString()}] INIT 6DOF · seed={run.seed} · design={run.designId}</div>
        <div>[T+0.000s] LAUNCH · MV={run.params.mv}+{run.perturbations.mvError} m/s · QE={run.params.qe} mil</div>
        <div>[T+0.050s] SETBACK · 15,400g · bearings {run.designId >= 4 ? 'LOCKED' : 'LOADED'}</div>
        <div>[T+0.200s] MUZZLE EXIT · spin p={(-1130).toFixed(0)} rad/s · Mach={((run.params.mv + parseFloat(run.perturbations.mvError)) / 343).toFixed(2)}</div>
        {run.designId >= 4 && <div style={{ color: '#22d3ee' }}>[T+0.428s] ARM-OUT 200m · bearing ENGAGED · nose brake τ=0.25s</div>}
        {run.designId >= 3 && <div>[T+1.000s] NAV INIT · GPS lock={run.designId >= 3 ? 'YES' : 'NO'} · IMU bias est</div>}
        <div>[T+{(parseFloat(run.flightTime) * 0.3).toFixed(1)}s] ASCENT · alt={Math.round(run.params.target * 0.18)}m · Mach={((run.params.mv * 0.7) / 343).toFixed(2)}</div>
        <div>[T+{(parseFloat(run.flightTime) * 0.5).toFixed(1)}s] APOGEE · alt={Math.round(run.params.target * 0.22)}m · guidance={run.designId >= 2 ? 'ACTIVE' : 'N/A'}</div>
        {run.designId >= 2 && <div style={{ color: C.accent }}>[T+{(parseFloat(run.flightTime) * 0.55).toFixed(1)}s] GUIDANCE · cmd_lat=0.19 m/s² · δ_c=2.0° · i_load=2.8A</div>}
        {run.status.includes('DROPOUT') && <div style={{ color: '#ef4444' }}>[T+{run.status.match(/[\d.]+s/)?.[0] || '15.0s'}] GPS DROPOUT · switching to IMU propagation</div>}
        {run.status.includes('DROPOUT') && <div style={{ color: '#fbbf24' }}>[T+{(parseFloat(run.status.match(/[\d.]+/)?.[0] || 15) + 2).toFixed(1)}s] GPS RECOVERED · re-fusing pseudorange</div>}
        <div>[T+{(parseFloat(run.flightTime) * 0.85).toFixed(1)}s] TERMINAL · Mach=0.85 · alt={Math.round(run.params.target * 0.05)}m</div>
        <div style={{ color: run.success ? '#4ade80' : '#ef4444' }}>[T+{run.flightTime}s] IMPACT · miss={run.gMiss}m · {run.success ? 'WITHIN CEP' : 'OUTSIDE CEP'}</div>
        <div style={{ color: '#4ade80' }}>═══ RUN COMPLETE · {run.id} ═══</div>
      </div>
    </div>
  )
}

export default function SimHistoryPanel({ history, onClose }) {
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return history
    return history.filter(r => r.designId === parseInt(filter))
  }, [history, filter])

  const stats = useMemo(() => {
    const d4 = history.filter(r => r.designId === 4)
    const d4Hits = d4.filter(r => r.success)
    return {
      total: history.length,
      d1: history.filter(r => r.designId === 1).length,
      d2: history.filter(r => r.designId === 2).length,
      d3: history.filter(r => r.designId === 3).length,
      d4: d4.length,
      d4HitRate: d4.length > 0 ? Math.round(d4Hits.length / d4.length * 100) : 0,
      avgMiss: d4.length > 0 ? Math.round(d4.reduce((s, r) => s + r.gMiss, 0) / d4.length) : 0,
    }
  }, [history])

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 30,
      background: 'rgba(8,12,18,0.97)', backdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column', color: '#ccc',
    }}>
      {selected ? (
        <RunDetail run={selected} onClose={() => setSelected(null)} />
      ) : (
        <>
          {/* Header */}
          <div style={{
            padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 14, color: C.accent, letterSpacing: 4, fontWeight: 700 }}>SIMULATION HISTORY</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginTop: 4 }}>
                {stats.total} Runs Logged
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={onClose} style={{
                background: C.accent, border: 'none', borderRadius: 8,
                padding: '10px 24px', color: '#000', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: font, letterSpacing: 2,
              }}>NEW RUN</button>
            </div>
          </div>

          {/* Stats bar */}
          <div style={{
            display: 'flex', gap: 16, padding: '14px 32px',
            borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13,
          }}>
            <span>D1: <span style={{ color: '#ef4444', fontWeight: 700 }}>{stats.d1}</span></span>
            <span>D2: <span style={{ color: '#f59e0b', fontWeight: 700 }}>{stats.d2}</span></span>
            <span>D3: <span style={{ color: '#f97316', fontWeight: 700 }}>{stats.d3}</span></span>
            <span>D4: <span style={{ color: '#4ade80', fontWeight: 700 }}>{stats.d4}</span></span>
            <span style={{ color: '#888' }}>|</span>
            <span>D4 Hit Rate: <span style={{ color: '#4ade80', fontWeight: 700 }}>{stats.d4HitRate}%</span></span>
            <span>D4 Avg Miss: <span style={{ color: C.accent, fontWeight: 700 }}>{stats.avgMiss}m</span></span>

            {/* Filter */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {[
                { v: 'all', label: 'ALL' },
                { v: '1', label: 'D1' },
                { v: '2', label: 'D2' },
                { v: '3', label: 'D3' },
                { v: '4', label: 'D4' },
              ].map(f => (
                <button key={f.v} onClick={() => setFilter(f.v)} style={{
                  background: filter === f.v ? '#333' : 'transparent',
                  border: `1px solid ${filter === f.v ? '#555' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 4, color: filter === f.v ? '#fff' : '#888',
                  padding: '3px 12px', fontSize: 12, cursor: 'pointer', fontFamily: font,
                }}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 32px' }}>
            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '90px 160px 100px 90px 100px 100px 80px 80px 1fr',
              padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontSize: 11, color: '#666', letterSpacing: 1.5, position: 'sticky', top: 0,
              background: 'rgba(8,12,18,0.98)',
            }}>
              <span>RUN ID</span><span>DATE</span><span>DESIGN</span><span>CHARGE</span>
              <span>UNGUIDED</span><span>GUIDED</span><span>IMPR.</span><span>STATUS</span><span>NOTES</span>
            </div>

            {/* Rows — newest first */}
            {[...filtered].reverse().map(run => (
              <div
                key={run.id}
                onClick={() => setSelected(run)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 160px 100px 90px 100px 100px 80px 80px 1fr',
                  padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  fontSize: 13, cursor: 'pointer', fontFamily: MONO,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: C.accent }}>{run.id}</span>
                <span style={{ color: '#888', fontFamily: font, fontSize: 12 }}>
                  {new Date(run.timestamp).toLocaleDateString()} {new Date(run.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{
                  color: run.designId === 4 ? '#4ade80' : run.designId === 3 ? '#f97316' : run.designId === 2 ? '#f59e0b' : '#ef4444',
                }}>{run.designName}</span>
                <span>{run.charge}</span>
                <span style={{ color: '#b45454' }}>{run.uMiss} m</span>
                <span style={{ color: run.success ? '#4ade80' : '#fbbf24' }}>{run.gMiss} m</span>
                <span style={{ color: '#fff' }}>{run.improvement}x</span>
                <span><StatusBadge success={run.success} designId={run.designId} /></span>
                <span style={{ color: '#666', fontSize: 11, fontFamily: font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
