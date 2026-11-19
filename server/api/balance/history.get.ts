import { balanceHistory } from '#shared/utils/balance'
import { today } from '#shared/utils/time'

// Balance history: monthly delta + balance at month end since the start date
export default defineEventHandler(async () => {
  return balanceHistory(await loadBalanceInput(today(), await loadSettings()))
})
