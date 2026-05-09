import { useState } from 'react'
import api from '../../api/index.js'
import { serializeCanvas } from '../../canvas/serialize.js'
import { useUIStore } from '../../store/uiStore.js'

export function useArchAssist(fabricCanvasRef) {
  const [loading, setLoading] = useState(false)
  const setAssistResult = useUIStore(s => s.setAssistResult)

  async function run() {
    const fc = fabricCanvasRef.current
    if (!fc || loading) return

    const elements = serializeCanvas(fc)
    if (elements.length === 0) return

    setLoading(true)
    try {
      const dataURL = fc.toDataURL({ format:'png', quality:1, multiplier:1 })
      const imageBase64 = dataURL.split(',')[1]

      const elementLabels = elements.map(el => ({
        type: el.type,
        label: el.text || el.type
      }))

      const { data } = await api.post('/ai/assist', {
        imageBase64,
        elements: elementLabels
      })

      setAssistResult(data)
    } catch (err) {
      console.error('Assist failed:', err)
      alert('Analysis failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return { run, loading }
}
