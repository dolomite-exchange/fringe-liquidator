import { BigNumber } from '@dolomite-exchange/dolomite-margin';
import { INTEGERS } from '@dolomite-exchange/dolomite-margin/dist/src/lib/Constants';
import { DateTime } from 'luxon';
import {
  isExpired,
  liquidateAccount,
  liquidateExpiredAccount,
} from '../helpers/dolomite-helpers';
import AccountStore from './account-store';
import {
  ApiAccount,
  ApiMarket,
  ApiRiskParam,
} from './api-types';
import { delay } from './delay';
import LiquidationStore from './liquidation-store';
import Logger from './logger';
import MarketStore from './market-store';
import RiskParamsStore from './risk-params-store';

export default class DolomiteLiquidator {
  public accountStore: AccountStore;
  public marketStore: MarketStore;
  public liquidationStore: LiquidationStore;
  public riskParamsStore: RiskParamsStore;

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
      .catch(() => this._poll());
  };

  _poll = async () => {
    await delay(Number(process.env.MARKET_POLL_INTERVAL_MS)); // wait for the markets to initialize
    // noinspection InfiniteLoopJS
    for (; ;) {
      await this._liquidateAccounts();

      await delay(Number(process.env.DOLOMITE_LIQUIDATE_POLL_INTERVAL_MS));
    }
  };

  _liquidateAccounts = async () => {
    const lastBlockTimestamp: DateTime = this.marketStore.getBlockTimestamp();
    const blockNumber = this.marketStore.getBlockNumber();

    let expirableAccounts = this.accountStore.getExpirableDolomiteAccounts()
      .filter(a => !this.liquidationStore.contains(a))
      .filter(a => {
        return Object.values(a.balances)
          .some((balance => {
            if (balance.wei.lt(0) && balance.expiresAt) {
              return isExpired(balance.expiresAt, lastBlockTimestamp)
            } else {
              return false;
            }
          }));
      });

    const riskParams = this.riskParamsStore.getDolomiteRiskParams();
    if (!riskParams) {
      Logger.error({
        at: 'DolomiteLiquidator#_liquidateAccounts',
        message: 'No risk params available',
      });
      return;
    }

    const marketMap = this.marketStore.getMarketMap();
    const liquidatableAccounts = this.accountStore.getLiquidatableDolomiteAccounts()
      .filter(account => !this.liquidationStore.contains(account))
      .filter(account => !this.isCollateralized(account, marketMap, riskParams));

    // Do not put an account in both liquidatable and expired; prioritize liquidation
    expirableAccounts = expirableAccounts.filter((ea) => !liquidatableAccounts.find((la) => la.id === ea.id));

    if (liquidatableAccounts.length === 0 && expirableAccounts.length === 0) {
      Logger.info({
        at: 'DolomiteLiquidator#_liquidateAccounts',
        message: 'No accounts to liquidate',
      });
      return;
    }

    Logger.info({
      message: 'liquidatableAccounts',
      liquidatableAccounts,
    })
    Logger.info({
      message: 'expirableAccounts',
      expirableAccounts,
    })
    liquidatableAccounts.forEach(a => this.liquidationStore.add(a));
    expirableAccounts.forEach(a => this.liquidationStore.add(a));

    await Promise.all([
      ...liquidatableAccounts.map(async (account) => {
        try {
          await liquidateAccount(account, lastBlockTimestamp, blockNumber);
          await delay(Number(process.env.SEQUENTIAL_TRANSACTION_DELAY_MS));
        } catch (error) {
          Logger.error({
            at: 'DolomiteLiquidator#_liquidateAccounts',
            message: `Failed to liquidate account: ${error.message}`,
            account,
            error,
          });
        }
      }),
    ]);
    await Promise.all([
      ...expirableAccounts.map(async (account) => {
        try {
          await liquidateExpiredAccount(account, marketMap, lastBlockTimestamp);
          await delay(Number(process.env.SEQUENTIAL_TRANSACTION_DELAY_MS));
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
  };

  isCollateralized = (
    account: ApiAccount,
    marketMap: { [marketId: string]: ApiMarket },
    riskParams: ApiRiskParam,
  ): boolean => {
    const initial = {
      borrow: INTEGERS.ZERO,
      supply: INTEGERS.ZERO,
    };
    const base = new BigNumber('1000000000000000000');
    const {
      supply,
      borrow,
    } = Object.values(account.balances)
      .reduce((memo, balance) => {
        const market = marketMap[balance.marketId.toString()];
        const value = balance.wei.times(market.oraclePrice);
        const adjust = base.plus(market.marginPremium);
        if (balance.wei.lt(INTEGERS.ZERO)) {
          // increase the borrow size by the premium
          memo.borrow = memo.borrow.plus(value.times(adjust)
            .div(base)
            .integerValue(BigNumber.ROUND_FLOOR));
        } else {
          // decrease the supply size by the premium
          memo.supply = memo.supply.plus(value.times(base)
            .div(adjust)
            .integerValue(BigNumber.ROUND_FLOOR));
        }
        return memo;
      }, initial);

    const collateralization = supply.times(base)
      .div(borrow.abs())
      .integerValue(BigNumber.ROUND_FLOOR);
    return collateralization.gte(riskParams.liquidationRatio);
  };
}
