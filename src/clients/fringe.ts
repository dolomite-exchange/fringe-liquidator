/* eslint-disable max-len */
import BigNumber from 'bignumber.js';
import fetch from 'node-fetch';
import { ApiAccount } from '../lib/api-types';
import { AccountResult } from '../lib/graphql-types';
import PriceStore from '../lib/price-store';

const OneEthInWei = new BigNumber('1000000000000000000');
const LiquidationReward = new BigNumber('0.06'); // 6%

/**
 * This is an `export const` so it can be mocked easily for testing
 */
export const getLiquidatableFringeAccountsFromNetwork = async (): Promise<any> => {
  return fetch('https://api.fringe.fi/api/v1/liquidations', {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
    },
  })
    .then(response => response.json())
}

export async function getLiquidatableFringeAccounts(
  pageIndex: number,
  priceMap: Record<string, BigNumber | undefined>,
): Promise<{ accounts: ApiAccount[] }> {
  if (pageIndex >= 1) {
    return Promise.resolve({ accounts: [] });
  }

  const ethPrice = priceMap[PriceStore.ETH];
  if (!ethPrice) {
    return Promise.reject(new Error('ETH price was not found in map!'));
  }

  const accounts: ApiAccount[] = await getLiquidatableFringeAccountsFromNetwork()
    .then((response: any) => {
      if (response.errors && typeof response.errors === 'object') {
        return Promise.reject((response.errors as any)[0]);
      } else {
        return (response as AccountResult).data;
      }
    })
    .then(accountsResult => accountsResult.map<ApiAccount>(account => {
      const totalDebt = new BigNumber(account.totalOutstanding);
      return {
        id: `0x${account.address}`,
        owner: `0x${account.address}`,
        lendingTokenAddress: `0x${account.lendingTokenAddress}`,
        collateralTokenAddress: `0x${account.collateralTokenAddress}`,
        totalOutstanding: totalDebt,
        healthFactor: new BigNumber(account.healthFactor),
        liquidationRewardGasToken: totalDebt.times(LiquidationReward).div(ethPrice).times(OneEthInWei),
      };
    }));

  return { accounts };
}
