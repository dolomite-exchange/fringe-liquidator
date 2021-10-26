import { BigNumber, Integer } from '@dolomite-exchange/v2-protocol';

export interface ApiBalance {
  marketId: number;
  tokenAddress: string
  tokenSymbol: string
  par: string;
  wei: string;
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
  oraclePrice: string
  marginPremium: string
  liquidationRewardPremium: string
}

export interface MarketIndex {
  marketId: number
  borrow: BigNumber
  supply: BigNumber
}
