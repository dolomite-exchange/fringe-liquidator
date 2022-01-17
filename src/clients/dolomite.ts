/* eslint-disable no-shadow,max-len */
import { BigNumber } from '@dolomite-exchange/dolomite-margin'
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

// @ts-ignore
// Needed because of the "cannot use import statement outside a module" error
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function getAccounts(marketIds: number[], query: string): Promise<{ accounts: ApiAccount[] }> {
  // noinspection UnnecessaryLocalVariableJS
  const blockNumber = await fetch('', {
    method: 'POST',
    body: JSON.stringify({
      query: '{ _meta { block { number } } }',
    }),
  })
    .then(response => response.json())
    .then((json: any) => json.data._meta.block.number)
    .catch(() => 'latest')

  dolomite.web3.eth.defaultBlock = blockNumber

  const marketIndexPromises = marketIds.map<Promise<MarketIndex>>(async marketId => {
    const {
      borrow,
      supply,
    } = await dolomite.getters.getMarketCurrentIndex(new BigNumber(marketId));
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

  const accounts: any = await fetch(`${process.env.SUBGRAPH_URL}`, {
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
    .then((response: any) => response.data.marginAccounts as GraphqlAccount[])
    .then(graphqlAccounts => graphqlAccounts.map<ApiAccount>(account => {
      const balances = account.tokenValues.reduce<{ [marketNumber: string]: ApiBalance }>((memo, value) => {
        const tokenBase = new BigNumber('10').pow(value.token.decimals)
        const valuePar = new BigNumber(value.valuePar).times(tokenBase)
        const indexObject = marketIndexMap[value.token.marketId]
        const index = new BigNumber(valuePar).lt('0') ? indexObject.borrow : indexObject.supply
        memo[value.token.marketId] = {
          marketId: Number(value.token.marketId),
          tokenSymbol: value.token.symbol,
          tokenAddress: value.token.id,
          par: valuePar,
          wei: new BigNumber(valuePar).times(index).div('1000000000000000000').integerValue(BigNumber.ROUND_HALF_UP),
          expiresAt: value.expirationTimestamp ? new BigNumber(value.expirationTimestamp) : undefined,
          expiryAddress: value.expiryAddress,
        }
        return memo
      }, {})
      return {
        id: `${account.user.id}-${account.accountNumber}`,
        owner: account.user.id,
        number: new BigNumber(account.accountNumber),
        balances,
      }
    }));

  return { accounts: accounts as ApiAccount[] };
}

export async function getLiquidatableDolomiteAccounts(
  marketIds: number[],
): Promise<{ accounts: ApiAccount[] }> {
  const query = `
            query getActiveMarginAccounts($blockNumber: Int) {
                marginAccounts(where: { hasBorrowedValue: true }, block: { number: $blockNumber }) {
                  id
                  user {
                    id
                  }
                  accountNumber
                  tokenValues {
                    token {
                      marketId
                      decimals
                    }
                    valuePar
                    expirationTimestamp
                    expiryAddress
                  }
                }
              }`
  return getAccounts(marketIds, query)
}

export async function getExpiredAccounts(
  marketIds: number[],
): Promise<{ accounts: ApiAccount[] }> {
  const query = `
            query getActiveMarginAccounts($blockNumber: Int) {
                marginAccounts(where: { hasBorrowedValue: true, hasExpiration: true }, block: { number: $blockNumber }) {
                  id
                  user {
                    id
                  }
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
              }`
  return getAccounts(marketIds, query)
}

export async function getDolomiteMarkets(): Promise<{ markets: ApiMarket[] }> {
  const { data }: any = await fetch(`${process.env.SUBGRAPH_URL}`, {
    method: 'POST',
    body: JSON.stringify({
      query: `{
                marketRiskInfos(orderBy: id) {
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
      variables: null,
    }),
    headers: {
      'content-type': 'application/json',
    },
  }).then(response => response.json());

  /* eslint-disable */
  const markets = (data.marketRiskInfos as GraphqlMarket[])
    .map<Promise<ApiMarket>>(async market => {
      return {
        id: Number(market.id),
        tokenAddress: market.token.id,
        oraclePrice: await dolomite.getters.getMarketPrice(new BigNumber(market.id)),
        marginPremium: new BigNumber(decimalToString(market.marginPremium)),
        liquidationRewardPremium: new BigNumber(decimalToString(market.liquidationRewardPremium)),
      };
    })
  /* eslint-enable */

  return { markets: await Promise.all(markets) };
}

export async function getDolomiteRiskParams(): Promise<{ riskParam: ApiRiskParam }> {
  const { data }: any = await fetch(`${process.env.SUBGRAPH_URL}`, {
    method: 'POST',
    body: JSON.stringify({
      query: `{
        dolomiteMargins {
          liquidationRatio
          liquidationReward
        }
      }`,
      variables: null,
    }),
    headers: {
      'content-type': 'application/json',
    },
  }).then(response => response.json());

  // eslint-disable-next-line arrow-body-style
  const riskParams = (data.marketRiskInfos as GraphqlRiskParams[]).map<ApiRiskParam>(riskParam => {
    return {
      liquidationRatio: new BigNumber(decimalToString(riskParam.liquidationRatio)),
      liquidationReward: new BigNumber(decimalToString(riskParam.liquidationReward)),
    }
  })

  return { riskParam: riskParams[0] };
}
