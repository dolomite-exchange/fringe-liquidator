/* eslint no-console: 0 */
/* eslint import/first: 0 */
import './lib/env';

import { getDolomiteRiskParams } from './clients/dolomite';
import { getSubgraphBlockNumber } from './helpers/block-helper';
import AccountStore from './lib/account-store';
import MarketStore from './lib/market-store';
import LiquidationStore from './lib/liquidation-store';
import DolomiteLiquidator from './lib/dolomite-liquidator';
import GasPriceUpdater from './lib/gas-price-updater';
import {
  dolomite,
  initializeDolomiteLiquidations,
  loadAccounts,
} from './helpers/web3';
import RiskParamsStore from './lib/risk-params-store';
import Logger from './lib/logger';

console.log(`Starting in env ${process.env.NODE_ENV}`);

if (Number(process.env.ACCOUNT_POLL_INTERVAL_MS) < 1000) {
  throw new Error('Account Poll Interval too low');
}

if (Number(process.env.MARKET_POLL_INTERVAL_MS) < 1000) {
  throw new Error('Market Poll Interval too low');
}

if (Number(process.env.DELAY_BETWEEN_TRANSACTIONS_MILLIS) < 10) {
  throw new Error('Delay between transactions too low')
}

if (!process.env.BASE_CURRENCY_ADDRESS) {
  throw new Error('BASE_CURRENCY_ADDRESS is not provided')
}

async function start() {
  const marketStore = new MarketStore();
  const accountStore = new AccountStore(marketStore);
  const liquidationStore = new LiquidationStore();
  const riskParamsStore = new RiskParamsStore(marketStore);
  const dolomiteLiquidator = new DolomiteLiquidator(accountStore, marketStore, liquidationStore, riskParamsStore);
  const gasPriceUpdater = new GasPriceUpdater();

  await loadAccounts();

  const { blockNumber } = await getSubgraphBlockNumber();
  const { riskParams } = await getDolomiteRiskParams(blockNumber);

  const libraryDolomiteMargin = dolomite.contracts.dolomiteMargin.options.address
  if (riskParams.dolomiteMargin !== libraryDolomiteMargin) {
    const message = `Invalid dolomite margin address found!\n
    { network: ${riskParams.dolomiteMargin} library: ${libraryDolomiteMargin} }`;
    Logger.error(message);
    console.error(message)
    return Promise.reject(new Error(message));
  }

  Logger.info({
    message: 'DolomiteMargin data',
    subgraphUrl: process.env.SUBGRAPH_URL,
    dolomiteMargin: libraryDolomiteMargin,
    liquidatorProxyV1: dolomite.contracts.liquidatorProxyV1.options.address,
    liquidatorProxyV1WithAmm: dolomite.contracts.liquidatorProxyV1WithAmm.options.address,
    expiry: dolomite.contracts.expiry.options.address,
    rampTime: process.env.DOLOMITE_EXPIRED_ACCOUNT_DELAY_SECONDS,
  });

  if (process.env.DOLOMITE_LIQUIDATIONS_ENABLED === 'true') {
    await initializeDolomiteLiquidations();
  }

  accountStore.start();
  marketStore.start();
  riskParamsStore.start();
  gasPriceUpdater.start();

  if (process.env.DOLOMITE_LIQUIDATIONS_ENABLED === 'true' || process.env.DOLOMITE_EXPIRATIONS_ENABLED === 'true') {
    dolomiteLiquidator.start();
  }
  return true
}

start().catch(error => {
  Logger.error({
    message: `Found error while starting: ${error.toString()}`,
    error: JSON.stringify(error),
  })
  process.exit(1)
});
