/* eslint no-console: 0 */
/* eslint import/first: 0 */
import './lib/env';

import AccountStore from './lib/account-store';
import MarketStore from './lib/market-store';
import LiquidationStore from './lib/liquidation-store';
import DolomiteLiquidator from './lib/dolomite-liquidator';
import GasPriceUpdater from './lib/gas-price-updater';
import { initializeDolomiteLiquidations, loadAccounts } from './helpers/web3';
import RiskParamsStore from './lib/risk-params-store';

console.log(`Starting in env ${process.env.NODE_ENV}`);

if (Number(process.env.ACCOUNT_POLL_INTERVAL_MS) < 1000) {
  throw new Error('Account Poll Interval too low');
}

if (Number(process.env.MARKET_POLL_INTERVAL_MS) < 1000) {
  throw new Error('Account Poll Interval too low');
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
}

start();
