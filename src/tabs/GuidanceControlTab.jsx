import { useState } from 'react'
import { C, font, panelStyle } from '../theme.js'

const B = ({ children }) => <strong style={{ fontWeight: 700, color: C.textBright }}>{children}</strong>

const storyColors = { driver: '#dc2626', change: C.accent, outcome: '#16a34a' }

function Section({ title, subtitle, bullets, metrics, imageSrc, imageLabel, flip }) {
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

  const imgSide = (
    <div style={{
      background: '#f5f5f5', border: `1px solid ${C.border}`, borderRadius: 12,
      height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <img src={imageSrc} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      {imageLabel && (
        <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 12, letterSpacing: 2, color: C.textDim, fontWeight: 600 }}>{imageLabel}</div>
      )}
    </div>
  )

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'center',
      padding: '28px 0', borderBottom: `1px solid ${C.borderLight}`,
    }}>
      {flip ? <>{imgSide}{textSide}</> : <>{textSide}{imgSide}</>}
    </div>
  )
}

function StoryBlock({ label, colorKey, items }) {
  return (
    <div style={{
      borderLeft: `5px solid ${storyColors[colorKey]}`,
      padding: '14px 22px',
      background: `${storyColors[colorKey]}06`,
      borderRadius: '0 10px 10px 0',
    }}>
      <div style={{ fontSize: 14, color: C.textDim, letterSpacing: 3, marginBottom: 6, fontWeight: 700 }}>{label}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 20, color: C.text, lineHeight: 1.6, padding: '4px 0 4px 22px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, top: 4, color: C.accent, fontWeight: 700, fontSize: 20 }}>›</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

const stepMeta = [
  { id: '01', tag: 'BASELINE GUIDANCE' },
  { id: '02', tag: 'SENSOR FUSION' },
  { id: '03', tag: 'CLOSED-LOOP AUTOPILOT' },
  { id: '04', tag: 'MONTE-CARLO RESULTS' },
]

function getContent(step) {
  switch (step) {
    case 0: return [
      {
        title: 'Classical Proportional Navigation — the starting point',
        subtitle: 'PN GUIDANCE · N = 3',
        imageSrc: '/images/guidance/step1.png',
        imageLabel: 'GNC-001',
        bullets: [
          <>Needed a <B>minimum-viable guidance law</B> to close the loop in simulation</>,
          <>Classical PN: <B>a_cmd = N · V_c · λ̇</B> with N = 3</>,
          <><B>Line-of-sight rate</B> computed in inertial frame to GPS target</>,
          <>Commands capped by <B>canard authority envelope</B> from ballistics</>,
        ],
        metrics: [{ label: 'GUIDANCE LAW', value: 'PN · N = 3' }, { label: 'IDEAL-SIM CEP', value: '< 5 m' }],
      },
      {
        title: 'Dispersion before guidance — the problem we\'re solving',
        subtitle: 'UNGUIDED SCATTER',
        imageSrc: '/images/guidance/step1_dispersion.png',
        imageLabel: 'GNC-001B',
        bullets: [
          <>Hit <B>CEP target</B> in idealised simulation across the firing envelope</>,
          <>Law <B>fails immediately</B> when driven by raw IMU/GPS</>,
          <>Noise amplified by <B>differentiating LOS</B> — motivates Step 02</>,
          <>PGK trajectory is <B>quasi-ballistic</B> with limited control authority</>,
        ],
      },
    ]
    case 1: return [
      {
        title: 'Tightly-coupled GPS+IMU Kalman filter',
        subtitle: '15-STATE EKF',
        imageSrc: '/images/guidance/step2.png',
        imageLabel: 'GNC-002',
        bullets: [
          <>Raw GPS at <B>~10 Hz</B> too slow for <B>1 kHz</B> autopilot loop</>,
          <><B>15-state EKF</B>: position, velocity, attitude quaternion, gyro bias, accel bias</>,
          <>IMU propagated at <B>1 kHz</B>, GPS pseudorange fused when available</>,
          <><B>Magnetometer</B> aids heading during low-dynamic phases</>,
          <>Post-setback <B>bias re-estimation</B> using known ballistic prior from MPM</>,
        ],
        metrics: [{ label: 'FILTER', value: '15-STATE EKF' }, { label: 'ATT ERR (1σ)', value: '< 0.3°' }],
      },
      {
        title: 'CEP histogram — guidance recovers with clean state',
        subtitle: 'ESTIMATION PERFORMANCE',
        imageSrc: '/images/guidance/step2_cep_hist.png',
        imageLabel: 'GNC-002B',
        bullets: [
          <>Position estimate stable through <B>2-second GPS dropouts</B></>,
          <>Attitude error <B>&lt; 0.3°</B> (1σ) through the full trajectory</>,
          <>Guidance now consumes a <B>clean, consistent state</B></>,
          <>PN law <B>recovers its simulated performance</B></>,
        ],
      },
    ]
    case 2: return [
      {
        title: 'Autopilot that respects the roll-decoupled airframe',
        subtitle: 'OUTER / INNER LOOP ARCHITECTURE',
        imageSrc: '/images/guidance/step3_correction.png',
        imageLabel: 'GNC-003',
        bullets: [
          <>Body spins at <B>~1100 rad/s</B>; nose is <B>Earth-locked</B> after arm-out</>,
          <><B>Two-loop architecture</B> — outer guidance at 100 Hz, inner canard at 1 kHz</>,
          <>Inner loop runs on the <B>de-spun nose</B>: roll-hold + pitch/yaw tracking</>,
          <>Command allocation respects <B>alternator-brake dynamics</B> (τ = 0.25 s)</>,
          <>Gains scheduled against <B>Mach</B> and <B>dynamic pressure</B></>,
        ],
        metrics: [{ label: 'ARCHITECTURE', value: 'OUTER / INNER' }, { label: 'MARGINS', value: '10 dB · 45°' }],
      },
    ]
    case 3: return 'results'
    default: return []
  }
}

function ResultsView() {
  return (
    <>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.textBright, marginTop: 8, marginBottom: 20 }}>
        Closed loop hits the spec — guided CEP inside 35–53 m band.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 24 }}>
        <div style={{
          background: '#f5f5f5', border: `1px solid ${C.border}`, borderRadius: 12,
          height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <img src="/images/guidance/step2_cep_hist.png" alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 12, letterSpacing: 2, color: C.textDim, fontWeight: 600 }}>MISS-DISTANCE HISTOGRAM</div>
        </div>
        <div style={{
          background: '#f5f5f5', border: `1px solid ${C.border}`, borderRadius: 12,
          height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <img src="/images/guidance/step3_correction.png" alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 12, letterSpacing: 2, color: C.textDim, fontWeight: 600 }}>CLOSED-LOOP CORRECTION PATH</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.6fr', gap: 14 }}>
        <StoryBlock label="CONFIGURATION" colorKey="driver" items={[
          <>Charge <B>7W</B> · target at <B>14.5 km</B> · n = 80 shots per case</>,
          <>MV, QE, wind and air-density sampled from <B>operational distributions</B></>,
          <>Full <B>6DOF</B> airframe, GPS+IMU sensors, EKF, closed-loop autopilot</>,
        ]} />
        <StoryBlock label="RESULT" colorKey="change" items={[
          <>Unguided CEP₅₀ <B>≈ 161 m</B> — dominated by MV error and wind</>,
          <>Guided CEP₅₀ <B>≈ 37–44 m</B> — inside the <B>35–53 m</B> spec band</>,
          <>Correction engages at apogee; canard bends <B>~320 m drift</B> back on target</>,
        ]} />
        <StoryBlock label="READ-ACROSS" colorKey="outcome" items={[
          <>Guidance, estimator, and airframe <B>validated as one flight loop</B></>,
          <>Dispersion reduction is <B>~4×</B> on CEP — matches published PGK expectations</>,
        ]} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'UNGUIDED CEP₅₀', value: '≈ 161 m' },
            { label: 'GUIDED CEP₅₀', value: '35–53 m' },
          ].map(m => (
            <div key={m.label} style={{
              background: '#f9f9f9', border: `1px solid ${C.border}`, borderRadius: 10,
              padding: '12px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 14, color: C.textDim, letterSpacing: 2.5, fontWeight: 700 }}>{m.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.accent, marginTop: 4 }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default function GuidanceControlTab() {
  const [activeStep, setActiveStep] = useState(0)

  const meta = stepMeta[activeStep]
  const content = getContent(activeStep)

  return (
    <div style={{ padding: 36 }}>
      {/* Intro */}
      <div style={{ ...panelStyle, marginBottom: 20, padding: '20px 28px' }}>
        <div style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
          Section 03 — Guidance & Control
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: C.textBright, marginBottom: 8 }}>
          From Textbook Law to Flight Autopilot
        </div>
        <div style={{ fontSize: 22, color: C.textDim, lineHeight: 1.6, maxWidth: 1100 }}>
          Guidance and control evolved in three steps. Classical guidance law, tightly-coupled state
          estimation, then a closed-loop autopilot that respects the roll-decoupled airframe.
        </div>
      </div>

      {/* Step selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
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
      <div style={{ ...panelStyle, padding: '12px 36px 36px' }}>
        <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `2px solid ${C.borderLight}` }}>
          <span style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700 }}>STEP {meta.id} — {meta.tag}</span>
        </div>

        {content === 'results' ? (
          <ResultsView />
        ) : (
          content.map((sec, i) => (
            <Section
              key={`${activeStep}-${i}`}
              title={sec.title}
              subtitle={sec.subtitle}
              bullets={sec.bullets}
              metrics={sec.metrics}
              imageSrc={sec.imageSrc}
              imageLabel={sec.imageLabel}
              flip={i % 2 === 0}
            />
          ))
        )}
      </div>
    </div>
  )
}
