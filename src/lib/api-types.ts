import { Integer } from '@dolomite-exchange/dolomite-margin';

export interface ApiBalance {
  marketId: number;
  tokenAddress: string
  tokenSymbol: string
  par: Integer;
  wei: Integer;
  expiresAt?: Integer;
  expiryAddress?: string;
}

export interface ApiAccount {
  id: string;
  owner: string;
  number: string;
  balances: {
    [marketNumber: string]: ApiBalance;
  };
}

export interface ApiMarket {
  id: number
  tokenAddress: string
  oraclePrice: Integer
  marginPremium: Integer
  liquidationRewardPremium: Integer
}

export interface ApiRiskParam {
  liquidationRatio: Integer;
  liquidationReward: Integer;
}

export interface MarketIndex {
  marketId: number
  borrow: Integer
  supply: Integer
}
