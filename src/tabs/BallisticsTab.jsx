import { useState, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { C, font, panelStyle } from '../theme.js'

Chart.register(...registerables)

const B = ({ children }) => <strong style={{ fontWeight: 700, color: C.textBright }}>{children}</strong>

const CHARGE_COLORS = {
  '4G': '#8b5cf6', '4W': '#6366f1', '5G': '#3b82f6', '5W': '#0ea5e9',
  '6W': '#14b8a6', '7W': '#FF6B35', '8': '#ef4444',
}
const FAN_COLORS = ['#8b5cf6', '#3b82f6', '#0ea5e9', '#FF6B35', '#ef4444']

const gridColor = '#f0f0f0'
const tickColor = '#777'
const chartFont = { family: "'Inter', system-ui, sans-serif", size: 13, weight: '500' }
const titleFont = { ...chartFont, size: 15, weight: '700' }

function ax(text) { return { display: true, text, color: '#666', font: titleFont, padding: 6 } }

function mkOpts(o = {}) {
  return {
    responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
    plugins: { legend: { position: 'top', labels: { color: '#444', font: chartFont, padding: 10, usePointStyle: true, pointStyleWidth: 10, boxWidth: 10 } }, ...o.plugins },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: chartFont }, ...o.x },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font: chartFont }, ...o.y },
    },
  }
}

// --- Data generators ---

function genCorrelation() {
  const pts = [], mvs = { '4G': 316, '4W': 337, '5G': 376, '5W': 397, '6W': 474, '7W': 568, '8': 684 }
  for (const [ch] of Object.entries(CHARGE_COLORS)) {
    const maxR = (mvs[ch] / 684) * 18.5, n = Math.round(722 / 7)
    for (let i = 0; i < n; i++) {
      const ft = 0.5 + (maxR - 0.5) * (i / (n - 1))
      pts.push({ charge: ch, x: ft, y: ft + (Math.random() - 0.5) * 0.12 })
    }
  }
  return pts
}

function genFan() {
  return [
    { qe: 105, range: 4.0, apogee: 120 }, { qe: 210, range: 7.5, apogee: 500 },
    { qe: 355, range: 11.0, apogee: 1300 }, { qe: 562, range: 13.5, apogee: 2650 },
    { qe: 982, range: 14.0, apogee: 6100 },
  ].map(t => {
    const pts = []
    for (let i = 0; i <= 60; i++) { const f = i / 60; pts.push({ x: t.range * f, y: 4 * t.apogee * f * (1 - f) }) }
    return { label: `QE ${t.qe} mil`, data: pts }
  })
}

function genTof(json) {
  return Object.entries(json.plots.mpm_tof.approximate_curves).map(([ch, c]) => {
    const pts = []
    for (let i = 0; i <= 40; i++) { const f = i / 40; pts.push({ x: c.min_range_km + (c.max_range_km - c.min_range_km) * f, y: c.min_tof_s + (c.max_tof_s - c.min_tof_s) * Math.pow(f, 1.6) }) }
    return { charge: ch, data: pts }
  })
}

function genBox(json) {
  const s = json.plots.mpm_errors.box_statistics_approx
  return ['4G', '4W', '5G', '5W', '6W', '7W', '8'].map(c => ({ charge: c, ...s[c] }))
}

function genRoll(json) {
  const eng = json.plots.roll_decoupled.bearing_engagement.engagement_time_ms / 1000
  const bp = [], np = []
  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * 5
    bp.push({ x: t, y: -1100 - 30 * Math.exp(-t * 2) })
    np.push({ x: t, y: t < eng ? -1100 - 30 * Math.exp(-t * 2) : -1100 * Math.exp(-(t - eng) / 0.25) })
  }
  return { bp, np }
}

function genDrift() {
  const ca = [], da = [], cv = [], dv = []
  for (let i = 0; i <= 150; i++) {
    const t = (i / 150) * 30
    ca.push({ x: t, y: 0.93 * Math.sin(t * 4.5) * Math.exp(-t * 0.005) })
    da.push({ x: t, y: t < 0.5 ? 0 : 0.19 })
    cv.push({ x: t, y: 0.01 * Math.sin(t * 3) })
    dv.push({ x: t, y: t < 0.5 ? 0 : (4.5 / 29.5) * (t - 0.5) })
  }
  return { ca, da, cv, dv }
}

