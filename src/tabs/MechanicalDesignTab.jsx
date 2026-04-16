import { useState } from 'react'
import { C, font, panelStyle } from '../theme.js'

const B = ({ children }) => <strong style={{ fontWeight: 700, color: C.textBright }}>{children}</strong>

const designs = [
  {
    id: '01',
    tag: 'PRELIMINARY',
    image: '/images/designs/Design1.png',
    driver: <>No empirical data yet. We needed a credible <B>reference geometry</B> to anchor the <B>aero model</B>, the <B>mass budget</B>, and the <B>wind-tunnel article</B>.</>,
    change: <>Reference architecture taken from <B>open literature</B> on fuze-replacement PGKs: nose-mounted <B>4-canard de-spun assembly</B> over a fixed-fin body. <B>Canard area</B> sized from textbook L/D, bodies from analogous programs.</>,
    outcome: <><B>Envelope</B>, <B>mass</B> and <B>CG</B> frozen at preliminary level. This geometry became the common baseline for the <B>wind-tunnel model</B> and the <B>ballistic simulation</B>.</>,
    metrics: [
      { label: 'CONFIDENCE', value: 'LOW' },
      { label: 'DATA SOURCE', value: 'OPEN LIT.' },
    ],
    changeLabel: 'APPROACH',
  },
  {
    id: '02',
    tag: 'WINDTUNNEL-CORRECTED',
    image: '/images/designs/Design2.png',
    driver: <><B>Wind-tunnel testing</B> on the Design-01 article measured <B>canard lift</B> of only <B>~10 N</B>. The closed-loop ballistic simulation showed <B>~40 N</B> was required to hit the <B>CEP target</B> at <B>15 km</B> — a <B>4x shortfall</B> in control authority.</>,
    change: <><B>Canard planform area</B> enlarged and <B>cant angle</B> increased to reach the <B>40 N</B> requirement. <B>Nose ballistic profile</B> re-optimised so the additional lifting surface did not blow the <B>drag budget</B>.</>,
    outcome: <><B>Control authority</B> met at the flight condition. <B>Range penalty</B> held within <B>3%</B> of Design-01.</>,
    metrics: [
      { label: 'LIFT (MEASURED)', value: '10 → 40 N' },
      { label: 'RANGE PENALTY', value: '< 3%' },
    ],
    changeLabel: 'CHANGE',
  },
  {
    id: '03',
    tag: 'SENSOR-INTEGRATED',
    image: '/download.png',
    driver: <>Military-grade <B>GPS receiver</B>, <B>IMU</B>, <B>magnetometer</B> and the <B>PMSM motor</B> were procured. The <B>physical envelopes</B> and <B>thermal footprints</B> of the delivered parts did not fit the Design-02 internal volume.</>,
    change: <>Interior repacked to accept the actual <B>procured hardware</B>. <B>Motor mount</B>, <B>sensor stack</B>, and <B>harness routing</B> designed around the delivered parts rather than placeholder models.</>,
    outcome: <>Every subsystem now backed by a <B>qualified part number</B>. <B>Mass</B> and <B>CG</B> kept inside the original <B>fuze-replacement budget</B>.</>,
    metrics: [
      { label: 'SENSORS', value: 'GPS / IMU / MAG' },
      { label: 'MOTOR', value: 'PMSM' },
    ],
    changeLabel: 'CHANGE',
  },
  {
    id: '04',
    tag: 'G-HARDENED',
    image: null,
    driver: <><B>FEA</B> revealed that even <B>aerospace-grade bearings</B> would not survive the <B>setback g-shock</B> of the <B>155 mm gun launch</B>. Conventional bearing selection had reached its ceiling.</>,
    change: <><B>Mechanical lock-out</B> added: nose and body remain <B>rigidly coupled</B> during muzzle exit. Coupling releases at <B>200 m arm-out</B> — after setback is over — and only then does the <B>bearing</B> begin to function.</>,
    outcome: <>Bearing sees only <B>in-flight loads</B>, well below its <B>qualification g</B>. <B>Setback survival</B> eliminated as a design risk without up-sizing the bearing class.</>,
    metrics: [
      { label: 'ARM-OUT RANGE', value: '200 m' },
      { label: 'BEARING RISK', value: 'CLOSED' },
    ],
    changeLabel: 'CHANGE',
  },
]

const storyColors = {
  driver: '#dc2626',
  change: C.accent,
  outcome: '#16a34a',
}

