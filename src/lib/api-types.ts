import { BigNumber } from '@dolomite-exchange/v2-protocol';

export interface ApiBalance {
  par: string;
  wei: string;
  expiresAt?: string;
  expiryAddress?: string;
}

export interface ApiAccount {
  owner: string;
  number: string;
  balances: {
    [marketNumber: string]: ApiBalance;
  };
}

export interface ApiMarket {
  id: number
  tokenAddress: string
  oraclePrice: string
  marginPremium: string
  liquidationRewardPremium: string
}

export interface MarketIndex {
  marketId: number
  borrow: BigNumber
  supply: BigNumber
}
