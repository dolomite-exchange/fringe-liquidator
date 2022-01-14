import { BigNumber } from '@dolomite-exchange/dolomite-margin';
import { INTEGERS } from '@dolomite-exchange/dolomite-margin/dist/src/lib/Constants';
import { DateTime } from 'luxon';
import { liquidateAccount, liquidateExpiredAccount } from '../helpers/dolomite-helpers';
import Logger from './logger';
import { delay } from './delay';
import AccountStore from './account-store';
import LiquidationStore from './liquidation-store';
import MarketStore from './market-store';
import { getLatestBlockTimestamp } from '../helpers/block-helper';
import RiskParamsStore from './risk-params-store';
import { ApiAccount, ApiMarket, ApiRiskParam } from './api-types';

export default class DolomiteLiquidator {
  public accountStore: AccountStore;
  public marketStore: MarketStore;
  public liquidationStore: LiquidationStore;
  public riskParamsStore: RiskParamsStore

  constructor(
    accountStore: AccountStore,
    marketStore: MarketStore,
    liquidationStore: LiquidationStore,
    riskParamsStore: RiskParamsStore,
  ) {
    this.accountStore = accountStore;
    this.marketStore = marketStore;
    this.liquidationStore = liquidationStore;
    this.riskParamsStore = riskParamsStore;
  }

  start = () => {
    Logger.info({
      at: 'DolomiteLiquidator#start',
      message: 'Starting DolomiteMargin liquidator',
    });
    delay(Number(process.env.DOLOMITE_LIQUIDATE_POLL_INTERVAL_MS))
      .then(() => this._poll())
      .catch(() => this._poll())
  }

  _poll = async () => {
    // noinspection InfiniteLoopJS
    for (; ;) {
      await this._liquidateAccounts();

      await delay(Number(process.env.DOLOMITE_LIQUIDATE_POLL_INTERVAL_MS));
    }
  }

  _liquidateAccounts = async () => {
    const lastBlockTimestamp: DateTime = await getLatestBlockTimestamp();

    /* eslint-disable arrow-body-style */
    const expiredAccounts = this.accountStore.getExpiredAccounts()
      .filter(a => !this.liquidationStore.contains(a))
      .filter(a => {
        return Object.values(a.balances).some((balance => {
          return balance.expiresAt && balance.expiresAt.lt(lastBlockTimestamp.toSeconds)
        }))
      });
    /* eslint-enable arrow-body-style */

    const riskParams = this.riskParamsStore.getDolomiteRiskParams();
    if (!riskParams) {
      Logger.error({
        at: 'DolomiteLiquidator#_liquidateAccounts',
        message: 'No risk params available',
      });
      return;
    }

    const markets = this.marketStore.getDolomiteMarkets();
    const liquidatableAccounts = this.accountStore.getLiquidatableDolomiteAccounts()
      .filter(account => !this.liquidationStore.contains(account))
      .filter(account => !this.isCollateralized(account, markets, riskParams));

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

  isCollateralized = (account: ApiAccount, markets: ApiMarket[], riskParams: ApiRiskParam): boolean => {
    const initial = {
      borrow: INTEGERS.ZERO,
      supply: INTEGERS.ZERO,
    };
    const base = new BigNumber('1000000000000000000');
    const { supply, borrow } = Object.values(account.balances).reduce((memo, balance) => {
      const market = markets[balance.marketId];
      const value = balance.wei.times(market.oraclePrice);
      const adjust = base.plus(market.marginPremium);
      if (balance.wei.lt(INTEGERS.ZERO)) {
        // increase the borrow size by the premium
        memo.borrow = memo.borrow.plus(value.times(adjust).div(base).integerValue(BigNumber.ROUND_FLOOR));
      } else {
        // decrease the supply size by the premium
        memo.supply = memo.supply.plus(value.times(base).div(adjust).integerValue(BigNumber.ROUND_FLOOR));
      }
      return memo;
    }, initial);
    const collateralization = supply.times(base).div(borrow.abs()).integerValue(BigNumber.ROUND_FLOOR);
    return collateralization.gte(riskParams.liquidationRatio);
  }
}
