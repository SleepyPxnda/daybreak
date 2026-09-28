import { describe, expect, it } from 'vitest'
import { skalenSchritt, verschiebeSicht, zoomeSicht } from '../app/utils/timeline'

describe('Timeline-Sicht', () => {
  it('verschiebt innerhalb des Tages', () => {
    expect(verschiebeSicht({ von: 420, bis: 1140 }, 60)).toEqual({ von: 480, bis: 1200 })
    expect(verschiebeSicht({ von: 420, bis: 1140 }, -600)).toEqual({ von: 0, bis: 720 })
    expect(verschiebeSicht({ von: 420, bis: 1140 }, 600)).toEqual({ von: 720, bis: 1440 })
  })

  it('zoomt um den Anker, der an derselben Stelle bleibt', () => {
    const sicht = zoomeSicht({ von: 480, bis: 1080 }, 0.5, 600) // Anker bei 20 % der Breite
    expect(sicht.bis - sicht.von).toBe(300)
    expect((600 - sicht.von) / (sicht.bis - sicht.von)).toBeCloseTo(0.2)
  })

  it('begrenzt die Spanne auf 1 h … 24 h', () => {
    expect(zoomeSicht({ von: 540, bis: 600 }, 0.5, 570)).toEqual({ von: 540, bis: 600 })
    expect(zoomeSicht({ von: 0, bis: 1200 }, 2, 600)).toEqual({ von: 0, bis: 1440 })
  })

  it('bleibt beim Rauszoomen am Tagesrand im Tag', () => {
    const sicht = zoomeSicht({ von: 1320, bis: 1440 }, 3, 1440)
    expect(sicht).toEqual({ von: 1080, bis: 1440 })
  })

  it('wählt feinere Skala beim Reinzoomen', () => {
    expect(skalenSchritt(720)).toBe(60)
    expect(skalenSchritt(300)).toBe(30)
    expect(skalenSchritt(120)).toBe(15)
  })
})
