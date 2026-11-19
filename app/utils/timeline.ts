import type { BlockKind, BlockStatus } from '#shared/utils/blocks'

/** Block as returned by GET /api/blocks (incl. display info). */
export interface TimelineBlock {
  id: number
  date: string
  start: number
  end: number
  kind: BlockKind
  status: BlockStatus
  taskId: number | null
  accountId: number | null
  note: string | null
  templateId: number | null
  taskKey: string | null
  taskTitle: string | null
  accountName: string | null
  accountColor: string | null
  templateName: string | null
}

/**
 * Task title (or key + title), otherwise account name; breaks are titled "Pause".
 * Appointments of named recurring blocks show the template name (e.g. "Daily").
 */
export function blockTitle(b: Pick<TimelineBlock, 'kind' | 'taskKey' | 'taskTitle' | 'accountName' | 'templateName'>): string {
  if (b.kind === 'break') return 'Pause'
  if (b.templateName) return b.templateName
  if (b.taskTitle) return b.taskKey ? `${b.taskKey} ${b.taskTitle}` : b.taskTitle
  return b.accountName ?? '–'
}

/** MIME types for drag & drop onto the timeline */
export const DRAG_TASK = 'application/x-daybreak-task'
export const DRAG_REMINDER = 'application/x-daybreak-reminder'

// --- Zoom & shift ---------------------------------------------------

/** Visible range of the timeline in minutes since midnight */
export interface View {
  from: number
  to: number
}

export const VIEW_MIN_SPAN = 60
export const VIEW_MAX_SPAN = 24 * 60

/** Shifts the view by `delta` minutes without leaving the day (0-24 h). */
export function shiftView(view: View, delta: number): View {
  const span = view.to - view.from
  const from = Math.min(Math.max(view.from + delta, 0), VIEW_MAX_SPAN - span)
  return { from, to: from + span }
}

/**
 * Zooms by `factor` (< 1 in, > 1 out) so that the minute `anchor` stays at the same screen position.
 * The span is limited to 1 h ... 24 h.
 */
export function zoomView(view: View, factor: number, anchor: number): View {
  const span = view.to - view.from
  const newSpan = Math.min(Math.max(span * factor, VIEW_MIN_SPAN), VIEW_MAX_SPAN)
  const share = (anchor - view.from) / span
  return shiftView({ from: anchor - share * newSpan, to: anchor - share * newSpan + newSpan }, 0)
}

/** Spacing of the scale lines depending on the zoom level */
export function scaleStep(span: number): number {
  if (span <= 180) return 15
  if (span <= 480) return 30
  return 60
}
