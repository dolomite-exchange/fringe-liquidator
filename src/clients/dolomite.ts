/* eslint-disable max-len */
import fetch from 'node-fetch';
import { BigNumber } from '@dolomite-exchange/dolomite-margin';
import { decimalToString } from '@dolomite-exchange/dolomite-margin/dist/src/lib/Helpers';
import {
  GraphqlAccount,
  GraphqlMarket,
  GraphqlRiskParams,
} from '../lib/graphql-types';
import {
  ApiAccount,
  ApiBalance,
  ApiMarket,
  ApiRiskParam,
  MarketIndex,
} from '../lib/api-types';
import { dolomite } from '../helpers/web3';

const subgraphUrl = process.env.SUBGRAPH_URL;

async function getAccounts(
  marketIds: number[],
  query: string,
  blockNumber: number,
): Promise<{ accounts: ApiAccount[] }> {
  const marketIndexPromises = marketIds.map<Promise<MarketIndex>>(async marketId => {
    const {
      borrow,
      supply,
    } = await dolomite.getters.getMarketCurrentIndex(new BigNumber(marketId), { blockNumber });
    return {
      marketId,
      borrow: new BigNumber(borrow),
      supply: new BigNumber(supply),
    }
  })

  const marketIndexMap = await Promise.all(marketIndexPromises)
    .then(marketIndices => marketIndices.reduce<{ [marketId: number]: MarketIndex }>((memo, marketIndex) => {
      memo[marketIndex.marketId] = marketIndex
      return memo
    }, {}))

  const decimalBase = new BigNumber('1000000000000000000');

  const accounts: any = await fetch(subgraphUrl, {
    method: 'POST',
    body: JSON.stringify({
      query,
      variables: {
        blockNumber,
      },
    }),
    headers: {
      'content-type': 'application/json',
    },
  })
    .then(response => response.json())
    .then((response: any) => {
      if (response.errors && typeof response.errors === 'object') {
        return Promise.reject(response.errors[0]);
      } else {
        return response.data.marginAccounts as GraphqlAccount[];
      }
    })
    .then(graphqlAccounts => graphqlAccounts.map<ApiAccount>(account => {
      const balances = account.tokenValues.reduce<{ [marketNumber: string]: ApiBalance }>((memo, value) => {
        const tokenBase = new BigNumber('10').pow(value.token.decimals)
        const valuePar = new BigNumber(value.valuePar).times(tokenBase)
        const indexObject = marketIndexMap[value.token.marketId]
        const index = (new BigNumber(valuePar).lt('0') ? indexObject.borrow : indexObject.supply).times(decimalBase)
        memo[value.token.marketId] = {
          marketId: Number(value.token.marketId),
          tokenSymbol: value.token.symbol,
          tokenAddress: value.token.id,
          par: valuePar,
          wei: new BigNumber(valuePar).times(index).div(decimalBase).integerValue(BigNumber.ROUND_HALF_UP),
          expiresAt: value.expirationTimestamp ? new BigNumber(value.expirationTimestamp) : null,
          expiryAddress: value.expiryAddress,
        }
        return memo
      }, {})
      return {
        id: `${account.user}-${account.accountNumber}`,
        owner: account.user,
        number: new BigNumber(account.accountNumber),
        balances,
      }
    }));

  return { accounts: accounts as ApiAccount[] };
}

export async function getLiquidatableDolomiteAccounts(
  marketIds: number[],
  blockNumber: number,
): Promise<{ accounts: ApiAccount[] }> {
  const query = `
            query getActiveMarginAccounts($blockNumber: Int) {
                marginAccounts(where: { hasBorrowedValue: true }, block: { number: $blockNumber }) {
                  id
                  user
                  accountNumber
                  tokenValues {
                    token {
                      id
                      marketId
                      decimals
                      symbol
                    }
                    valuePar
                    expirationTimestamp
                    expiryAddress
                  }
                }
              }`;
  return getAccounts(marketIds, query, blockNumber);
}

export async function getExpiredAccounts(
  marketIds: number[],
  blockNumber,
): Promise<{ accounts: ApiAccount[] }> {
  const query = `
            query getActiveMarginAccounts($blockNumber: Int) {
                marginAccounts(where: { hasBorrowedValue: true, hasExpiration: true }, block: { number: $blockNumber }) {
                  id
                  user
                  accountNumber
                  tokenValues {
                    token {
                      marketId
                      symbol
                      decimals
                    }
                    valuePar
                    expirationTimestamp
                    expiryAddress
                  }
                }
              }`;
  return getAccounts(marketIds, query, blockNumber);
}

export async function getDolomiteMarkets(blockNumber: number): Promise<{ markets: ApiMarket[] }> {
  const result: any = await fetch(subgraphUrl, {
    method: 'POST',
    body: JSON.stringify({
      query: `query getMarketRiskInfos($blockNumber: Int) {
                marketRiskInfos(orderBy: id, block: { number: $blockNumber }) {
                  id
                  token {
                    marketId
                    symbol
                    decimals
                  }
                  marginPremium
                  liquidationRewardPremium
                }
              }`,
      variables: {
        blockNumber,
      },
    }),
    headers: {
      'content-type': 'application/json',
    },
  }).then(response => response.json());

  if (result.errors && typeof result.errors === 'object') {
    // noinspection JSPotentiallyInvalidTargetOfIndexedPropertyAccess
    return Promise.reject(result.errors[0]);
  }

  /* eslint-disable */
  const markets = (result.data.marketRiskInfos as GraphqlMarket[])
    .map<Promise<ApiMarket>>(async market => {
      return {
        id: Number(market.id),
        tokenAddress: market.token.id,
        oraclePrice: await dolomite.getters.getMarketPrice(new BigNumber(market.id), { blockNumber }),
        marginPremium: new BigNumber(decimalToString(market.marginPremium)),
        liquidationRewardPremium: new BigNumber(decimalToString(market.liquidationRewardPremium)),
      };
    })
  /* eslint-enable */

  return { markets: await Promise.all(markets) };
}

export async function getDolomiteRiskParams(blockNumber: number): Promise<{ riskParams: ApiRiskParam }> {
  const result: any = await fetch(`${process.env.SUBGRAPH_URL}`, {
    method: 'POST',
    body: JSON.stringify({
      query: `query getDolomiteMargins($blockNumber: Int) {
        dolomiteMargins(block: { number: $blockNumber }) {
          liquidationRatio
          liquidationReward
        }
      }`,
      variables: {
        blockNumber,
      },
    }),
    headers: {
      'content-type': 'application/json',
    },
  }).then(response => response.json());

  if (result.errors && typeof result.errors === 'object') {
    // noinspection JSPotentiallyInvalidTargetOfIndexedPropertyAccess
    return Promise.reject(result.errors[0]);
  }

  // eslint-disable-next-line arrow-body-style
  const riskParams = (result.data.dolomiteMargins as GraphqlRiskParams[]).map<ApiRiskParam>(riskParam => {
    return {
      liquidationRatio: new BigNumber(decimalToString(riskParam.liquidationRatio)),
      liquidationReward: new BigNumber(decimalToString(riskParam.liquidationReward)),
    }
  })

  return { riskParams: riskParams[0] };
}
