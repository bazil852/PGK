import { useState, useEffect, useCallback } from 'react'

// Esforge palette — dark, muted, professional
const C = {
  bg: 'rgba(12, 13, 16, 0.9)',
  bgSolid: '#0c0d10',
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.1)',
  text: '#c5c9d1',
  textDim: '#6b7280',
  textBright: '#e5e7eb',
  accent: '#94a3b8',       // slate blue — subtle, not neon
  success: '#4ade80',      // muted green
  successDim: '#166534',
  fail: '#f87171',         // muted red
  failDim: '#7f1d1d',
  unguided: '#ef4444',
  neutral: '#64748b',
}

const font = "'Space Grotesk', 'Inter', system-ui, sans-serif"
const fontMono = "'Inter', system-ui, sans-serif"

const base = {
  panel: {
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: '14px 18px',
    backdropFilter: 'blur(12px)',
    pointerEvents: 'auto',
  },
  row: {
    display: 'flex', justifyContent: 'space-between',
    marginBottom: 4, fontSize: 12, fontFamily: fontMono,
  },
  heading: {
    fontSize: 10, color: C.textDim, fontWeight: 600,
    letterSpacing: '1.5px', textTransform: 'uppercase',
    marginBottom: 8, paddingBottom: 6,
    borderBottom: `1px solid ${C.border}`, fontFamily: font,
  },
  btn: {
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.border}`,
    borderRadius: 4, color: C.text, padding: '5px 12px',
    fontSize: 11, cursor: 'pointer', fontFamily: fontMono,
    transition: 'all 0.15s',
  },
  btnActive: {
    background: 'rgba(255,255,255,0.1)',
    border: `1px solid ${C.borderLight}`,
    color: C.textBright,
  },
}

export default function HUD({ data }) {
  const [state, setState] = useState({
    playback: 0, playing: true, speed: 1,
    showUnguided: true, showGuided: true, showHits: true, showMisses: true,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.__pgkDemo) {
        setState({
          playback: window.__pgkDemo.playback,
          playing: window.__pgkDemo.playing,
          speed: window.__pgkDemo.speed,
          showUnguided: window.__pgkDemo.showUnguided,
          showGuided: window.__pgkDemo.showGuided,
          showHits: window.__pgkDemo.showHits,
          showMisses: window.__pgkDemo.showMisses,
        })
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const act = (fn) => () => { if (window.__pgkDemo) fn(window.__pgkDemo) }

  const maxT = Math.max(
    data.unguided.trajectory.t[data.unguided.trajectory.t.length - 1],
    ...data.guided_runs.map(r => r.trajectory.t[r.trajectory.t.length - 1])
  )
  const currentT = (state.playback * maxT).toFixed(1)

  const nHits = data.guided_runs.filter(r => r.success).length
  const nMiss = data.guided_runs.length - nHits
  const hitRate = ((nHits / data.guided_runs.length) * 100).toFixed(0)

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none', fontFamily: fontMono,
    }}>
      {/* ── Title ── */}
      <div style={{ position: 'absolute', top: 20, left: 24, pointerEvents: 'auto' }}>
        <p style={{
          fontSize: 11, fontWeight: 600, color: C.textDim,
          letterSpacing: '2.5px', textTransform: 'uppercase',
          fontFamily: font, margin: 0,
        }}>
          Esforge Simulation Network
        </p>
        <p style={{
          fontSize: 20, fontWeight: 600, color: C.textBright,
          fontFamily: font, margin: '4px 0 0', letterSpacing: '0.5px',
        }}>
          PGK Trajectory Analysis
        </p>
        <p style={{
          fontSize: 11, color: C.textDim, marginTop: 2, fontFamily: fontMono,
        }}>
          M107 155mm — Precision Guidance Kit
        </p>
      </div>

      {/* ── Stats Panel ── */}
      <div style={{
        ...base.panel, position: 'absolute', top: 20, right: 24, minWidth: 230,
      }}>
        <div style={base.heading}>Fire Mission</div>
        <div style={base.row}>
          <span style={{ color: C.textDim }}>Charge</span>
          <span style={{ color: C.textBright }}>{data.charge}</span>
        </div>
        <div style={base.row}>
          <span style={{ color: C.textDim }}>Muzzle Vel</span>
          <span style={{ color: C.textBright }}>{data.muzzle_velocity} m/s</span>
        </div>
        <div style={base.row}>
          <span style={{ color: C.textDim }}>QE</span>
          <span style={{ color: C.textBright }}>{data.qe_mils} mils</span>
        </div>
        <div style={base.row}>
          <span style={{ color: C.textDim }}>Time</span>
          <span style={{ color: C.accent }}>{currentT}s / {maxT.toFixed(1)}s</span>
        </div>

        <div style={{ ...base.heading, marginTop: 14 }}>Results</div>
        <div style={base.row}>
          <span style={{ color: C.textDim }}>Runs</span>
          <span style={{ color: C.textBright }}>{data.guided_runs.length}</span>
        </div>
        <div style={base.row}>
          <span style={{ color: C.textDim }}>Hits (&lt;50m)</span>
          <span style={{ color: C.success, fontWeight: 600 }}>{nHits}</span>
        </div>
        <div style={base.row}>
          <span style={{ color: C.textDim }}>Misses (&gt;50m)</span>
          <span style={{ color: C.fail }}>{nMiss}</span>
        </div>
        <div style={{ ...base.row, marginTop: 4, paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
          <span style={{ color: C.textDim }}>Hit Rate</span>
          <span style={{
            color: parseInt(hitRate) >= 50 ? C.success : C.fail,
            fontWeight: 700, fontSize: 14,
          }}>
            {hitRate}%
          </span>
        </div>

        <div style={{ ...base.heading, marginTop: 14 }}>Per-Run</div>
        {data.guided_runs.map(run => (
          <div key={run.label} style={{ ...base.row, marginBottom: 2 }}>
            <span style={{ color: C.textDim, fontSize: 11 }}>{run.label}</span>
            <span style={{
              fontSize: 11, fontWeight: 500,
              color: run.success ? C.success : C.fail,
            }}>
              {run.miss}m {run.success ? 'HIT' : 'MISS'}
            </span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ ...base.panel, position: 'absolute', bottom: 80, right: 24 }}>
        <div style={base.heading}>Filters</div>
        {[
          { label: 'Unguided', color: C.unguided, key: 'showUnguided', setter: 'setShowUnguided' },
          { label: 'Hits (<50m)', color: C.success, key: 'showHits', setter: 'setShowHits' },
          { label: 'Misses (>50m)', color: C.fail, key: 'showMisses', setter: 'setShowMisses' },
        ].map(item => (
          <div
            key={item.key}
            onClick={act(d => d[item.setter](p => !p))}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 4, fontSize: 11, cursor: 'pointer',
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: 2,
              background: state[item.key] ? item.color : 'transparent',
              border: `1.5px solid ${state[item.key] ? item.color : C.textDim}`,
              transition: 'all 0.15s',
            }} />
            <span style={{
              color: state[item.key] ? C.text : C.textDim,
              transition: 'color 0.15s',
            }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Playback ── */}
      <div style={{
        ...base.panel, position: 'absolute', bottom: 24, left: '50%',
        transform: 'translateX(-50%)',
        borderRadius: 8, padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button style={base.btn} onClick={act(d => d.setPlaying(p => !p))}>
          {state.playing ? 'Pause' : 'Play'}
        </button>
        <input
          type="range" min={0} max={1} step={0.001}
          value={state.playback}
          onChange={e => {
            if (window.__pgkDemo) {
              window.__pgkDemo.setPlayback(parseFloat(e.target.value))
              window.__pgkDemo.setPlaying(false)
            }
          }}
          style={{ width: 180, accentColor: C.accent, height: 2 }}
        />
        <span style={{ fontSize: 10, color: C.textDim, minWidth: 28 }}>{currentT}s</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {[0.25, 0.5, 1, 2, 4].map(spd => (
            <button
              key={spd}
              style={{
                ...base.btn, padding: '3px 7px', fontSize: 10,
                ...(Math.abs(state.speed - spd) < 0.01 ? base.btnActive : {}),
              }}
              onClick={act(d => d.setSpeed(spd))}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
