import { useState } from 'react'
import { C, font, panelStyle } from '../theme.js'

const B = ({ children }) => <strong style={{ fontWeight: 700, color: C.textBright }}>{children}</strong>

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

const stepMeta = [
  { id: '01', tag: 'REAL-TIME SCHEDULER' },
  { id: '02', tag: 'ACTUATOR INNER LOOP' },
  { id: '03', tag: 'DISTURBANCE OBSERVER' },
]

function getContent(step) {
  switch (step) {
    case 0: return [
      {
        title: 'Deadlines first — everything else hangs off the clock',
        subtitle: 'MULTI-RATE TIMING · 10 ms WINDOW',
        imageSrc: '/images/flight_software/fs1_scheduling.png',
        imageLabel: 'FS-001',
        bullets: [
          <>Inner canard loop needs <B>millisecond-grade response</B>; GPS only arrives at 10 Hz</>,
          <>Three fixed-rate tasks — <B>1 kHz</B> inner, <B>100 Hz</B> guidance, <B>10 Hz</B> nav</>,
          <><B>Rate-monotonic priorities</B>; each task has bounded WCET inside its period</>,
          <>Shared state via <B>single-writer/single-reader ring buffers</B> — no locks on hot path</>,
          <>No OS, no heap, no dynamic allocation inside the flight loop</>,
        ],
        metrics: [{ label: 'INNER LOOP', value: '1 kHz · ±25 µs' }, { label: 'CPU BUDGET', value: '41% / 70%' }],
      },
    ]
    case 1: return [
      {
        title: 'Close the loop on the actuator, not on a rigid body',
        subtitle: 'CASCADE PI · STEP RESPONSE',
        imageSrc: '/images/flight_software/fs2_autopilot_step.png',
        imageLabel: 'FS-002',
        bullets: [
          <>Nose-frame actuator is a <B>PMSM alternator</B> — τ_alt = K_t · i_load, i_load ≤ 8 A</>,
          <><B>Cascade PI</B> — outer position K_p = 80, inner velocity K_p = 2.0, K_i = 50</>,
          <>Integrator clamped to <B>instantaneous current limit</B> — no latent wind-up</>,
          <>Velocity command saturated at <B>ω_ref = VSF · |î_d|</B>, VSF = 26 rad/(A·s)</>,
          <>Power bus stays inside <B>~2.4 kW</B> peak; sustained pull 100–300 W</>,
        ],
        metrics: [{ label: 'SETTLING', value: '≈ 130 ms' }, { label: 'PEAK CURRENT', value: '4 A / 8 A' }],
      },
    ]
    case 2: return [
      {
        title: 'Learn the load in flight — scale authority accordingly',
        subtitle: 'DOB · AERO + FRICTION TRACKING',
        imageSrc: '/images/flight_software/fs3_dob_tracking.png',
        imageLabel: 'FS-003',
        bullets: [
          <>Aero damping and bearing friction vary <B>10×</B> between launch and apogee</>,
          <>DOB: residual between commanded and inferred torque, filtered through <B>Q(s) = 1/(τ_f·s+1)</B>, τ_f = 0.5 s</>,
          <>Output <B>î_d</B> = equivalent disturbance current (τ_aero + τ_friction) / K_t</>,
          <>Feeds <B>integrator clamp</B> and <B>velocity saturation</B> — both scaled as 2·|î_d|</>,
          <>Same gain set works across <B>all 11 charges</B> and full QE range</>,
        ],
        metrics: [{ label: 'FILTER', value: 'τ_f = 0.5 s' }, { label: 'ADAPTATION', value: 'ON-LINE' }],
      },
    ]
    default: return []
  }
}

export default function FlightSoftwareTab() {
  const [activeStep, setActiveStep] = useState(0)
  const content = getContent(activeStep)
  const meta = stepMeta[activeStep]

  return (
    <div style={{ padding: 36 }}>
      {/* Intro */}
      <div style={{ ...panelStyle, marginBottom: 20, padding: '20px 28px' }}>
        <div style={{ fontSize: 16, color: C.accent, letterSpacing: 3, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
          Section 04 — Flight Software
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: C.textBright, marginBottom: 8 }}>
          The Loop That Has to Run — Every Millisecond
        </div>
        <div style={{ fontSize: 22, color: C.textDim, lineHeight: 1.6, maxWidth: 1100 }}>
          Flight software is everything between the estimator and the canards: scheduling, actuator
          control, and on-line compensation. It makes guidance intent physically real against a spinning
          airframe with a finite, power-limited canard actuator.
        </div>
      </div>

      {/* Step selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
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

        {content.map((sec, i) => (
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
        ))}
      </div>
    </div>
  )
}
