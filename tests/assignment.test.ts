import { describe, expect, it } from 'vitest'
import { assignmentFromValue, assignmentValue } from '../app/utils/assignment'

describe('assignmentValue', () => {
  it('builds task:<id> for a task and account:<id> for a direct account booking', () => {
    expect(assignmentValue({ taskId: 12 })).toBe('task:12')
    expect(assignmentValue({ accountId: 3 })).toBe('account:3')
  })

  it('is empty without an assignment', () => {
    expect(assignmentValue({})).toBe('')
  })
})

describe('assignmentFromValue', () => {
  it('inverts assignmentValue', () => {
    expect(assignmentFromValue('task:12')).toEqual({ taskId: 12, accountId: null })
    expect(assignmentFromValue('account:3')).toEqual({ taskId: null, accountId: 3 })
  })

  it.each(['', 'a:3', 'k:3', 'task:0'])('gives no ids for "%s"', (value) => {
    expect(assignmentFromValue(value)).toEqual({ taskId: null, accountId: null })
  })
})
