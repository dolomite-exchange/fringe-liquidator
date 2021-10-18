import { ApiMarket } from './api-types';
import { getDolomiteMarkets } from '../clients/dolomite';
import { delay } from './delay';
import Logger from './logger';

export default class MarketStore {
  public dolomiteMarkets: ApiMarket[];

  constructor() {
    this.dolomiteMarkets = [];
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

    const { markets: nextDolomiteMarkets } = await getDolomiteMarkets();

    this.dolomiteMarkets = nextDolomiteMarkets;

    Logger.info({
      at: 'MarketStore#_update',
      message: 'Finished updating markets',
    });
  };
}
