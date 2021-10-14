import {
  ApiAccount,
  ApiMarket,
} from '@dolomite-exchange/v2-protocol';
import request from 'request-promise-native';

// TODO fix this file
export async function getLiquidatableDolomiteAccounts(): Promise<{ accounts: ApiAccount[] }> {
  const { accounts } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/accounts`,
    json: true,
    qs: {
      isLiquidatable: true,
    },
  });

  return { accounts };
}

export async function getExpiredAccounts(): Promise<{ accounts: ApiAccount[] }> {
  const { accounts } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/accounts`,
    json: true,
    qs: {
      isExpired: true,
    },
  });

  return { accounts };
}

export async function getDolomiteMarkets(): Promise<{ markets: ApiMarket[] }> {
  const { markets } = await request({
    method: 'GET',
    uri: `${process.env.DYDX_URL}/v1/markets`,
    json: true,
  });

  return { markets };
}
