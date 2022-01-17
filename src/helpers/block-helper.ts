import { DateTime } from 'luxon';
import { dolomite } from './web3';
import Logger from '../lib/logger';

const subgraphUrl = process.env.SUBGRAPH_URL;

let lastBlockTimestamp: DateTime = DateTime.fromSeconds(0);

export async function getBlockNumber(): Promise<number> {
  if (!subgraphUrl) {
    return Promise.reject(new Error('Subgraph URL not found'));
  }

  return fetch(subgraphUrl, {
    method: 'POST',
    body: JSON.stringify({
      query: '{ _meta { block { number } } }',
    }),
  })
    .then(response => response.json())
    .then((json: any) => json.data._meta.block.number)
    .catch(() => dolomite.web3.eth.getBlock('latest').then(block => block.number));
}

export async function getLatestBlockTimestamp(): Promise<DateTime> {
  try {
    const block = await dolomite.web3.eth.getBlock('latest');
    lastBlockTimestamp = DateTime.fromMillis(Number(block.timestamp) * 1000);
  } catch (error) {
    Logger.error({
      at: 'block-helper#getLatestBlockTimestamp',
      message: error.message,
      error,
    });
  }

  return lastBlockTimestamp;
}
