import { ApiAccount } from './api-types';
import {
  getLiquidatableDolomiteAccounts,
  getExpiredAccounts,
} from '../clients/dolomite';
import { delay } from './delay';
import Logger from './logger';

export default class AccountStore {
  public liquidatableDolomiteAccounts: ApiAccount[];

  public expiredAccounts: ApiAccount[];

  constructor() {
    this.liquidatableDolomiteAccounts = [];
    this.expiredAccounts = [];
  }

  public getLiquidatableDolomiteAccounts(): ApiAccount[] {
    return this.liquidatableDolomiteAccounts;
  }

  public getExpiredAccounts(): ApiAccount[] {
    return this.expiredAccounts;
  }

  start = () => {
    Logger.info({
      at: 'AccountStore#start',
      message: 'Starting account store',
    });
    this._poll();
  };

  _poll = async () => {
    for (;;) {
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

    const [
      { accounts: nextLiquidatableDolomiteAccounts },
      { accounts: nextExpiredAccounts },
    ] = await Promise.all([
      getLiquidatableDolomiteAccounts(),
      getExpiredAccounts(),
    ]);

    // Do not put an account in both liquidatable and expired
    const filteredNextExpiredAccounts = nextExpiredAccounts.filter(
      (ea) => !nextLiquidatableDolomiteAccounts.find((la) => la.id === ea.id),
    );

    this.liquidatableDolomiteAccounts = nextLiquidatableDolomiteAccounts;
    this.expiredAccounts = filteredNextExpiredAccounts;

    Logger.info({
      at: 'AccountStore#_update',
      message: 'Finished updating accounts',
    });
  };
}
