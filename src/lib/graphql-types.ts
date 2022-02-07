export interface GraphqlAccountResult {
  data: {
    marginAccounts: GraphqlAccount[]
  }
}

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

export interface GraphqlMarketResult {
  data: {
    marketRiskInfos: GraphqlMarket[]
  }
}

export interface GraphqlMarket {
  id: string
  token: {
    id: string
    decimals: string
    marketId: string
  }
  marginPremium: string
  liquidationRewardPremium: string
}

export interface GraphqlRiskParamsResult {
  data: {
    dolomiteMargins: GraphqlRiskParams[]
  }
}

export interface GraphqlRiskParams {
  id: string
  liquidationRatio: string
  liquidationReward: string
}
