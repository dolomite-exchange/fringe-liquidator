import { liquidateAccount, liquidateExpiredAccount } from '../helpers/dolomite-helpers';
import Logger from './logger';
import { delay } from './delay';
import AccountStore from './account-store';
import LiquidationStore from './liquidation-store';
import MarketStore from './market-store';

export default class DolomiteLiquidator {
  public accountStore: AccountStore;
  public marketStore: MarketStore;
  public liquidationStore: LiquidationStore;

  constructor(
    accountStore: AccountStore,
    marketStore: MarketStore,
    liquidationStore: LiquidationStore,
  ) {
    this.accountStore = accountStore;
    this.marketStore = marketStore;
    this.liquidationStore = liquidationStore;
  }

  start = () => {
    Logger.info({
      at: 'DolomiteLiquidator#start',
      message: 'Starting Dolomite liquidator',
    });
    this._poll();
  }

  _poll = async () => {
    // noinspection InfiniteLoopJS
    for (;;) {
      await this._liquidateAccounts();

      await delay(Number(process.env.DOLOMITE_LIQUIDATE_POLL_INTERVAL_MS));
    }
  }

  _liquidateAccounts = async () => {
    const liquidatableAccounts = this.accountStore.getLiquidatableDolomiteAccounts()
      .filter(a => !this.liquidationStore.contains(a));
    const expiredAccounts = this.accountStore.getExpiredAccounts()
      .filter(a => !this.liquidationStore.contains(a));
    const markets = this.marketStore.getDolomiteMarkets();

    if (liquidatableAccounts.length === 0 && expiredAccounts.length === 0) {
      Logger.info({
        at: 'DolomiteLiquidator#_liquidateAccounts',
        message: 'No accounts to liquidate',
      });
      return;
    }

    liquidatableAccounts.forEach(a => this.liquidationStore.add(a));
    expiredAccounts.forEach(a => this.liquidationStore.add(a));

    await Promise.all([
      ...liquidatableAccounts.map(async (account) => {
        try {
          await liquidateAccount(account);
        } catch (error) {
          Logger.error({
            at: 'DolomiteLiquidator#_liquidateAccounts',
            message: `Failed to liquidate account: ${error.message}`,
            account,
            error,
          });
        }
      }),
      ...expiredAccounts.map(async (account) => {
        try {
          await liquidateExpiredAccount(account, markets);
        } catch (error) {
          Logger.error({
            at: 'DolomiteLiquidator#_liquidateAccounts',
            message: `Failed to liquidate expired account: ${error.message}`,
            account,
            error,
          });
        }
      }),
    ]);
  }
}
