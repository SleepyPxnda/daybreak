import { describe, expect, it } from 'vitest'
import { blockTitle, scaleStep, shiftView, zoomView } from '../app/utils/timeline'

describe('blockTitle', () => {
  const basis = { kind: 'arbeit' as const, taskKey: null, taskTitle: null, accountName: 'Firmenmeeting', templateName: null }

  it('template name takes precedence over task/account, break stays a break', () => {
    expect(blockTitle({ ...basis, templateName: 'Daily' })).toBe('Daily')
    expect(blockTitle({ ...basis, taskKey: 'P-1', taskTitle: 'Login' })).toBe('P-1 Login')
    expect(blockTitle(basis)).toBe('Firmenmeeting')
    expect(blockTitle({ ...basis, kind: 'pause', templateName: 'Mittag' })).toBe('Pause')
  })
})

describe('timeline view', () => {
  it('pans within the day', () => {
    expect(shiftView({ from: 420, to: 1140 }, 60)).toEqual({ from: 480, to: 1200 })
    expect(shiftView({ from: 420, to: 1140 }, -600)).toEqual({ from: 0, to: 720 })
    expect(shiftView({ from: 420, to: 1140 }, 600)).toEqual({ from: 720, to: 1440 })
  })

  it('zooms around the anchor, which stays in place', () => {
    const view = zoomView({ from: 480, to: 1080 }, 0.5, 600) // anchor at 20% of the width
    expect(view.to - view.from).toBe(300)
    expect((600 - view.from) / (view.to - view.from)).toBeCloseTo(0.2)
  })

  it('limits the span to 1h ... 24h', () => {
    expect(zoomView({ from: 540, to: 600 }, 0.5, 570)).toEqual({ from: 540, to: 600 })
    expect(zoomView({ from: 0, to: 1200 }, 2, 600)).toEqual({ from: 0, to: 1440 })
  })

  it('stays within the day when zooming out at the day edge', () => {
    const view = zoomView({ from: 1320, to: 1440 }, 3, 1440)
    expect(view).toEqual({ from: 1080, to: 1440 })
  })

  it('picks a finer scale when zooming in', () => {
    expect(scaleStep(720)).toBe(60)
    expect(scaleStep(300)).toBe(30)
    expect(scaleStep(120)).toBe(15)
  })
})