export default function MechanicalDesignTab() {
  const [activeDesign, setActiveDesign] = useState(0)

  return (
    <div style={{ padding: 36 }}>
      {/* Intro */}
      <div style={{ ...panelStyle, marginBottom: 20, padding: '20px 28px' }}>
        <div style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
          Section 01 — Mechanical Design
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: C.textBright, marginBottom: 8 }}>
          Four Iterations to Flight Hardware
        </div>
        <div style={{ fontSize: 22, color: C.textDim, lineHeight: 1.6, maxWidth: 1100 }}>
          The mechanical configuration evolved through four distinct generations — each forced by
          a test result, a wind-tunnel measurement, a procurement reality, or an FEA failure.
        </div>
      </div>

      {/* Timeline selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {designs.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setActiveDesign(i)}
            style={{
              ...panelStyle,
              padding: '16px 20px',
              cursor: 'pointer',
              borderTop: `4px solid ${activeDesign === i ? C.accent : C.border}`,
              background: activeDesign === i ? C.accentDim : '#fff',
              transition: 'all 0.15s',
              textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 16, color: C.accent, letterSpacing: 2.5, fontWeight: 700, fontFamily: font }}>
              DESIGN {d.id}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.textBright, margin: '6px 0 6px', fontFamily: font }}>
              {d.tag}
            </div>
          </button>
        ))}
      </div>

      {/* Active design detail */}
      {(() => {
        const d = designs[activeDesign]
        return (
          <div style={{ ...panelStyle, padding: '24px 28px' }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 16,
              marginBottom: 18, paddingBottom: 14, borderBottom: `2px solid ${C.borderLight}`,
            }}>
              <span style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700 }}>
                DESIGN {d.id} — {d.tag}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              {/* Image / placeholder */}
              <div style={{
                background: '#f5f5f5',
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 300,
                maxHeight: 440,
              }}>
                {d.image ? (
                  <img
                    src={d.image}
                    alt={`Design ${d.id}`}
                    style={{
                      maxWidth: d.id === '03' ? '100%' : '130%',
                      maxHeight: d.id === '03' ? '100%' : '130%',
                      objectFit: 'contain',
                      transform: d.id === '03' ? 'scale(1.04)' : 'scale(1.3)',
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: C.textDim }}>
                    <div style={{ fontSize: 22, letterSpacing: 3, color: '#ccc', marginBottom: 10 }}>
                      [ DESIGN {d.id} RENDER ]
                    </div>
                    <div style={{ fontSize: 18, color: '#bbb' }}>
                      Image to be added
                    </div>
                  </div>
                )}
                <div style={{
                  position: 'absolute', top: 12, right: 16,
                  fontSize: 14, letterSpacing: 2, color: C.textDim, fontWeight: 600,
                }}>
                  DWG-PGK-{d.id}
                </div>
              </div>

              {/* Story blocks + metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { key: 'driver', label: 'DRIVER', text: d.driver },
                  { key: 'change', label: d.changeLabel, text: d.change },
                  { key: 'outcome', label: 'OUTCOME', text: d.outcome },
                ].map(block => (
                  <div
                    key={block.key}
                    style={{
                      borderLeft: `5px solid ${storyColors[block.key]}`,
                      padding: '14px 22px',
                      background: `${storyColors[block.key]}06`,
                      borderRadius: '0 10px 10px 0',
                    }}
                  >
                    <div style={{ fontSize: 16, color: C.textDim, letterSpacing: 3, marginBottom: 6, fontWeight: 700 }}>
                      {block.label}
                    </div>
                    <div style={{ fontSize: 22, color: C.text, lineHeight: 1.55 }}>
                      {block.text}
                    </div>
                  </div>
                ))}

                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 'auto' }}>
                  {d.metrics.map(m => (
                    <div key={m.label} style={{
                      background: '#f9f9f9',
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: '14px 20px',
                    }}>
                      <div style={{ fontSize: 16, color: C.textDim, letterSpacing: 2.5, fontWeight: 700 }}>{m.label}</div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: C.accent, marginTop: 6 }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Design Comparison Table */}
      <div style={{ ...panelStyle, marginTop: 20, padding: '24px 28px' }}>
        <div style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
          Design Progression Summary
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.textBright, marginBottom: 16 }}>
          Quantitative Comparison — Design 1 through 4
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {['', 'D1 Preliminary', 'D2 Windtunnel', 'D3 Sensors', 'D4 Final'].map((h, i) => (
                <th key={i} style={{
                  padding: '10px 14px', textAlign: i === 0 ? 'left' : 'center',
                  fontSize: 15, fontWeight: 700, color: i === 4 ? '#16a34a' : i === 0 ? C.textDim : C.textBright,
                  letterSpacing: i === 0 ? 2 : 0,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Canard Lift', '~10 N', '40 N', '40 N', '40 N'],
              ['Control Authority', 'NONE', 'MARGINAL', 'INTERMITTENT', 'FULL'],
              ['Bearing Survival', 'N/A', 'N/A', 'N/A', 'LOCK-OUT'],
              ['Sensor Suite', 'NONE', 'NONE', 'GPS/IMU/MAG', 'GPS/IMU/MAG'],
              ['Range Penalty', '0%', '3%', '3%', '3%'],
              ['Sim CEP (D4 ref)', '> 200 m', '80–120 m', '50–90 m', '35–50 m'],
              ['Roll Decoupled', 'NO', 'NO', 'NO', 'YES'],
              ['Arm-Out', 'N/A', 'N/A', 'N/A', '200 m'],
              ['TRL', '2', '3', '4', '5'],
            ].map(([label, ...vals]) => (
              <tr key={label} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                <td style={{ padding: '10px 14px', fontSize: 15, fontWeight: 600, color: C.textDim, letterSpacing: 1 }}>{label}</td>
                {vals.map((v, i) => {
                  const isGood = i === 3 && !['N/A', 'NONE', 'NO', '0%'].includes(v)
                  const isBad = (v === 'NONE' || v === 'N/A' || v === 'NO' || v.includes('200'))
                  return (
                    <td key={i} style={{
                      padding: '10px 14px', textAlign: 'center', fontSize: 16, fontWeight: 600,
                      color: isGood ? '#16a34a' : isBad && i < 3 ? '#999' : C.textBright,
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}>{v}</td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
