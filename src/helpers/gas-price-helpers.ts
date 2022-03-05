import { BigNumber, DolomiteMargin, Integer } from '@dolomite-exchange/dolomite-margin';
import request from 'request-promise-native';
import { ChainId } from '../lib/chain-id';
import Logger from '../lib/logger';

let lastPriceWei: string = process.env.INITIAL_GAS_PRICE_WEI;

export async function updateGasPrice(dolomite: DolomiteMargin) {
  let response;
  try {
    response = await getGasPrices(dolomite);
  } catch (error) {
    Logger.error({
      at: 'getGasPrices',
      message: 'Failed to retrieve gas prices',
      error,
    });
    return;
  }

  const { fast } = response;
  if (!fast) {
    Logger.error({
      at: 'updateGasPrice',
      message: 'gas api did not return fast',
    });
    return;
  }

  const multiplier = Number(process.env.GAS_PRICE_MULTIPLIER);
  if (Number.isNaN(multiplier)) {
    throw new Error('GAS_PRICE_MULTIPLIER not specified');
  }

  const addition = Number(process.env.GAS_PRICE_ADDITION || 0);
  if (Number.isNaN(addition)) {
    throw new Error('GAS_PRICE_ADDITION is invalid');
  }

  const networkId = Number(process.env.NETWORK_ID)
  const base = networkId === ChainId.Ethereum ? 100_000_000 : 1_000_000_000;
  const totalWei = new BigNumber(fast)
    .times(base)
    .times(multiplier)
    .plus(addition)
    .toFixed(0);

  Logger.info({
    at: 'updateGasPrice',
    message: 'Updating gas price',
    gasPrice: totalWei,
  });

  lastPriceWei = totalWei;
}

export function getGasPriceWei(): Integer {
  return new BigNumber(lastPriceWei);
}

async function getGasPrices(dolomite: DolomiteMargin): Promise<{ fast: string }> {
  Logger.info({
    at: 'getGasPrices',
    message: 'Fetching gas prices',
  });

  const networkId = Number(process.env.NETWORK_ID);
  if (networkId === ChainId.Matic || networkId === ChainId.Mumbai) {
    const uri = networkId === ChainId.Matic
      ? 'https://gasstation-mainnet.matic.network/'
      : 'https://gasstation-mumbai.matic.today/';
    const response = await request({
      uri,
      method: 'GET',
      timeout: process.env.GAS_REQUEST_TIMEOUT_MS,
    });
    return JSON.parse(response);
  } else if (networkId === ChainId.Arbitrum || networkId === ChainId.ArbitrumTest) {
    const result = await dolomite.arbitrumGasInfo.getPricesInWei();
    return {
      fast: result.perArbGasTotal.dividedBy('1000000000').toFixed(), // convert to gwei
    };
  } else {
    return Promise.reject(new Error(`Could not find network ID ${networkId}`));
  }
}
