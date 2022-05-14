import { getLiquidatableFringeAccounts } from '../clients/fringe';
import { ApiAccount } from './api-types';
import { delay } from './delay';
import Logger from './logger';
import Pageable from './pageable';

export default class AccountStore {
  public liquidatableFringeAccounts: ApiAccount[];

  constructor() {
    this.liquidatableFringeAccounts = [];
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

    // don't set the field variables until both values have been retrieved from the network
    this.liquidatableFringeAccounts = await Pageable.getPageableValues(async (pageIndex) => {
      const { accounts } = await getLiquidatableFringeAccounts(pageIndex);
      return accounts;
    });

    Logger.info({
      at: 'AccountStore#_update',
      message: 'Finished updating accounts',
    });
  };
}
