// eslint-disable-next-line import/no-extraneous-dependencies
import BigNumber from 'bignumber.js';
import fetch from 'node-fetch';
import { ChainId } from '../lib/chain-id';
import Logger from '../lib/logger';

let lastPriceWei: string = process.env.INITIAL_GAS_PRICE_WEI as string;
let priorityFee: string | undefined;
let maxFeePerGas: string | undefined;

export async function updateGasPrice() {
  let response: { fast: BigNumber } | { priorityFee: BigNumber; maxFeePerGas: BigNumber };
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

  if ('fast' in response) {
    const multiplier = new BigNumber(process.env.GAS_PRICE_MULTIPLIER as string);
    const addition = new BigNumber(process.env.GAS_PRICE_ADDITION as string);
    const networkId = Number(process.env.NETWORK_ID)
    const base = networkId === ChainId.Ethereum ? 100_000_000 : 1_000_000_000;
    const totalWei = new BigNumber(response.fast)
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
  } else if ('priorityFee' in response) {
    priorityFee = response.priorityFee.toFixed();
    maxFeePerGas = response.maxFeePerGas.toFixed();
  } else {
    Logger.error({
      at: 'updateGasPrice',
      message: 'gas api did not return fast',
    });
  }
}

export function getGasPriceWei(): BigNumber {
  return new BigNumber(lastPriceWei);
}

export function getGasPriceWeiForEip1559(): { maxFeePerGas: BigNumber, priorityFee: BigNumber } | undefined {
  return maxFeePerGas && priorityFee
    ? { maxFeePerGas: new BigNumber(maxFeePerGas), priorityFee: new BigNumber(priorityFee) }
    : undefined
}

async function getGasPrices(): Promise<{ fast: BigNumber } | { priorityFee: BigNumber; maxFeePerGas: BigNumber }> {
  Logger.info({
    at: 'getGasPrices',
    message: 'Fetching gas prices',
  });

  const networkId = Number(process.env.NETWORK_ID);
  if (networkId === ChainId.Ethereum || networkId === ChainId.Rinkeby) {
    if (!process.env.GAS_REQUEST_API_KEY) {
      Logger.error({
        at: 'getGasPrices',
        message: 'No process.env.GAS_REQUEST_API_KEY set',
      });
      return Promise.reject(new Error('No process.env.GAS_REQUEST_API_KEY set!'));
    }

    return fetch('https://api.blocknative.com/gasprices/blockprices', {
      method: 'GET',
      timeout: Number(process.env.GAS_REQUEST_TIMEOUT_MS ?? 10000),
      headers: {
        Authorization: process.env.GAS_REQUEST_API_KEY,
      },
    })
      .then(response => response.json())
      .then(response => {
        const OneGweiInEther = new BigNumber('1000000000');
        const estimatedPriceObject = response?.blockPrices?.[0].estimatedPrices?.[0];
        return {
          priorityFee: new BigNumber(estimatedPriceObject.maxPriorityFeePerGas).times(OneGweiInEther),
          maxFeePerGas: new BigNumber(estimatedPriceObject.maxFeePerGas).times(OneGweiInEther),
        }
      });
  } else if (networkId === ChainId.Matic || networkId === ChainId.Mumbai) {
    const uri = networkId === ChainId.Matic
      ? 'https://gasstation-mainnet.matic.network/'
      : 'https://gasstation-mumbai.matic.today/';
    return fetch(uri, {
      method: 'GET',
      timeout: Number(process.env.GAS_REQUEST_TIMEOUT_MS ?? 10000),
    })
      .then(response => response.json());
  } else {
    const errorMessage = `Could not find network ID ${networkId}`;
    Logger.error({
      at: 'getGasPrices',
      message: errorMessage,
    });
    process.exit(-1);
    return Promise.reject(new Error(errorMessage));
  }
}
