import { getLiquidatableFringeAccounts } from '../clients/fringe';
import { ApiAccount } from './api-types';
import { delay } from './delay';
import Logger from './logger';
import Pageable from './pageable';
import PriceStore from './price-store';

export default class AccountStore {
  public liquidatableFringeAccounts: ApiAccount[];
  private priceStore: PriceStore;

  constructor(priceStore: PriceStore) {
    this.liquidatableFringeAccounts = [];
    this.priceStore = priceStore;
  }

  public getLiquidatableFringeAccounts(): ApiAccount[] {
    return this.liquidatableFringeAccounts;
  }

  start = () => {
    Logger.info({
      at: 'AccountStore#start',
      message: 'Starting account store',
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
          at: 'AccountStore#_poll',
          message: error.message,
          error,
        });
      }

      await delay(Number(process.env.ACCOUNT_POLL_INTERVAL_MS));
    }
  };

  _update = async () => {
    Logger.info({
      at: 'AccountStore#_update',
      message: 'Updating accounts...',
    });

    const symbolToPricesMap = this.priceStore.getPrices();
    if (!symbolToPricesMap) {
      Logger.info({
        at: 'AccountStore#_update',
        message: 'Prices are empty. Returning...',
      });
      return;
    }

    // don't set the field variables until both values have been retrieved from the network
    this.liquidatableFringeAccounts = await Pageable.getPageableValues(async (pageIndex) => {
      const { accounts } = await getLiquidatableFringeAccounts(pageIndex, symbolToPricesMap);
      return accounts;
    });

    Logger.info({
      at: 'AccountStore#_update',
      message: 'Finished updating accounts',
    });
  };
}
