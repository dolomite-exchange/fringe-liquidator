import {
  ApiAccount,
  ApiMarket,
} from '@dolomite-exchange/v2-protocol';
import fetch from 'node-fetch';

// TODO fix this file
export async function getLiquidatableDolomiteAccounts(): Promise<{ accounts: ApiAccount[] }> {
  const response: any = await fetch(`${process.env.SUBGRAPH_URL}`, {
    method: 'POST',
    body: JSON.stringify({
      query: `{
                marginAccounts(where: { hasBorrowedValue: true }) {
                  user {
                    id
                  }
                  accountNumber
                  tokenValues {
                    marketId
                    valuePar
                  }
                }
              }`,
      variables: null
    }),
    headers: {
      'content-type': 'application/json'
    }
  }).then(response => response.json());

  return { accounts: response['data']['marginAccounts'] };
}

export async function getExpiredAccounts(): Promise<{ accounts: ApiAccount[] }> {
  const response: any = await fetch(`${process.env.SUBGRAPH_URL}`, {
    method: 'POST',
    body: JSON.stringify({
      query: `{
                marginAccounts(where: { hasBorrowedValue: true, hasExpiration: true }) {
                  user {
                    id
                  }
                  accountNumber
                  tokenValues {
                    marketId
                    valuePar
                  }
                }
              }`,
      variables: null
    }),
    headers: {
      'content-type': 'application/json'
    }
  }).then(response => response.json());

  return { accounts: response['data']['marginAccounts'] };
}

export async function getDolomiteMarkets(): Promise<{ markets: ApiMarket[] }> {
  const { markets } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/markets`,
    json: true,
  });

  return { markets };
}
