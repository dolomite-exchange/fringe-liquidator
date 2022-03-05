import v8 from 'v8';
// eslint-disable-next-line
import '../src/lib/env';

import { getDolomiteRiskParams } from './clients/dolomite';
import { getSubgraphBlockNumber } from './helpers/block-helper';
import { dolomite, initializeDolomiteLiquidations, loadAccounts } from './helpers/web3';
import AccountStore from './lib/account-store';
import DolomiteLiquidator from './lib/dolomite-liquidator';
import GasPriceUpdater from './lib/gas-price-updater';
import LiquidationStore from './lib/liquidation-store';
import Logger from './lib/logger';
import MarketStore from './lib/market-store';
import RiskParamsStore from './lib/risk-params-store';

if (Number(process.env.ACCOUNT_POLL_INTERVAL_MS) < 1000) {
  throw new Error('Account Poll Interval too low');
}

if (Number(process.env.MARKET_POLL_INTERVAL_MS) < 1000) {
  throw new Error('Market Poll Interval too low');
}

if (Number(process.env.SEQUENTIAL_TRANSACTION_DELAY_MS) < 10) {
  throw new Error('Delay between transactions too low')
}

if (!process.env.BRIDGE_TOKEN_ADDRESS) {
  throw new Error('BRIDGE_TOKEN_ADDRESS is not provided')
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
  const networkId = await dolomite.web3.eth.net.getId();

  const libraryDolomiteMargin = dolomite.contracts.dolomiteMargin.options.address
  if (riskParams.dolomiteMargin !== libraryDolomiteMargin) {
    const message = `Invalid dolomite margin address found!\n
    { network: ${riskParams.dolomiteMargin} library: ${libraryDolomiteMargin} }`;
    Logger.error(message);
    return Promise.reject(new Error(message));
  } else if (networkId !== Number(process.env.NETWORK_ID)) {
    const message = `Invalid network ID found!\n
    { network: ${networkId} environment: ${Number(process.env.NETWORK_ID)} }`;
    Logger.error(message);
    return Promise.reject(new Error(message));
  }

  Logger.info({
    message: 'DolomiteMargin data',
    networkId,
    ethereumNodeUrl: process.env.ETHEREUM_NODE_URL,
    subgraphUrl: process.env.SUBGRAPH_URL,
    dolomiteMargin: libraryDolomiteMargin,
    liquidatorProxyV1: dolomite.contracts.liquidatorProxyV1.options.address,
    liquidatorProxyV1WithAmm: dolomite.contracts.liquidatorProxyV1WithAmm.options.address,
    expiry: dolomite.contracts.expiry.options.address,
    expirationRampTimeSeconds: process.env.EXPIRED_ACCOUNT_DELAY_SECONDS,
    autoSellCollateral: process.env.AUTO_SELL_COLLATERAL,
    liquidationsEnabled: process.env.LIQUIDATIONS_ENABLED,
    expirationsEnabled: process.env.EXPIRATIONS_ENABLED,
    revertOnFailToSellCollateral: process.env.REVERT_ON_FAIL_TO_SELL_COLLATERAL,
    liquidationKeyExpirationSeconds: process.env.LIQUIDATION_KEY_EXPIRATION_SECONDS,
    sequentialTransactionDelayMillis: process.env.SEQUENTIAL_TRANSACTION_DELAY_MS,
    heapSize: `${v8.getHeapStatistics().heap_size_limit / (1024 * 1024)} MB`,
  });

  Logger.info({
    message: 'Polling intervals',
    accountPollIntervalMillis: process.env.ACCOUNT_POLL_INTERVAL_MS,
    marketPollIntervalMillis: process.env.MARKET_POLL_INTERVAL_MS,
    riskParamsPollIntervalMillis: process.env.RISK_PARAMS_POLL_INTERVAL_MS,
    liquidatePollIntervalMillis: process.env.LIQUIDATE_POLL_INTERVAL_MS,
  });

  if (process.env.LIQUIDATIONS_ENABLED === 'true') {
    await initializeDolomiteLiquidations();
  }

  accountStore.start();
  marketStore.start();
  riskParamsStore.start();
  gasPriceUpdater.start();

  if (process.env.LIQUIDATIONS_ENABLED === 'true' || process.env.EXPIRATIONS_ENABLED === 'true') {
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
