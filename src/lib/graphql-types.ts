export interface AccountResult {
  data: Account[]
}

export interface Account {
  address: string
  lendingTokenAddress: string
  collateralTokenAddress: string
  totalOutstanding: string
  healthFactor: string
}
