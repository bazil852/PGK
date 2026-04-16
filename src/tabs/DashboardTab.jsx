import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { C, font, panelStyle, headingStyle, gridLayout } from '../theme.js'

Chart.register(...registerables)

function ChartPanel({ title, canvasRef, height = 280 }) {
  return (
    <div style={panelStyle}>
      <div style={headingStyle}>{title}</div>
      <div style={{ position: 'relative', height, width: '100%' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}

export default function DashboardTab({ data }) {
  const sideRef = useRef(null)
  const topRef = useRef(null)
  const machRef = useRef(null)
  const altRef = useRef(null)
  const chartsRef = useRef([])

  useEffect(() => {
    chartsRef.current.forEach(c => c?.destroy())
    chartsRef.current = []

    const u = data.unguided.trajectory
    const gridColor = '#f0f0f0'
    const tickColor = '#999'

    const baseOpts = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#666', font: { family: font, size: 11 } } } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
      },
    }

    const COL_U = '#FF6B35'
    const COL_HIT = '#16a34a'
    const COL_MISS = '#dc2626'

    if (sideRef.current) {
      const datasets = [{
        label: 'Unguided', data: u.x.map((x, i) => ({ x: x/1000, y: u.z[i]/1000 })),
        borderColor: COL_U, borderWidth: 2, pointRadius: 0, fill: false,
      }]
      data.guided_runs.forEach(run => {
        const t = run.trajectory
        datasets.push({
          label: `${run.label} (${run.miss}m)`,
          data: t.x.map((x, i) => ({ x: x/1000, y: t.z[i]/1000 })),
          borderColor: run.success ? COL_HIT : COL_MISS,
          borderWidth: 1.5, pointRadius: 0, fill: false,
          borderDash: run.success ? [] : [4, 2],
        })
      })
      chartsRef.current.push(new Chart(sideRef.current, {
        type: 'scatter', data: { datasets },
        options: { ...baseOpts, showLine: true,
          scales: { ...baseOpts.scales,
            x: { ...baseOpts.scales.x, title: { display: true, text: 'Downrange (km)', color: '#666' } },
            y: { ...baseOpts.scales.y, title: { display: true, text: 'Altitude (km)', color: '#666' } },
          },
        },
      }))
    }

    if (topRef.current) {
      const datasets = [{
        label: 'Unguided', data: u.x.map((x, i) => ({ x: x/1000, y: u.y[i] })),
        borderColor: COL_U, borderWidth: 2, pointRadius: 0, fill: false,
      }]
      data.guided_runs.forEach(run => {
        const t = run.trajectory
        datasets.push({
          label: run.label,
          data: t.x.map((x, i) => ({ x: x/1000, y: t.y[i] })),
          borderColor: run.success ? COL_HIT : COL_MISS,
          borderWidth: 1.5, pointRadius: 0, fill: false,
        })
      })
      chartsRef.current.push(new Chart(topRef.current, {
        type: 'scatter', data: { datasets },
        options: { ...baseOpts, showLine: true,
          plugins: { legend: { display: false } },
          scales: { ...baseOpts.scales,
            x: { ...baseOpts.scales.x, title: { display: true, text: 'Downrange (km)', color: '#666' } },
            y: { ...baseOpts.scales.y, title: { display: true, text: 'Crossrange (m)', color: '#666' } },
          },
        },
      }))
    }

    if (machRef.current) {
      const datasets = [{
        label: 'Unguided', data: u.t.map((t, i) => ({ x: t, y: u.mach[i] })),
        borderColor: COL_U, borderWidth: 2, pointRadius: 0, fill: false,
      }]
      datasets.push({
        label: 'Guidance Floor (M 0.9)',
        data: [{ x: 0, y: 0.9 }, { x: u.t[u.t.length-1], y: 0.9 }],
        borderColor: '#ddd', borderWidth: 1, pointRadius: 0, borderDash: [6, 3], fill: false,
      })
      chartsRef.current.push(new Chart(machRef.current, {
        type: 'scatter', data: { datasets },
        options: { ...baseOpts, showLine: true,
          scales: { ...baseOpts.scales,
            x: { ...baseOpts.scales.x, title: { display: true, text: 'Time (s)', color: '#666' } },
            y: { ...baseOpts.scales.y, title: { display: true, text: 'Mach', color: '#666' } },
          },
        },
      }))
    }

    if (altRef.current) {
      chartsRef.current.push(new Chart(altRef.current, {
        type: 'scatter',
        data: { datasets: [{
          label: 'Altitude', data: u.t.map((t, i) => ({ x: t, y: u.z[i] })),
          borderColor: COL_U, borderWidth: 2, pointRadius: 0,
          fill: { target: 'origin', above: 'rgba(255,107,53,0.06)' },
        }] },
        options: { ...baseOpts, showLine: true,
          scales: { ...baseOpts.scales,
            x: { ...baseOpts.scales.x, title: { display: true, text: 'Time (s)', color: '#666' } },
            y: { ...baseOpts.scales.y, title: { display: true, text: 'Altitude (m)', color: '#666' } },
          },
        },
      }))
    }

    return () => chartsRef.current.forEach(c => c?.destroy())
  }, [data])

  const nHits = data.guided_runs.filter(r => r.success).length
  const nTotal = data.guided_runs.length

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Charge', value: data.charge },
          { label: 'Muzzle Velocity', value: `${data.muzzle_velocity} m/s` },
          { label: 'QE', value: `${data.qe_mils} mils` },
          { label: 'Runs', value: nTotal },
          { label: 'Hit Rate', value: `${((nHits/nTotal)*100).toFixed(0)}%`, color: nHits/nTotal >= 0.5 ? '#16a34a' : '#dc2626' },
          { label: 'CEP Target', value: '<50m', color: '#FF6B35' },
        ].map(s => (
          <div key={s.label} style={{ ...panelStyle, flex: 1, textAlign: 'center', padding: '14px 8px' }}>
            <div style={{ fontSize: 10, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: s.color || '#111' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={gridLayout}>
        <ChartPanel title="Side View — Altitude vs Downrange" canvasRef={sideRef} />
        <ChartPanel title="Top-Down — Crossrange vs Downrange" canvasRef={topRef} />
        <ChartPanel title="Mach Profile" canvasRef={machRef} />
        <ChartPanel title="Altitude Profile" canvasRef={altRef} />
      </div>

      <div style={{ ...panelStyle, marginTop: 16 }}>
        <div style={headingStyle}>Monte Carlo Results</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              {['Run', 'Target Y', 'Impact X', 'Impact Y', 'Miss', 'Status'].map(h => (
                <th key={h} style={{ padding: '8px', textAlign: 'left', color: '#999', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.guided_runs.map(run => (
              <tr key={run.label} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '8px', color: '#333', fontWeight: 500 }}>{run.label}</td>
                <td style={{ padding: '8px', color: '#666' }}>{run.target.y} m</td>
                <td style={{ padding: '8px', color: '#666' }}>{run.impact.x} m</td>
                <td style={{ padding: '8px', color: '#666' }}>{run.impact.y} m</td>
                <td style={{ padding: '8px', color: run.success ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{run.miss} m</td>
                <td style={{ padding: '8px', color: run.success ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{run.success ? 'HIT' : 'MISS'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
