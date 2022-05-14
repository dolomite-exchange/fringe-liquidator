import BigNumber from 'bignumber.js';
import fetch from 'node-fetch';
import { delay } from './delay';
import Logger from './logger';

export default class PriceStore {
  public static ETH = 'ethereum';

  public priceMap: Record<string, BigNumber> | undefined;

  public getPrices(): Record<string, BigNumber | undefined> | undefined {
    return this.priceMap;
  }

  start = () => {
    Logger.info({
      at: 'PriceStore#start',
      message: 'Starting price store',
    });
    this._poll();
  };

  _poll = async () => {
    // noinspection InfiniteLoopJS
    for (; ;) {
      try {
        await this._update();
      } catch (error) {
        Logger.error({
          at: 'PriceStore#_poll',
          message: error.message,
          error,
        });
      }

      await delay(Number(process.env.PRICE_POLL_INTERVAL_MS));
    }
  };

  _update = async () => {
    Logger.info({
      at: 'PriceStore#_update',
      message: 'Updating prices...',
    });

    this.priceMap = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${PriceStore.ETH}&vs_currencies=usd`)
      .then(response => response.json())
      .then(response => {
        return {
          [PriceStore.ETH]: new BigNumber(response[PriceStore.ETH].usd),
        }
      })

    Logger.info({
      at: 'PriceStore#_update',
      message: 'Finished updating prices',
    });
  };
}
