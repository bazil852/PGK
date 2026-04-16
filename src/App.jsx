import { useState, useEffect } from 'react'
import { C, font } from './theme.js'
import MechanicalDesignTab from './tabs/MechanicalDesignTab.jsx'
import BallisticsTab from './tabs/BallisticsTab.jsx'
import GuidanceControlTab from './tabs/GuidanceControlTab.jsx'
import FlightSoftwareTab from './tabs/FlightSoftwareTab.jsx'

const TABS = [
  { id: 'mechanical', label: 'Mechanical Design' },
  { id: 'ballistics', label: 'Ballistics' },
  { id: 'guidance', label: 'Guidance & Control' },
  { id: 'software', label: 'Flight Software' },
]

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('mechanical')

  useEffect(() => {
    fetch('/trajectories.json')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(e.message))
  }, [])

  if (error) return <div style={{ color: C.fail, padding: 40, fontFamily: font }}>Error: {error}</div>
  if (!data) return (
    <div style={{ color: '#999', padding: 40, fontSize: 16, fontFamily: font,
      display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      Loading...
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5', fontFamily: font }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 36px', borderBottom: '2px solid #e5e5e5', background: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#FF6B35', letterSpacing: '0.5px' }}>
            ESFORGE
          </span>
          <span style={{ fontSize: 20, color: '#999' }}>
            Simulation Network
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? '#FF6B35' : 'transparent',
                border: 'none', borderRadius: 10,
                color: activeTab === tab.id ? '#fff' : '#555',
                padding: '12px 24px', fontSize: 20, fontFamily: font,
                cursor: 'pointer', transition: 'all 0.15s',
                fontWeight: activeTab === tab.id ? 700 : 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 18, color: '#999', fontWeight: 500 }}>
          PGK — M107 155mm
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'mechanical' && <MechanicalDesignTab />}
        {activeTab === 'ballistics' && <BallisticsTab />}
        {activeTab === 'guidance' && <GuidanceControlTab />}
        {activeTab === 'software' && <FlightSoftwareTab data={data} />}
      </div>
    </div>
  )
}
