import type { Component } from 'vue'
import { Info, TriangleAlert, Users } from '@lucide/vue'
import type { NoteKind } from '#shared/utils/notes'

interface NoteKindLook {
  icon: Component
  /** Icon and label text */
  text: string
  /** Subtle surface for chips and the active editor control */
  surface: string
  /** Left rail of a task page section */
  rail: string
}

// The one definition of how a note kind looks. The colors mark the kind only, never a status.
// Full class names so Tailwind finds them when scanning.
const LOOKS: Record<NoteKind, NoteKindLook> = {
  meeting: { icon: Users, text: 'text-info', surface: 'bg-info-subtle', rail: 'border-l-info' },
  problem: { icon: TriangleAlert, text: 'text-destructive', surface: 'bg-error-subtle', rail: 'border-l-destructive' },
  info: { icon: Info, text: 'text-positive', surface: 'bg-success-subtle', rail: 'border-l-positive' },
}

export function noteKindLook(kind: NoteKind): NoteKindLook {
  return LOOKS[kind]
}
