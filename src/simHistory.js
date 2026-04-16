// Simulation history — localStorage-backed with pre-populated runs

const STORAGE_KEY = 'pgk_sim_history'
const SEEDED_KEY = 'pgk_sim_seeded_v2'

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DESIGNS_META = [
  { id: 1, name: 'Design 1 — Preliminary', shortName: 'D1 Preliminary' },
  { id: 2, name: 'Design 2 — Windtunnel-Corrected', shortName: 'D2 Windtunnel' },
  { id: 3, name: 'Design 3 — Sensor-Integrated', shortName: 'D3 Sensors' },
  { id: 4, name: 'Design 4 — G-Hardened', shortName: 'D4 Final' },
]

const PRESETS_META = [
  { name: 'Standard 7W', charge: '7W', mv: 568, qe: 500, target: 14500, wind: 3.2, windDir: 270, temp: 21, pressure: 1013 },
  { name: 'Low Charge 4G', charge: '4G', mv: 316, qe: 420, target: 7500, wind: 1.8, windDir: 180, temp: 15, pressure: 1010 },
  { name: 'Max Range Chg 8', charge: '8', mv: 684, qe: 550, target: 18200, wind: 5.1, windDir: 315, temp: 28, pressure: 1005 },
  { name: 'High Wind 5W', charge: '5W', mv: 397, qe: 480, target: 9500, wind: 8.4, windDir: 240, temp: 18, pressure: 1015 },
]

function generateRunResult(seed, designId, preset) {
  const rng = mulberry32(seed)

  const mvErr = (rng() - 0.5) * 2 * preset.mv * 0.012
  const windGust = (rng() - 0.5) * preset.wind * 0.6
  const crossWind = (rng() - 0.5) * 4
  const tempDelta = (rng() - 0.5) * 6

  const effWind = preset.wind + windGust
  const driftRate = 10 + effWind * 2.8 + Math.abs(crossWind) * 1.5
  const windBias = (preset.windDir - 270) / 90 * 25 + crossWind * 8
  const rangeScale = 1 + (mvErr / preset.mv) * 2.5

  // Unguided miss
  const baseRange = preset.target
  const uMissRange = windBias + baseRange * (rangeScale - 1)
  const uMissCross = driftRate * 0.3 * 33 * 0.7  // approximate drift at ~33s
  const uMiss = Math.round(Math.sqrt(uMissRange * uMissRange + uMissCross * uMissCross))

  // Guided miss depends on design
  let gMiss, status, flightTime
  flightTime = 28 + rng() * 8  // 28-36s

  switch (designId) {
    case 1:
      gMiss = Math.round(uMiss * (0.85 + rng() * 0.2))  // barely better than unguided
      status = 'FAIL — NO AUTHORITY'
      break
    case 2: {
      const corr = 0.35 + rng() * 0.35
      const dragPen = 0.03 + rng() * 0.02
      gMiss = Math.round(uMiss * (1 - corr) + rng() * 30)
      status = `PARTIAL — ${(corr * 100).toFixed(0)}% corr, ${(dragPen * 100).toFixed(1)}% drag loss`
      break
    }
    case 3: {
      const hasDropout = rng() > 0.3  // 70% chance of GPS issue
      const baseMiss = uMiss * 0.35 + rng() * 40
      gMiss = hasDropout ? Math.round(baseMiss + 20 + rng() * 60) : Math.round(baseMiss)
      status = hasDropout
        ? `GPS DROPOUT ${(10 + rng() * 15).toFixed(1)}s — bias ${((rng() - 0.5) * 40).toFixed(0)}m`
        : `NOMINAL — sensor noise ${(8 + rng() * 15).toFixed(0)}m RMS`
      break
    }
    case 4:
      gMiss = Math.round(15 + rng() * 40)  // 15-55m, mostly <50
      status = gMiss <= 50 ? 'HIT — WITHIN CEP' : 'MARGINAL — NEAR CEP BOUNDARY'
      break
    default:
      gMiss = uMiss
      status = 'UNKNOWN'
  }

  const success = gMiss <= 50 && designId === 4
  const improvement = uMiss / Math.max(gMiss, 1)

  return {
    uMiss, gMiss, status, success, improvement: improvement.toFixed(1),
    flightTime: flightTime.toFixed(1),
    perturbations: {
      mvError: mvErr.toFixed(1),
      windGust: windGust.toFixed(1),
      crossWind: crossWind.toFixed(1),
      tempDelta: tempDelta.toFixed(1),
    },
  }
}

function generateSeedRuns() {
  const runs = []
  const rng = mulberry32(20260101)
  // Base date: spread runs over last 3 months
  const now = Date.now()
  const threeMonths = 90 * 24 * 60 * 60 * 1000

  // Generate 36 historical runs with realistic distribution
  // Design 4 most tested (14 runs), Design 3 next (10), Design 2 (7), Design 1 (5)
  const schedule = [
    // Early phase — Design 1 & 2 testing
    ...Array(5).fill(1),
    ...Array(7).fill(2),
    // Mid phase — Design 3 sensor integration
    ...Array(10).fill(3),
    // Late phase — Design 4 qualification
    ...Array(14).fill(4),
  ]

  for (let i = 0; i < schedule.length; i++) {
    const designId = schedule[i]
    const preset = PRESETS_META[Math.floor(rng() * PRESETS_META.length)]
    const seed = Math.floor(rng() * 2147483647)
    const result = generateRunResult(seed, designId, preset)
    const age = threeMonths * (1 - i / schedule.length) + rng() * 2 * 24 * 60 * 60 * 1000
    const timestamp = now - age

    runs.push({
      id: `SIM-${String(i + 1).padStart(3, '0')}`,
      timestamp,
      date: new Date(timestamp).toISOString(),
      seed,
      designId,
      designName: DESIGNS_META.find(d => d.id === designId).shortName,
      preset: preset.name,
      charge: preset.charge,
      params: { ...preset },
      ...result,
    })
  }

  return runs.sort((a, b) => a.timestamp - b.timestamp)
}

export function loadHistory() {
  // Check if we've seeded
  const seeded = localStorage.getItem(SEEDED_KEY)
  let history = []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) history = JSON.parse(stored)
  } catch (e) {
    history = []
  }

  if (!seeded) {
    const seedRuns = generateSeedRuns()
    history = [...seedRuns, ...history]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    localStorage.setItem(SEEDED_KEY, 'true')
  }

  return history
}

export function saveRun(run) {
  const history = loadHistory()
  const newRun = {
    id: `SIM-${String(history.length + 1).padStart(3, '0')}`,
    timestamp: Date.now(),
    date: new Date().toISOString(),
    ...run,
  }
  history.push(newRun)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  return newRun
}

export function getHistory() {
  return loadHistory()
}

export function getStats() {
  const history = loadHistory()
  const total = history.length
  const byDesign = { 1: [], 2: [], 3: [], 4: [] }
  history.forEach(r => { if (byDesign[r.designId]) byDesign[r.designId].push(r) })

  const d4Runs = byDesign[4]
  const d4Hits = d4Runs.filter(r => r.success).length
  const d4Cep = d4Runs.length > 0 ? Math.round(d4Runs.reduce((s, r) => s + r.gMiss, 0) / d4Runs.length) : 0

  return {
    total,
    byDesign: Object.fromEntries(Object.entries(byDesign).map(([k, v]) => [k, v.length])),
    d4HitRate: d4Runs.length > 0 ? `${Math.round(d4Hits / d4Runs.length * 100)}%` : 'N/A',
    d4AvgCep: d4Cep,
    latestRun: history[history.length - 1],
  }
}
