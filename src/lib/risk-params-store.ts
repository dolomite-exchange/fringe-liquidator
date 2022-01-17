import { ApiRiskParam } from './api-types';
import { getDolomiteRiskParams } from '../clients/dolomite';
import { delay } from './delay';
import Logger from './logger';
import MarketStore from './market-store';

export default class RiskParamsStore {
  public marketStore: MarketStore

  public dolomiteRiskParams: ApiRiskParam | undefined;

  constructor(marketStore: MarketStore) {
    this.marketStore = marketStore;
    this.dolomiteRiskParams = undefined;
  }

  public getDolomiteRiskParams(): ApiRiskParam | undefined {
    return this.dolomiteRiskParams;
  }

  start = () => {
    Logger.info({
      at: 'RiskParamsStore#start',
      message: 'Starting risk params store',
    });
    this._poll();
  };

  _poll = async () => {
    // noinspection InfiniteLoopJS
    for (;;) {
      try {
        await this._update();
      } catch (error) {
        Logger.error({
          at: 'RiskParamsStore#_poll',
          message: error.message,
          error,
        });
      }

      await delay(Number(process.env.RISK_PARAMS_POLL_INTERVAL_MS));
    }
  };

  _update = async () => {
    Logger.info({
      at: 'RiskParamsStore#_update',
      message: 'Updating risk params...',
    });

    const blockNumber = this.marketStore.getBlockNumber();
    const { riskParam: nextDolomiteRiskParams } = await getDolomiteRiskParams(blockNumber);

    this.dolomiteRiskParams = nextDolomiteRiskParams;

    Logger.info({
      at: 'RiskParamsStore#_update',
      message: 'Finished updating risk params',
    });
  };
}
