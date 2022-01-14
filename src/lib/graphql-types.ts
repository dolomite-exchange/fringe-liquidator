export interface GraphqlTokenValue {
  token: {
    id: string
    marketId: string
    symbol: string
    decimals: string
  }
  valuePar: string
  expirationTimestamp?: string
  expiryAddress?: string
}

export interface GraphqlAddress {
  id: string
}

export interface GraphqlAccount {
  id: string
  user: GraphqlAddress
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
  liquidationRatio: string
  liquidationReward: string
}
