import { useUIStore } from '../../store/uiStore.js'
import api from '../../api/index.js'
import { serializeCanvas } from '../../canvas/serialize.js'

export function useCleanup(fabricCanvasRef) {
  const cleanupLoading = useUIStore(state => state.cleanupLoading)
  const setCleanupLoading = useUIStore(state => state.setCleanupLoading)

  async function run() {
    const fc = fabricCanvasRef.current
    if (!fc || cleanupLoading) return

    const elements = serializeCanvas(fc)
    if (elements.length === 0) return

    setCleanupLoading(true)
    try {
      const objects = elements
        .filter(el => el.type !== 'arrow' && el.type !== 'line')
        .map(el => ({
          id: el.id,
          type: el.type,
          label: el.text || el.type,
          x: el.x, y: el.y,
          width: el.width, height: el.height
        }))

      const { data } = await api.post('/ai/cleanup', { objects })

      // Build position lookup
      const posMap = {}
      data.layout.forEach(l => { posMap[l.id] = { x: l.x, y: l.y } })

      // Record where every object starts
      const startPos = {}
      fc.getObjects().forEach(obj => {
        if (obj.id && posMap[obj.id]) {
          startPos[obj.id] = { x: obj.left, y: obj.top }
        }
      })

      // Animate 700ms ease-in-out
      const duration = 700
      const t0 = performance.now()

      function frame(now) {
        const raw = Math.min((now - t0) / duration, 1)
        // ease in-out quad
        const ease = raw < 0.5
          ? 2 * raw * raw
          : 1 - Math.pow(-2 * raw + 2, 2) / 2

        fc.getObjects().forEach(obj => {
          if (!obj.id || !posMap[obj.id] || !startPos[obj.id]) return
          obj.set({
            left: startPos[obj.id].x + (posMap[obj.id].x - startPos[obj.id].x) * ease,
            top:  startPos[obj.id].y + (posMap[obj.id].y - startPos[obj.id].y) * ease,
          })
          obj.setCoords()
        })
        fc.requestRenderAll()

        if (raw < 1) requestAnimationFrame(frame)
        else {
          // Animation done: take snapshot and sync to collaborators
          fc.fire('object:modified')
        }
      }
      requestAnimationFrame(frame)

    } catch (err) {
      console.error('Cleanup failed:', err)
      alert('Cleanup failed. Try again.')
    } finally {
      setCleanupLoading(false)
    }
  }

  return { run, loading: cleanupLoading }
}
