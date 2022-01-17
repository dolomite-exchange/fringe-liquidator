import request from 'request-promise-native';
import Logger from './logger';
import { ChainId } from './ChainId';

let lastPrice = process.env.GAS_INITIAL_PRICE;

/**
 * the gas price returned from the API gives the gas prices by `gwei * 10` for some reason. So, we multiply by 1e8,
 * instead of 1e9
 */
export async function updateGasPrice() {
  let response;
  try {
    response = await getGasPrices();
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
  const totalWei = `${Math.round((Number(fast) * multiplier * base) + addition)}`;

  Logger.info({
    at: 'updateGasPrice',
    message: 'Updating gas price',
    gasPrice: totalWei,
  });

  lastPrice = totalWei;
}

export function getGasPrice() {
  return lastPrice;
}

async function getGasPrices() {
  Logger.info({
    at: 'getGasPrices',
    message: 'Fetching gas prices',
  });

  const networkId = Number(process.env.NETWORK_ID);
  let uri: string;
  if (networkId === ChainId.Matic) {
    uri = 'https://gasstation-mainnet.matic.network/';
  } else if (networkId === ChainId.Mumbai) {
    uri = 'https://gasstation-mumbai.matic.today/';
  } else if (networkId === ChainId.Arbitrum) {
    return Promise.reject(new Error('Could not find URL for Arbitrum'));
  } else if (networkId === ChainId.ArbitrumTest) {
    return Promise.reject(new Error('Could not find URL for Arbitrum Test'));
  } else {
    return Promise.reject(new Error(`Could not find network ID ${networkId}`));
  }

  const response = await request({
    uri,
    method: 'GET',
    timeout: process.env.GAS_REQUEST_TIMEOUT_MS,
  });
  return JSON.parse(response);
}
