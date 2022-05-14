/* eslint-disable max-len */
import BigNumber from 'bignumber.js';
import fetch from 'node-fetch';
import { ApiAccount } from '../lib/api-types';
import { AccountResult } from '../lib/graphql-types';

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

export async function getLiquidatableFringeAccounts(pageIndex: number): Promise<{ accounts: ApiAccount[] }> {
  if (pageIndex >= 1) {
    return Promise.resolve({ accounts: [] });
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
      return {
        id: `0x${account.address}`,
        owner: `0x${account.address}`,
        lendingTokenAddress: `0x${account.lendingTokenAddress}`,
        collateralTokenAddress: `0x${account.collateralTokenAddress}`,
        totalOutstanding: new BigNumber(account.totalOutstanding),
        healthFactor: new BigNumber(account.healthFactor),
      };
    }));

  return { accounts };
}
