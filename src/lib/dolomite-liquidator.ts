import { DateTime } from 'luxon';
import { liquidateAccount, liquidateExpiredAccount } from '../helpers/dolomite-helpers';
import Logger from './logger';
import { delay } from './delay';
import AccountStore from './account-store';
import LiquidationStore from './liquidation-store';
import MarketStore from './market-store';
import { getLatestBlockTimestamp } from "../helpers/block-helper";

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
    const lastBlockTimestamp: DateTime = await getLatestBlockTimestamp();

    const expiredAccounts = this.accountStore.getExpiredAccounts()
      .filter(a => !this.liquidationStore.contains(a))
      .filter(a => {
        return Object.values(a.balances).some((balance => {
          return balance.expiresAt && balance.expiresAt.lt(lastBlockTimestamp.toSeconds)
        }))
      });

    const markets = this.marketStore.getDolomiteMarkets();
    const liquidatableAccounts = this.accountStore.getLiquidatableDolomiteAccounts()
      .filter(a => !this.liquidationStore.contains(a));
    // TODO filter liquid positions, including market-specific risk params

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
          await liquidateExpiredAccount(account, markets, lastBlockTimestamp);
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
