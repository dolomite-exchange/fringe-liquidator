import v8 from 'v8';
// eslint-disable-next-line
import '../src/lib/env';

import { loadAccounts, provider } from './helpers/web3';
import AccountStore from './lib/account-store';
import FringeLiquidator from './lib/fringe-liquidator';
import GasPriceUpdater from './lib/gas-price-updater';
import {
  checkBigNumber,
  checkBooleanValue,
  checkDuration,
  checkEthereumAddress,
  checkExists,
  checkJsNumber,
  checkPrivateKey,
} from './lib/invariants';
import LiquidationStore from './lib/liquidation-store';
import Logger from './lib/logger';

checkDuration('ACCOUNT_POLL_INTERVAL_MS', 1000);
checkEthereumAddress('ACCOUNT_WALLET_ADDRESS');
checkPrivateKey('ACCOUNT_WALLET_PRIVATE_KEY');
checkEthereumAddress('BRIDGE_TOKEN_ADDRESS');
checkExists('ETHEREUM_NODE_URL');
checkEthereumAddress('FRINGE_ADDRESS');
checkBigNumber('GAS_PRICE_MULTIPLIER');
checkDuration('GAS_PRICE_POLL_INTERVAL_MS', 1000);
checkDuration('LIQUIDATE_POLL_INTERVAL_MS', 1000);
checkDuration('LIQUIDATION_KEY_EXPIRATION_SECONDS', 1, /* isMillis = */ false);
checkBooleanValue('LIQUIDATIONS_ENABLED');
checkJsNumber('NETWORK_ID');
checkDuration('SEQUENTIAL_TRANSACTION_DELAY_MS', 10);

async function start() {
  const accountStore = new AccountStore();
  const liquidationStore = new LiquidationStore();
  const fringeLiquidator = new FringeLiquidator(accountStore, liquidationStore);
  const gasPriceUpdater = new GasPriceUpdater();

  await loadAccounts();

  const networkId = (await provider.getNetwork()).chainId;

  if (networkId !== Number(process.env.NETWORK_ID)) {
    const message = `Invalid network ID found!\n
    { network: ${networkId} environment: ${Number(process.env.NETWORK_ID)} }`;
    Logger.error(message);
    return Promise.reject(new Error(message));
  }

  Logger.info({
    message: 'Fringe data',
    accountWalletAddress: process.env.ACCOUNT_WALLET_ADDRESS,
    bridgeTokenAddress: process.env.BRIDGE_TOKEN_ADDRESS,
    ethereumNodeUrl: process.env.ETHEREUM_NODE_URL,
    fringeAddress: process.env.FRINGE_ADDRESS,
    gasPriceMultiplier: process.env.GAS_PRICE_MULTIPLIER,
    gasPriceAddition: process.env.GAS_PRICE_ADDITION,
    heapSize: `${v8.getHeapStatistics().heap_size_limit / (1024 * 1024)} MB`,
    initialGasPriceWei: process.env.INITIAL_GAS_PRICE_WEI,
    liquidationKeyExpirationSeconds: process.env.LIQUIDATION_KEY_EXPIRATION_SECONDS,
    liquidationsEnabled: process.env.LIQUIDATIONS_ENABLED,
    networkId,
    sequentialTransactionDelayMillis: process.env.SEQUENTIAL_TRANSACTION_DELAY_MS,
  });

  Logger.info({
    message: 'Polling intervals',
    accountPollIntervalMillis: process.env.ACCOUNT_POLL_INTERVAL_MS,
    gasPricePollInterval: process.env.GAS_PRICE_POLL_INTERVAL_MS,
    liquidatePollIntervalMillis: process.env.LIQUIDATE_POLL_INTERVAL_MS,
  });

  accountStore.start();
  gasPriceUpdater.start();

  if (process.env.LIQUIDATIONS_ENABLED === 'true') {
    fringeLiquidator.start();
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
