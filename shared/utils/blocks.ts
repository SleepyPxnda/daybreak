import type { IsoDate } from './time'
import { isOnGrid, DAY_MIN } from './time'

export type BlockKind = 'work' | 'break'
export type BlockStatus = 'planned' | 'booked'

export interface TimeRange {
  start: number
  end: number
}

/** Minimal block view for the business logic. */
export interface BlockBasis extends TimeRange {
  id?: number
  date: IsoDate
  kind: BlockKind
  status: BlockStatus
}

export function duration(range: TimeRange): number {
  return range.end - range.start
}

/** Start < end, within the day, on the 15-minute grid. */
export function isValidRange(range: TimeRange): boolean {
  return isOnGrid(range.start) && isOnGrid(range.end) && range.start >= 0 && range.end <= DAY_MIN && range.start < range.end
}

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end
}

/** First block that the new one collides with (blocks with `ignoreId` are skipped). */
export function findOverlap<T extends TimeRange & { id?: number }>(
  blocks: T[],
  candidate: TimeRange,
  ignoreId?: number,
): T | undefined {
  return blocks.find(b => b.id !== ignoreId && overlaps(b, candidate))
}

/** After the last block of the day, otherwise from work start. */
export function nextFreeSlot(blocks: TimeRange[], workStart: number): number {
  if (blocks.length === 0) return workStart
  return Math.max(...blocks.map(b => b.end))
}

/** Actual time = sum of booked work blocks (breaks and planned never count). */
export function actualMinutes(blocks: Pick<BlockBasis, 'start' | 'end' | 'kind' | 'status'>[]): number {
  return blocks
    .filter(b => b.kind === 'work' && b.status === 'booked')
    .reduce((sum, b) => sum + duration(b), 0)
}

/** Planned work time (for "planned alongside"). */
export function plannedMinutes(blocks: Pick<BlockBasis, 'start' | 'end' | 'kind' | 'status'>[]): number {
  return blocks
    .filter(b => b.kind === 'work' && b.status === 'planned')
    .reduce((sum, b) => sum + duration(b), 0)
}

/** Splits a range at `at` (must lie strictly inside and on the grid). */
export function splitTimeRange(range: TimeRange, at: number): [TimeRange, TimeRange] | undefined {
  if (!isOnGrid(at) || at <= range.start || at >= range.end) return undefined
  return [{ start: range.start, end: at }, { start: at, end: range.end }]
}