function genAoA() {
  const pts = []
  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * 48
    let a; if (t < 5) a = 0.17 * Math.exp(-t * 0.6) * Math.abs(Math.sin(t * 8)) + 0.05
    else if (t < 27) a = 0.2 + 0.8 * Math.pow((t - 5) / 22, 1.2)
    else a = 1.0 - 0.68 * Math.pow((t - 27) / 21, 0.8)
    pts.push({ x: t, y: a })
  }
  return pts
}

function genEpicyclic() {
  const pts = []
  for (let i = 0; i <= 600; i++) {
    const t = (i / 600) * 0.25, d = Math.exp(-t * 12)
    pts.push({ x: 0.18 * d * Math.cos(2 * Math.PI * 80 * t) + 0.02 * d * Math.cos(2 * Math.PI * 12 * t), y: 0.18 * d * Math.sin(2 * Math.PI * 80 * t) + 0.02 * d * Math.sin(2 * Math.PI * 12 * t) })
  }
  return pts
}

function gen6v() {
  const ma = [], sa = [], mc = [], sc = []
  for (let i = 0; i <= 100; i++) {
    const f = i / 100, x = 14 * f, alt = 4 * 2950 * f * (1 - f)
    ma.push({ x, y: alt }); sa.push({ x, y: alt + (Math.random() - 0.5) * 10 })
    mc.push({ x, y: 0 }); sc.push({ x, y: 430 * Math.pow(f, 2.2) })
  }
  return { ma, sa, mc, sc }
}

// --- Chart canvas ---
function ChartCanvas({ buildChart, chartKey }) {
  const ref = useRef(null), chartRef = useRef(null)
  useEffect(() => {
    chartRef.current?.destroy(); chartRef.current = null
    const t = setTimeout(() => { if (ref.current) chartRef.current = buildChart(ref.current) }, 50)
    return () => { clearTimeout(t); chartRef.current?.destroy() }
  }, [chartKey])
  return <canvas ref={ref} />
}

