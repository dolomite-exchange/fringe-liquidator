import { DateTime } from 'luxon';
import { ApiMarket } from './api-types';
import { getDolomiteMarkets } from '../clients/dolomite';
import { delay } from './delay';
import Logger from './logger';
import {
  getSubgraphBlockNumber,
} from '../helpers/block-helper';

export default class MarketStore {
  private blockNumber: number;
  private blockTimestamp: DateTime;
  private dolomiteMarkets: ApiMarket[];

  constructor() {
    this.blockNumber = 0;
    this.dolomiteMarkets = [];
  }

  public getBlockNumber(): number {
    return this.blockNumber;
  }

  public getBlockTimestamp(): DateTime {
    return this.blockTimestamp;
  }

  public getDolomiteMarkets(): ApiMarket[] {
    return this.dolomiteMarkets;
  }

  start = () => {
    Logger.info({
      at: 'MarketStore#start',
      message: 'Starting market store',
    });
    this._poll();
  };

  _poll = async () => {
    // noinspection InfiniteLoopJS
    for (;;) {
      try {
        await this._update();
      } catch (error) {
        Logger.error({
          at: 'MarketStore#_poll',
          message: error.message,
          error,
        });
      }

      await delay(Number(process.env.MARKET_POLL_INTERVAL_MS));
    }
  };

  _update = async () => {
    Logger.info({
      at: 'MarketStore#_update',
      message: 'Updating markets...',
    });

    const { blockNumber, blockTimestamp } = await getSubgraphBlockNumber();
    const { markets: nextDolomiteMarkets } = await getDolomiteMarkets(blockNumber);

    this.blockNumber = blockNumber;
    this.blockTimestamp = blockTimestamp;
    this.dolomiteMarkets = nextDolomiteMarkets;

    Logger.info({
      at: 'MarketStore#_update',
      message: 'Finished updating markets',
    });
  };
}
