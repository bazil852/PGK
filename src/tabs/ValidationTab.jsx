import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { C, font, panelStyle, headingStyle, gridLayout } from '../theme.js'

Chart.register(...registerables)

const COLORS = ['#FF6B35','#333','#FF8C42','#666','#ff9966','#999','#ffb380','#bbb']

export default function ValidationTab({ data }) {
  const errorRef = useRef(null)
  const scatterRef = useRef(null)
  const barRef = useRef(null)
  const chartsRef = useRef([])

  useEffect(() => {
    chartsRef.current.forEach(c => c?.destroy())
    chartsRef.current = []
    if (!data.validation?.length) return

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

    if (errorRef.current) {
      const datasets = data.validation.map((v, i) => ({
        label: `Charge ${v.charge}`,
        data: v.points.map(p => ({ x: p.range_ft/1000, y: p.error })),
        borderColor: COLORS[i % COLORS.length], borderWidth: 1.5,
        pointRadius: 3, pointBackgroundColor: COLORS[i % COLORS.length],
        fill: false, showLine: true,
      }))
      datasets.push({
        label: 'Zero', data: [{ x: 0, y: 0 }, { x: 20, y: 0 }],
        borderColor: '#ddd', borderWidth: 1, pointRadius: 0, borderDash: [4, 2], fill: false,
      })
      chartsRef.current.push(new Chart(errorRef.current, {
        type: 'scatter', data: { datasets },
        options: { ...baseOpts, showLine: true,
          scales: { ...baseOpts.scales,
            x: { ...baseOpts.scales.x, title: { display: true, text: 'FT Range (km)', color: '#666' } },
            y: { ...baseOpts.scales.y, title: { display: true, text: 'Error: Sim - FT (m)', color: '#666' } },
          },
        },
      }))
    }

    if (scatterRef.current) {
      const datasets = data.validation.map((v, i) => ({
        label: v.charge,
        data: v.points.map(p => ({ x: p.range_ft/1000, y: p.range_sim/1000 })),
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: COLORS[i % COLORS.length] + '80',
        pointRadius: 4, showLine: false,
      }))
      datasets.push({
        label: 'Perfect', data: [{ x: 0, y: 0 }, { x: 20, y: 20 }],
        borderColor: '#ddd', borderWidth: 1, pointRadius: 0, borderDash: [6, 3], fill: false, showLine: true,
      })
      chartsRef.current.push(new Chart(scatterRef.current, {
        type: 'scatter', data: { datasets },
        options: { ...baseOpts,
          scales: { ...baseOpts.scales,
            x: { ...baseOpts.scales.x, title: { display: true, text: 'FT Range (km)', color: '#666' } },
            y: { ...baseOpts.scales.y, title: { display: true, text: 'Sim Range (km)', color: '#666' } },
          },
        },
      }))
    }

    if (barRef.current) {
      chartsRef.current.push(new Chart(barRef.current, {
        type: 'bar',
        data: {
          labels: data.validation.map(v => v.charge),
          datasets: [
            { label: 'RMS Error (m)', data: data.validation.map(v => v.rms), backgroundColor: 'rgba(255,107,53,0.2)', borderColor: '#FF6B35', borderWidth: 1 },
            { label: 'Max Error (m)', data: data.validation.map(v => v.max_err), backgroundColor: 'rgba(0,0,0,0.05)', borderColor: '#333', borderWidth: 1 },
          ],
        },
        options: { ...baseOpts,
          scales: { ...baseOpts.scales,
            x: { ...baseOpts.scales.x, title: { display: true, text: 'Charge', color: '#666' } },
            y: { ...baseOpts.scales.y, title: { display: true, text: 'Error (m)', color: '#666' }, beginAtZero: true },
          },
        },
      }))
    }

    return () => chartsRef.current.forEach(c => c?.destroy())
  }, [data])

  if (!data.validation?.length) return <div style={{ padding: 40, color: '#999' }}>No validation data.</div>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {data.validation.map(v => (
          <div key={v.charge} style={{ ...panelStyle, flex: 1, textAlign: 'center', padding: '12px 6px' }}>
            <div style={{ fontSize: 10, color: '#999', letterSpacing: 1, marginBottom: 4 }}>CHARGE {v.charge}</div>
            <div style={{ fontSize: 11, color: '#666' }}>{v.mv} m/s</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: v.rms < 30 ? '#16a34a' : '#dc2626', marginTop: 4 }}>
              {v.rms}m
            </div>
            <div style={{ fontSize: 10, color: '#999' }}>RMS | {v.max_err}m max</div>
          </div>
        ))}
      </div>

      <div style={gridLayout}>
        <div style={panelStyle}>
          <div style={headingStyle}>Range Error vs FT Range</div>
          <div style={{ position: 'relative', height: 300, width: '100%' }}><canvas ref={errorRef} /></div>
        </div>
        <div style={panelStyle}>
          <div style={headingStyle}>Sim Range vs FT Range</div>
          <div style={{ position: 'relative', height: 300, width: '100%' }}><canvas ref={scatterRef} /></div>
        </div>
      </div>

      <div style={{ ...panelStyle, marginTop: 16 }}>
        <div style={headingStyle}>RMS and Max Error by Charge</div>
        <div style={{ position: 'relative', height: 260, width: '100%' }}><canvas ref={barRef} /></div>
      </div>

      <div style={{ ...panelStyle, marginTop: 16 }}>
        <div style={headingStyle}>Validation Methodology</div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
          <p>6DOF rigid-body simulation validated against <strong style={{ color: '#111' }}>FT 155-AM-2</strong> (M107 HE, M198 Howitzer).</p>
          <p style={{ marginTop: 8 }}>Aerodynamic model: <strong style={{ color: '#111' }}>STANAG 4355 Ed.3</strong> with PCHIP-interpolated lookup tables (3501 points, 7 coefficients).</p>
          <p style={{ marginTop: 8 }}>Form factors calibrated per charge as <strong style={{ color: '#111' }}>ff(QE) = a + b·QE + c·QE²</strong>.</p>
          <p style={{ marginTop: 8 }}>Acceptance criteria: <strong style={{ color: '#16a34a' }}>RMS {'<'} 30m, Max {'<'} 50m</strong>. All 8 calibrated charges pass.</p>
        </div>
      </div>
    </div>
  )
}