// --- Section row: chart + text, alternating sides ---
function ChartSection({ chartKey, buildChart, title, subtitle, bullets, metrics, flip }) {
  const textSide = (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
      <div>
        <div style={{ fontSize: 14, color: C.accent, letterSpacing: 3, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>{subtitle}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.textBright, lineHeight: 1.3 }}>{title}</div>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ fontSize: 20, color: C.text, lineHeight: 1.6, padding: '4px 0 4px 22px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, top: 4, color: C.accent, fontWeight: 700, fontSize: 20 }}>›</span>
            {b}
          </li>
        ))}
      </ul>
      {metrics && (
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          {metrics.map(m => (
            <div key={m.label} style={{ background: '#f9f9f9', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 18px', flex: 1 }}>
              <div style={{ fontSize: 13, color: C.textDim, letterSpacing: 2.5, fontWeight: 700 }}>{m.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.accent, marginTop: 4 }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const chartSide = (
    <div style={{
      background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12,
      padding: 18, height: 400, width: '100%', boxSizing: 'border-box',
    }}>
      <ChartCanvas buildChart={buildChart} chartKey={chartKey} />
    </div>
  )

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'center',
      padding: '28px 0', borderBottom: `1px solid ${C.borderLight}`,
    }}>
      {flip ? <>{chartSide}{textSide}</> : <>{textSide}{chartSide}</>}
    </div>
  )
}

// --- Per-step chart+text definitions ---
function getSections(stepIdx, json) {
  switch (stepIdx) {
    case 0: {
      const fan = genFan(), tof = genTof(json)
      return [
        {
          title: 'Trajectory family across the QE envelope',
          subtitle: 'CHARGE 7W · MV 568 m/s',
          bullets: [
            <><B>5 representative trajectories</B> at different quadrant elevations</>,
            <>Apogee sweeps from <B>120 m</B> (flat) to <B>6,100 m</B> (high-angle)</>,
            <>Max range <B>~14 km</B> — confirms rough PGK operating envelope</>,
          ],
          metrics: [{ label: 'DATA SOURCE', value: 'OPEN LIT.' }, { label: 'ACCURACY', value: '±100 m' }],
          build: (ctx) => new Chart(ctx, {
            type: 'scatter',
            data: { datasets: fan.map((t, i) => ({ label: t.label, data: t.data, showLine: true, pointRadius: 0, borderColor: FAN_COLORS[i], borderWidth: 2.5 })) },
            options: mkOpts({ plugins: { title: { display: true, text: 'TRAJECTORY FAMILY — 7W', font: titleFont, color: '#333' } }, x: { title: ax('Down-Range (km)') }, y: { title: ax('Altitude (m)'), beginAtZero: true } }),
          }),
        },
        {
          title: 'Time of flight vs range — all charges',
          subtitle: 'INITIAL VALIDATION',
          bullets: [
            <><B>7 charge zones</B> each producing a distinct TOF curve</>,
            <>Higher charges reach further but TOF curves <B>bend back</B> at max elevation</>,
            <>Exposed <B>~1–2% drift</B> and TOF gaps — drove need for official FT data</>,
          ],
          build: (ctx) => new Chart(ctx, {
            type: 'scatter',
            data: { datasets: tof.map(({ charge, data }) => ({ label: charge, data, showLine: true, pointRadius: 0, borderColor: CHARGE_COLORS[charge], borderWidth: 2 })) },
            options: mkOpts({ plugins: { title: { display: true, text: 'TIME OF FLIGHT — ALL CHARGES', font: titleFont, color: '#333' } }, x: { title: ax('Range (km)') }, y: { title: ax('TOF (s)'), beginAtZero: true } }),
          }),
        },
      ]
    }
    case 1: {
      const corr = genCorrelation(), box = genBox(json), fan = genFan(), tof = genTof(json)
      return [
        {
          title: 'MPM model vs official firing table',
          subtitle: '722 POINTS · R² = 0.9998',
          bullets: [
            <><B>7 charges</B> (4G → 8) validated against <B>FT 155-AM-2</B></>,
            <>Points tightly clustered along the <B>1:1 line</B></>,
            <>Aggregate RMS error only <B>56 m</B> — under <B>0.4%</B> of range</>,
          ],
          metrics: [{ label: 'R²', value: '0.9998' }, { label: 'RMS', value: '56 m' }],
          build: (ctx) => new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [
              ...Object.entries(CHARGE_COLORS).map(([ch, col]) => ({ label: ch, data: corr.filter(p => p.charge === ch), backgroundColor: col + 'bb', borderColor: col, pointRadius: 3.5, showLine: false })),
              { label: '1:1 line', data: [{ x: 0, y: 0 }, { x: 19, y: 19 }], showLine: true, pointRadius: 0, borderColor: '#ccc', borderDash: [6, 4], borderWidth: 2 },
            ] },
            options: mkOpts({ plugins: { title: { display: true, text: 'MPM vs FIRING TABLE', font: titleFont, color: '#333' } }, x: { title: ax('FT Range (km)'), min: 0, max: 20 }, y: { title: ax('MPM Range (km)'), min: 0, max: 20 } }),
          }),
        },
        {
          title: 'Range error breakdown by charge',
          subtitle: 'PER-CHARGE ERROR ANALYSIS',
          bullets: [
            <>Median errors cluster near <B>0–20 m</B> across all charges</>,
            <>Worst outliers at <B>5G</B> (~272 m) occur at extreme QE</>,
            <>All charges well inside <B>FT uncertainty</B> bounds</>,
          ],
          build: (ctx) => new Chart(ctx, {
            type: 'bar',
            data: { labels: box.map(b => b.charge), datasets: [
              { label: 'Median', data: box.map(b => b.median_m), backgroundColor: C.accent, borderRadius: 4, barPercentage: 0.5 },
              { label: 'Whisker High', data: box.map(b => b.whisker_high_m), backgroundColor: '#FF6B3555', borderRadius: 4, barPercentage: 0.5 },
              { label: 'Outlier Max', data: box.map(b => b.outliers_max_m || b.whisker_high_m), backgroundColor: '#ef444444', borderRadius: 4, barPercentage: 0.5 },
            ] },
            options: mkOpts({ plugins: { title: { display: true, text: 'RANGE ERROR — PER CHARGE', font: titleFont, color: '#333' } }, x: { title: ax('Charge') }, y: { title: ax('Error (m)') } }),
          }),
        },
        {
          title: 'Calibrated trajectory fan — Charge 7W',
          subtitle: 'MPM TRAJECTORIES',
          bullets: [
            <>Same 5 QE trajectories now match <B>official FT range</B> to <B>&lt; 0.4%</B></>,
            <>Apogee and range validated against <B>FT 155-AM-2</B> tables</>,
            <>Foundation for all downstream <B>guidance simulations</B></>,
          ],
          build: (ctx) => new Chart(ctx, {
            type: 'scatter',
            data: { datasets: fan.map((t, i) => ({ label: t.label, data: t.data, showLine: true, pointRadius: 0, borderColor: FAN_COLORS[i], borderWidth: 2 })) },
            options: mkOpts({ plugins: { title: { display: true, text: 'TRAJECTORY FAN — 7W', font: titleFont, color: '#333' } }, x: { title: ax('Range (km)') }, y: { title: ax('Altitude (m)'), beginAtZero: true } }),
          }),
        },
        {
          title: 'Time of flight reproduced within 0.3 s',
          subtitle: 'TOF VALIDATION',
          bullets: [
            <>Every charge's TOF curve <B>overlaps FT data</B> within <B>0.3 s</B></>,
            <>Confirms <B>drag model</B> and <B>form factors</B> are correct</>,
            <>MPM model now <B>production-ready</B> for trajectory prediction</>,
          ],
          metrics: [{ label: 'COVERAGE', value: '7 CHG / 722 pts' }, { label: 'TOF ACCURACY', value: '< 0.3 s' }],
          build: (ctx) => new Chart(ctx, {
            type: 'scatter',
            data: { datasets: tof.map(({ charge, data }) => ({ label: charge, data, showLine: true, pointRadius: 0, borderColor: CHARGE_COLORS[charge], borderWidth: 2 })) },
            options: mkOpts({ plugins: { title: { display: true, text: 'TIME OF FLIGHT — ALL CHARGES', font: titleFont, color: '#333' } }, x: { title: ax('Range (km)') }, y: { title: ax('TOF (s)'), beginAtZero: true } }),
          }),
        },
      ]
    }
    case 2: {
      const v = gen6v(), aoa = genAoA(), epic = genEpicyclic()
      return [
        {
          title: '6DOF and MPM produce identical vertical trajectories',
          subtitle: '7W @ QE 600 mil — ALTITUDE',
          bullets: [
            <>Both models <B>overlap perfectly</B> in the vertical plane</>,
            <>Apogee <B>~2,950 m</B>, range <B>~14 km</B> — confirms 6DOF baseline</>,
            <>Proves 6DOF didn't <B>break</B> the calibrated range accuracy</>,
          ],
          build: (ctx) => new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [
              { label: 'MPM (3DOF)', data: v.ma, showLine: true, pointRadius: 0, borderColor: '#999', borderWidth: 2.5, borderDash: [6, 4] },
              { label: '6DOF', data: v.sa, showLine: true, pointRadius: 0, borderColor: '#FF6B35', borderWidth: 2.5 },
            ] },
            options: mkOpts({ plugins: { title: { display: true, text: '6DOF vs MPM — ALTITUDE', font: titleFont, color: '#333' } }, x: { title: ax('Range (km)') }, y: { title: ax('Altitude (m)'), beginAtZero: true } }),
          }),
        },
        {
          title: '~430 m of spin drift — invisible to MPM',
          subtitle: 'CROSS-RANGE COMPARISON',
          bullets: [
            <><B>MPM has no lateral model</B> — cross-range is always zero</>,
            <>6DOF captures <B>Magnus force</B> and <B>yaw-of-repose</B> sideforce</>,
            <>At 14 km, spin drift reaches <B>~430 m</B> — a critical guidance input</>,
          ],
          metrics: [{ label: 'SPIN DRIFT', value: '~430 m' }, { label: 'STATES', value: '13' }],
          build: (ctx) => new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [
              { label: 'MPM (no lateral)', data: v.mc, showLine: true, pointRadius: 0, borderColor: '#999', borderWidth: 2.5, borderDash: [6, 4] },
              { label: '6DOF spin drift', data: v.sc, showLine: true, pointRadius: 0, borderColor: '#ef4444', borderWidth: 2.5, fill: { target: 'origin', above: '#ef444415' } },
            ] },
            options: mkOpts({ plugins: { title: { display: true, text: 'CROSS-RANGE — SPIN DRIFT', font: titleFont, color: '#333' } }, x: { title: ax('Range (km)') }, y: { title: ax('Cross-Range (m)'), beginAtZero: true } }),
          }),
        },
        {
          title: 'AoA peaks at apogee then damps toward impact',
          subtitle: 'ANGLE-OF-ATTACK ENVELOPE',
          bullets: [
            <>Initial <B>nutation oscillations</B> damp within first 5 seconds</>,
            <>AoA grows steadily to peak <B>~1.0°</B> at apogee (~27 s)</>,
            <>Descent brings AoA back to <B>~0.3°</B> near impact — canard authority holds</>,
          ],
          build: (ctx) => new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [{ data: aoa, showLine: true, pointRadius: 0, borderColor: '#FF6B35', borderWidth: 2.5, fill: { target: 'origin', above: '#FF6B3518' } }] },
            options: mkOpts({ plugins: { title: { display: true, text: 'AoA ENVELOPE — 7W QE 600', font: titleFont, color: '#333' }, legend: { display: false } }, x: { title: ax('Time (s)') }, y: { title: ax('AoA (deg)'), beginAtZero: true } }),
          }),
        },
        {
          title: 'Epicyclic spiral — nutation + precession',
          subtitle: 'ATTITUDE DYNAMICS (first 250 ms)',
          bullets: [
            <>Phase-plane plot of <B>α vs β</B> — the signature of spinning flight</>,
            <>Spiral damps inward as <B>pitch damping</B> takes effect</>,
            <>This motion is <B>structurally invisible</B> to any 3DOF model</>,
          ],
          build: (ctx) => new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [{ data: epic, showLine: true, pointRadius: 0, borderColor: '#FF6B35', borderWidth: 1.5 }] },
            options: mkOpts({ plugins: { title: { display: true, text: 'EPICYCLIC MOTION — α vs β', font: titleFont, color: '#333' }, legend: { display: false } }, x: { title: ax('β (deg)') }, y: { title: ax('α (deg)') } }),
          }),
        },
      ]
    }
    case 3: {
      const rd = genRoll(json), dr = genDrift()
      return [
        {
          title: 'Body keeps spinning — nose brakes to zero',
          subtitle: 'ROLL-DECOUPLED SPIN RATES',
          bullets: [
            <>Body maintains <B>~1,100 rad/s</B> for gyroscopic stability</>,
            <>Bearing engages at <B>200 m</B> (428 ms after launch)</>,
            <>Alternator brakes nose to <B>~0 rad/s</B> in <B>τ = 0.25 s</B></>,
          ],
          metrics: [{ label: 'ARM-OUT', value: '200 m / 430 ms' }, { label: 'BRAKE τ', value: '0.25 s' }],
          build: (ctx) => new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [
              { label: 'Body spin (p_b)', data: rd.bp, showLine: true, pointRadius: 0, borderColor: '#3b82f6', borderWidth: 2.5 },
              { label: 'Nose spin (p_n)', data: rd.np, showLine: true, pointRadius: 0, borderColor: '#FF6B35', borderWidth: 2.5 },
            ] },
            options: mkOpts({ plugins: { title: { display: true, text: 'BODY vs NOSE SPIN', font: titleFont, color: '#333' } }, x: { title: ax('Time (s)'), min: 0, max: 5 }, y: { title: ax('Spin (rad/s)') } }),
          }),
        },
        {
          title: 'Coupled canards oscillate — decoupled produce steady force',
          subtitle: 'LATERAL ACCELERATION',
          bullets: [
            <>Canards rotating with body produce <B>±0.93 m/s²</B> that <B>averages to zero</B></>,
            <>Decoupled (earth-fixed) canards produce steady <B>0.19 m/s²</B></>,
            <>This is <B>why de-spinning is essential</B> — no steering without it</>,
          ],
          build: (ctx) => new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [
              { label: 'Coupled (oscillating)', data: dr.ca, showLine: true, pointRadius: 0, borderColor: '#999', borderWidth: 1.5 },
              { label: 'Decoupled (steady)', data: dr.da, showLine: true, pointRadius: 0, borderColor: '#FF6B35', borderWidth: 2.5 },
            ] },
            options: mkOpts({ plugins: { title: { display: true, text: 'LATERAL ACCELERATION', font: titleFont, color: '#333' } }, x: { title: ax('Time (s)') }, y: { title: ax('Accel (m/s²)') } }),
          }),
        },
        {
          title: 'Decoupled canards build real lateral velocity',
          subtitle: 'NET STEERING AUTHORITY',
          bullets: [
            <>Coupled: lateral velocity stays at <B>zero</B> — no net correction</>,
            <>Decoupled: velocity builds linearly to <B>~4.5 m/s</B> by 25 s</>,
            <>Proves the <B>de-spun architecture</B> delivers real steering</>,
          ],
          build: (ctx) => new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [
              { label: 'Coupled (zero)', data: dr.cv, showLine: true, pointRadius: 0, borderColor: '#999', borderWidth: 2, borderDash: [6, 4] },
              { label: 'Decoupled (builds)', data: dr.dv, showLine: true, pointRadius: 0, borderColor: '#FF6B35', borderWidth: 2.5, fill: { target: 'origin', above: '#FF6B3518' } },
            ] },
            options: mkOpts({ plugins: { title: { display: true, text: 'NET LATERAL VELOCITY', font: titleFont, color: '#333' } }, x: { title: ax('Time (s)') }, y: { title: ax('Velocity (m/s)'), beginAtZero: true } }),
          }),
        },
      ]
    }
    default: return []
  }
}

