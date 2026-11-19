import { describe, expect, it } from 'vitest'
import {
  findOverlap,
  plannedMinutes,
  isValidRange,
  actualMinutes,
  nextFreeSlot,
  splitTimeRange,
  overlaps,
} from '../shared/utils/blocks'
import type { BlockBasis } from '../shared/utils/blocks'

const b = (start: number, end: number, extra: Partial<BlockBasis> = {}): BlockBasis =>
  ({ date: '2026-09-28', kind: 'work', status: 'booked', start, end, ...extra })

describe('ranges', () => {
  it('checks validity', () => {
    expect(isValidRange({ start: 540, end: 600 })).toBe(true)
    expect(isValidRange({ start: 600, end: 600 })).toBe(false)
    expect(isValidRange({ start: 540, end: 550 })).toBe(false)
    expect(isValidRange({ start: 1380, end: 1455 })).toBe(false)
  })

  it('detects overlap, touching edges is allowed', () => {
    expect(overlaps({ start: 540, end: 600 }, { start: 585, end: 660 })).toBe(true)
    expect(overlaps({ start: 540, end: 600 }, { start: 600, end: 660 })).toBe(false)
  })

  it('ignores the block itself when moving', () => {
    const blocks = [{ ...b(540, 600), id: 1 }, { ...b(600, 660), id: 2 }]
    expect(findOverlap(blocks, { start: 555, end: 600 }, 1)).toBeUndefined()
    expect(findOverlap(blocks, { start: 555, end: 615 }, 1)?.id).toBe(2)
  })

  it('splits only inside the range and on the grid', () => {
    expect(splitTimeRange({ start: 540, end: 660 }, 600)).toEqual([{ start: 540, end: 600 }, { start: 600, end: 660 }])
    expect(splitTimeRange({ start: 540, end: 660 }, 540)).toBeUndefined()
    expect(splitTimeRange({ start: 540, end: 660 }, 610)).toBeUndefined()
  })
})

describe('nextFreeSlot', () => {
  it('without blocks: work start', () => {
    expect(nextFreeSlot([], 480)).toBe(480)
  })

  it('otherwise after the last block', () => {
    expect(nextFreeSlot([b(540, 600), b(780, 840), b(600, 660)], 480)).toBe(840)
  })
})

describe('actual/planned', () => {
  it('counts only booked work as actual', () => {
    const blocks = [
      b(480, 720),
      b(720, 750, { kind: 'break' }),
      b(750, 900, { status: 'planned' }),
    ]
    expect(actualMinutes(blocks)).toBe(240)
    expect(plannedMinutes(blocks)).toBe(150)
  })
})
