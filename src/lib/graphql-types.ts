export interface GraphqlTokenValue {
  token: {
    id: string
    marketId: string
    symbol: string
    decimals: string
  }
  valuePar: string
  expirationTimestamp: string | null
  expiryAddress: string | null
}

export interface GraphqlAccount {
  id: string
  user: string
  accountNumber: string
  tokenValues: GraphqlTokenValue[]
}

export interface GraphqlMarket {
  id: string
  token: {
    id: string
    decimals: string
  }
  marginPremium: string
  liquidationRewardPremium: string
}

export interface GraphqlRiskParams {
  id: string
  liquidationRatio: string
  liquidationReward: string
}
