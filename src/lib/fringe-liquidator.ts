import { liquidateAccount } from '../helpers/fringe-helpers';
import AccountStore from './account-store';
import { ApiAccount } from './api-types';
import { delay } from './delay';
import LiquidationStore from './liquidation-store';
import Logger from './logger';

export default class FringeLiquidator {
  public accountStore: AccountStore;
  public liquidationStore: LiquidationStore;

  constructor(
    accountStore: AccountStore,
    liquidationStore: LiquidationStore,
  ) {
    this.accountStore = accountStore;
    this.liquidationStore = liquidationStore;
  }

  start = () => {
    Logger.info({
      at: 'FringeLiquidator#start',
      message: 'Starting DolomiteMargin liquidator',
    });
    delay(Number(process.env.LIQUIDATE_POLL_INTERVAL_MS))
      .then(() => this._poll())
      .catch(() => this._poll());
  };

  _poll = async () => {
    // noinspection InfiniteLoopJS
    for (; ;) {
      await this._liquidateAccounts();

      await delay(Number(process.env.LIQUIDATE_POLL_INTERVAL_MS));
    }
  };

  _liquidateAccounts = async () => {
    const liquidatableAccounts = this.accountStore.getLiquidatableDolomiteAccounts()
      .filter(account => !this.liquidationStore.contains(account))
      .filter(account => !this.isCollateralized(account));

    if (liquidatableAccounts.length === 0) {
      Logger.info({
        at: 'FringeLiquidator#_liquidateAccounts',
        message: 'No accounts to liquidate',
      });
      return;
    }

    liquidatableAccounts.forEach(a => this.liquidationStore.add(a));

    for (let i = 0; i < liquidatableAccounts.length; i += 1) {
      const account = liquidatableAccounts[i];
      try {
        await liquidateAccount(account);
        await delay(Number(process.env.SEQUENTIAL_TRANSACTION_DELAY_MS));
      } catch (error) {
        Logger.error({
          at: 'FringeLiquidator#_liquidateAccounts',
          message: `Failed to liquidate account: ${error.message}`,
          account,
          error,
        });
      }
    }
  };

  isCollateralized = (
    account: ApiAccount,
  ): boolean => {
    return account.healthFactor.lt('1');
  };
}