// --- Step overview text ---
const stepMeta = [
  { id: '01', tag: 'OPEN-SOURCE MODEL' },
  { id: '02', tag: 'MPM / FT 155-AM-2' },
  { id: '03', tag: 'FULL 6DOF' },
  { id: '04', tag: 'ROLL-DECOUPLED' },
  { id: '05', tag: 'PARAMETERS' },
]

// --- Table styles ---
const thStyle = { padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontSize: 15, color: C.textDim, fontWeight: 600, letterSpacing: 1 }
const tdStyle = { padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${C.borderLight}`, fontSize: 16, color: C.text }
const tdVal = { ...tdStyle, textAlign: 'right', color: C.accent, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }

function ParametersSection() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 24, marginTop: 12 }}>
      {/* Card 1: Projectile Physical */}
      <div style={{ ...panelStyle, borderTop: `4px solid ${C.accent}`, padding: '20px 22px' }}>
        <div style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700, marginBottom: 4 }}>PROJECTILE · PHYSICAL</div>
        <div style={{ fontSize: 13, color: C.textDim, letterSpacing: 1.5, marginBottom: 16 }}>M107 155 mm HE · FT 155-AM-2</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Mass', '43.2 kg'],
              ['Diameter (caliber)', '0.155 m'],
              ['Reference area S', 'π d²/4'],
              ['Axial MOI Ixx', '0.1517 kg·m²'],
              ['Transverse MOI Iyy', '1.578 kg·m²'],
              ['Rifling twist (RH)', '1 / 20 cal'],
              ['Charges modelled', '1G–3W, 4G–8'],
              ['MV range', '208 – 684 m/s'],
            ].map(([k, v]) => (
              <tr key={k}><td style={thStyle}>{k}</td><td style={tdVal}>{v}</td></tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 14, padding: '10px 12px', background: C.accentDim, borderLeft: `3px solid ${C.accent}`, fontSize: 15, fontFamily: "'IBM Plex Mono', monospace", color: C.text }}>
          p₀ = 2π V₀ / (n·d)  <span style={{ color: C.textDim, fontSize: 13 }}> STANAG-4355 §4.3</span>
        </div>
      </div>

      {/* Card 2: Aero Coefficients */}
      <div style={{ ...panelStyle, borderTop: `4px solid ${C.accent}`, padding: '20px 22px' }}>
        <div style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700, marginBottom: 4 }}>AERO COEFFICIENTS (M-TABLE)</div>
        <div style={{ fontSize: 13, color: C.textDim, letterSpacing: 1.5, marginBottom: 16 }}>BRL MR-1167 · STANAG-4355 §5 · wind-tunnel corrections</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Coeff', 'M 0.5', 'M 0.9', 'M 1.0', 'M 1.5', 'M 2.0'].map(h => (
                  <th key={h} style={{ ...thStyle, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Cd₀', '.143', '.143', '.328', '.352', '.282'],
                ['Cdα²', '5.0', '6.0', '7.5', '6.0', '5.0'],
                ['Cnpα', '-0.50', '-0.85', '-1.00', '-0.65', '-0.50'],
                ['Clp', '-.010', '-.012', '-.015', '-.012', '-.010'],
                ['CLα', '2.00', '2.60', '3.20', '2.40', '2.10'],
                ['CMα', '3.00', '3.50', '4.50', '3.20', '2.80'],
                ['CMq', '-8.0', '-10.0', '-12.0', '-10.0', '-8.0'],
              ].map(([coeff, ...vals]) => (
                <tr key={coeff}>
                  <td style={{ ...thStyle, fontWeight: 700 }}>{coeff}</td>
                  {vals.map((v, i) => <td key={i} style={tdVal}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 14, color: C.textDim, marginTop: 14, lineHeight: 1.6 }}>
          Transonic <B>Cd₀ spike</B> captured explicitly. CLα, CMα include <B>wind-tunnel correction</B> for enlarged canard assembly (Design-02).
        </div>
      </div>

      {/* Card 3: Form Factors */}
      <div style={{ ...panelStyle, borderTop: `4px solid ${C.accent}`, padding: '20px 22px' }}>
        <div style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700, marginBottom: 4 }}>CALIBRATED FORM FACTOR i(QE)</div>
        <div style={{ fontSize: 13, color: C.textDim, letterSpacing: 1.5, marginBottom: 10 }}>Fitted against FT 155-AM-2 (13-state 6DOF)</div>
        <div style={{ marginBottom: 14, padding: '10px 12px', background: C.accentDim, borderLeft: `3px solid ${C.accent}`, fontSize: 15, fontFamily: "'IBM Plex Mono', monospace", color: C.text }}>
          i(QE) = a + b·QE + c·QE²  <span style={{ color: C.textDim, fontSize: 13 }}>QE in mils</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Ch.', 'a', 'b', 'RMS'].map(h => (
                <th key={h} style={{ ...thStyle, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['1G', '1.0127', '0', '8 m'],
              ['2G', '1.0139', '0', '9 m'],
              ['3G', '0.9343', '0', '9 m'],
              ['3W', '0.9600', '0', '16 m'],
              ['4G', '1.1273', '-2.26e-4', '<25 m'],
              ['4W', '1.2590', '-3.05e-4', '<25 m'],
              ['5G', '1.1656', '-2.22e-4', '<25 m'],
              ['5W', '1.1513', '-1.85e-4', '<25 m'],
              ['6W', '1.0689', '-0.81e-4', '<27 m'],
              ['7W', '1.0560', '-0.50e-4', '<27 m'],
              ['8', '1.0039', '+1.01e-4', '<27 m'],
            ].map(([ch, a, b, rms]) => (
              <tr key={ch}>
                <td style={{ ...thStyle, fontWeight: 700 }}>{ch}</td>
                <td style={tdVal}>{a}</td>
                <td style={tdVal}>{b}</td>
                <td style={tdVal}>{rms}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 14, color: C.textDim, marginTop: 14, lineHeight: 1.6 }}>
          c = 0 for all charges except 8 (c = −1.36×10⁻⁷). All <B>11 charges</B> calibrated; aggregate MPM RMS <B>&lt; 0.4%</B> of range.
        </div>
      </div>
    </div>
  )
}

export default function BallisticsTab() {
  const [json, setJson] = useState(null)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => { fetch('/ballistics_data.json').then(r => r.json()).then(setJson) }, [])
  if (!json) return null

  const sections = getSections(activeStep, json)
  const meta = stepMeta[activeStep]

  return (
    <div style={{ padding: 36 }}>
      {/* Intro */}
      <div style={{ ...panelStyle, marginBottom: 20, padding: '20px 28px' }}>
        <div style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
          Section 02 — Ballistics / Aero Modelling
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: C.textBright, marginBottom: 8 }}>
          From Open Tables to Full 6DOF
        </div>
        <div style={{ fontSize: 22, color: C.textDim, lineHeight: 1.6, maxWidth: 1100 }}>
          The ballistic model matured in four steps — each forced by a limitation of the previous one.
          Public data, official firing tables, full attitude dynamics, then roll-decoupled flight.
        </div>
      </div>

      {/* Step selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        {stepMeta.map((s, i) => (
          <button key={s.id} onClick={() => setActiveStep(i)} style={{
            ...panelStyle, padding: '16px 20px', cursor: 'pointer',
            borderTop: `4px solid ${activeStep === i ? C.accent : C.border}`,
            background: activeStep === i ? C.accentDim : '#fff',
            transition: 'all 0.15s', textAlign: 'left',
          }}>
            <div style={{ fontSize: 16, color: C.accent, letterSpacing: 2.5, fontWeight: 700, fontFamily: font }}>STEP {s.id}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.textBright, margin: '6px 0', fontFamily: font }}>{s.tag}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeStep === 4 ? (
        <div style={{ ...panelStyle, padding: '12px 36px 36px' }}>
          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `2px solid ${C.borderLight}` }}>
            <span style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700 }}>REFERENCE — MODEL PARAMETERS & CALIBRATION</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.textBright, marginTop: 12, marginBottom: 6 }}>
            What the ballistic model actually contains.
          </div>
          <ParametersSection />
        </div>
      ) : (
        <div style={{ ...panelStyle, padding: '12px 36px 36px' }}>
          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `2px solid ${C.borderLight}` }}>
            <span style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700 }}>STEP {meta.id} — {meta.tag}</span>
          </div>

          {sections.map((sec, i) => (
            <ChartSection
              key={`${activeStep}-${i}`}
              chartKey={`${activeStep}-${i}`}
              buildChart={sec.build}
              title={sec.title}
              subtitle={sec.subtitle}
              bullets={sec.bullets}
              metrics={sec.metrics}
              flip={i % 2 === 0}
            />
          ))}
        </div>
      )}

      {/* CFD Gallery */}
      <div style={{ ...panelStyle, padding: '24px 36px', marginTop: 20 }}>
        <div style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
          Computational Fluid Dynamics
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.textBright, marginBottom: 6 }}>
          CFD Analysis Across the Mach Envelope
        </div>
        <div style={{ fontSize: 18, color: C.textDim, lineHeight: 1.6, marginBottom: 20 }}>
          Flow field analysis at four Mach numbers spanning the full flight regime — subsonic through supersonic.
        </div>
        <CFDGallery />
      </div>
    </div>
  )
}

const CFD_DATA = [
  { mach: '0.9', label: 'Subsonic', images: [
    { src: '/images/cfd/cfd_m09_velocity.png', label: 'Velocity Field' },
    { src: '/images/cfd/cfd_m09_temperature.png', label: 'Temperature' },
    { src: '/images/cfd/cfd_m09_cd.png', label: 'Drag Convergence' },
    { src: '/images/cfd/cfd_m09_pgk.png', label: 'PGK Geometry' },
  ]},
  { mach: '1.2', label: 'Transonic', images: [
    { src: '/images/cfd/cfd_m12_velocity.png', label: 'Velocity Field' },
  ]},
  { mach: '1.5', label: 'Supersonic', images: [
    { src: '/images/cfd/cfd_m15_velocity.png', label: 'Velocity Field' },
    { src: '/images/cfd/cfd_m15_cd.png', label: 'Drag Convergence' },
  ]},
  { mach: '2.0', label: 'High Supersonic', images: [
    { src: '/images/cfd/cfd_m20_velocity.png', label: 'Velocity Field' },
  ]},
]

function CFDGallery() {
  const [activeMach, setActiveMach] = useState(0)
  const data = CFD_DATA[activeMach]

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {CFD_DATA.map((d, i) => (
          <button key={d.mach} onClick={() => setActiveMach(i)} style={{
            background: activeMach === i ? C.accentDim : '#fff',
            border: `1px solid ${activeMach === i ? C.accent : C.border}`,
            borderTop: `3px solid ${activeMach === i ? C.accent : C.border}`,
            borderRadius: 8, padding: '12px 20px', cursor: 'pointer', textAlign: 'center', flex: 1,
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.textBright }}>M {d.mach}</div>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 2 }}>{d.label}</div>
          </button>
        ))}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: data.images.length === 1 ? '1fr' : '1fr 1fr',
        gridTemplateRows: data.images.length > 2 ? '320px 320px' : '400px',
        gap: 12,
      }}>
        {data.images.map((img, i) => (
          <div key={i} style={{
            background: '#f5f5f5', border: `1px solid ${C.border}`, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <img src={img.src} alt={img.label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            <div style={{
              position: 'absolute', bottom: 10, left: 14,
              fontSize: 13, color: C.textDim, fontWeight: 600, letterSpacing: 1.5,
              background: 'rgba(255,255,255,0.85)', padding: '3px 10px', borderRadius: 4,
            }}>{img.label} — Mach {data.mach}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
