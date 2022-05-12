/* eslint-disable max-len */
import BigNumber from 'bignumber.js';
import fetch from 'node-fetch';
import { ApiAccount } from '../lib/api-types';
import { AccountResult } from '../lib/graphql-types';

export async function getLiquidatableDolomiteAccounts(): Promise<{ accounts: ApiAccount[] }> {
  const accounts: ApiAccount[] = await fetch('https://api.fringe.fi/api/v1/liquidations', {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
    },
  })
    .then(response => response.json())
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
