import { describe, expect, it } from 'vitest'
import type { AccountOrderFields } from '../shared/utils/accounts'
import { compareAccountOrder } from '../shared/utils/accounts'

function account(id: number, name: string, part: Partial<AccountOrderFields> = {}): AccountOrderFields {
  return { id, name, status: 'active', sortOrder: 0, ...part }
}

const sortedNames = (accounts: AccountOrderFields[]) => [...accounts].sort(compareAccountOrder).map(entry => entry.name)

describe('compareAccountOrder', () => {
  it('puts active accounts before archived ones, even with higher sortOrder and later name', () => {
    expect(sortedNames([account(1, 'Anton', { status: 'archived', sortOrder: 0 }), account(2, 'Zora', { sortOrder: 9 })])).toEqual(['Zora', 'Anton'])
  })

  it('falls back to the German name order for equal sortOrder', () => {
    expect(sortedNames([account(1, 'Zebra'), account(2, 'Äpfel'), account(3, 'Birne')])).toEqual(['Äpfel', 'Birne', 'Zebra'])
  })

  it('lets a lower sortOrder win over the name for active accounts', () => {
    expect(sortedNames([account(1, 'Anton', { sortOrder: 2 }), account(2, 'Zora', { sortOrder: 1 })])).toEqual(['Zora', 'Anton'])
  })

  it('ignores sortOrder of archived accounts and orders them by name', () => {
    expect(sortedNames([
      account(1, 'Zora', { status: 'archived', sortOrder: 1 }),
      account(2, 'Anton', { status: 'archived', sortOrder: 5 }),
    ])).toEqual(['Anton', 'Zora'])
  })

  it('breaks full ties by id', () => {
    const accounts = [account(2, 'Anton'), account(1, 'Anton')]
    expect([...accounts].sort(compareAccountOrder).map(entry => entry.id)).toEqual([1, 2])
  })
})
