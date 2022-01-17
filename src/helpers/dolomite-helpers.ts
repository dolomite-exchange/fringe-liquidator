import {
  BigNumber,
  INTEGERS,
} from '@dolomite-exchange/dolomite-margin';
import {
  ConfirmationType,
  TxResult,
} from '@dolomite-exchange/dolomite-margin/dist/src/types';
import { DateTime } from 'luxon';
import {
  ApiAccount,
  ApiMarket,
} from '../lib/api-types';
import { getGasPrice } from '../lib/gas-price';
import Logger from '../lib/logger';
import { dolomite } from './web3';

const collateralPreferences = process.env.DOLOMITE_COLLATERAL_PREFERENCES.split(',')
  .map((pref) => pref.trim());
const owedPreferences = process.env.DOLOMITE_OWED_PREFERENCES.split(',')
  .map((pref) => pref.trim());

export async function liquidateAccount(liquidAccount: ApiAccount): Promise<TxResult | undefined> {
  if (process.env.DOLOMITE_LIQUIDATIONS_ENABLED !== 'true') {
    return Promise.resolve(undefined);
  }

  Logger.info({
    at: 'dolomite-helpers#liquidateAccount',
    message: 'Starting account liquidation',
    accountOwner: liquidAccount.owner,
    accountNumber: liquidAccount.number,
  });

  const liquidatable = await dolomite.getters.isAccountLiquidatable(
    liquidAccount.owner,
    new BigNumber(liquidAccount.number),
  );

  if (!liquidatable) {
    Logger.info({
      at: 'dolomite-helpers#liquidateAccount',
      message: 'Account is not liquidatable',
      accountOwner: liquidAccount.owner,
      accountNumber: liquidAccount.number,
    });

    return Promise.resolve(undefined);
  }

  const sender = process.env.WALLET_ADDRESS;
  const borrowMarkets: string[] = [];
  const supplyMarkets: string[] = [];

  Object.keys(liquidAccount.balances)
    .forEach((marketId) => {
      const par = new BigNumber(liquidAccount.balances[marketId].par);

      if (par.lt(INTEGERS.ZERO)) {
        borrowMarkets.push(marketId);
      } else if (par.gt(INTEGERS.ZERO)) {
        supplyMarkets.push(marketId);
      }
    });

  if (borrowMarkets.length === 0) {
    return Promise.reject('Supposedly liquidatable account has no borrows');
  }

  if (supplyMarkets.length === 0) {
    return Promise.reject('Supposedly liquidatable account has no collateral');
  }

  if (process.env.DOLOMITE_AUTO_SELL_COLLATERAL.toLowerCase() === 'true') {
    return liquidateAccountInternalAndSellCollateral(liquidAccount, sender);
  } else {
    return liquidateAccountInternal(liquidAccount, sender);
  }
}

async function liquidateAccountInternalAndSellCollateral(
  liquidAccount: ApiAccount,
  sender: string,
): Promise<TxResult> {
  if (!process.env.DOLOMITE_BRIDGE_CURRENCY_ADDRESS) {
    const message = 'DOLOMITE_BRIDGE_CURRENCY_ADDRESS is not provided';
    Logger.error({
      at: 'dolomite-helpers#liquidateAccountInternalAndSellCollateral',
      message: message,
    });
    return Promise.reject(message);
  }
  if (!process.env.DOLOMITE_ACCOUNT_NUMBER) {
    const message = 'DOLOMITE_ACCOUNT_NUMBER is not provided';
    Logger.error({
      at: 'dolomite-helpers#liquidateAccountInternalAndSellCollateral',
      message: message,
    });
    return Promise.reject(message);
  }
  if (!process.env.DOLOMITE_REVERT_ON_FAIL_TO_SELL_COLLATERAL) {
    const message = 'DOLOMITE_REVERT_ON_FAIL_TO_SELL_COLLATERAL is not provided';
    Logger.error({
      at: 'dolomite-helpers#liquidateAccountInternalAndSellCollateral',
      message: message,
    });
    return Promise.reject(message);
  }

  const bridgeAddress = process.env.DOLOMITE_BRIDGE_CURRENCY_ADDRESS.toLowerCase();
  const owedBalance = Object.values(liquidAccount.balances)
    .filter(value => new BigNumber(value.wei).lt('0'))[0];
  const heldBalance = Object.values(liquidAccount.balances)
    .filter(value => new BigNumber(value.wei).gt('0'))[0];
  const gasPrice = getGasPrice();

  const owedToken = owedBalance.tokenAddress.toLowerCase();
  const heldToken = heldBalance.tokenAddress.toLowerCase();

  let tokenPath: string[];
  if (owedToken === bridgeAddress || heldToken === bridgeAddress) {
    tokenPath = [heldBalance.tokenAddress, owedBalance.tokenAddress];
  } else {
    tokenPath = [heldBalance.tokenAddress, bridgeAddress, owedBalance.tokenAddress];
  }
  const revertOnFailToSellCollateral = process.env.DOLOMITE_REVERT_ON_FAIL_TO_SELL_COLLATERAL.toLowerCase() === 'true';

  return dolomite.liquidatorProxyWithAmm.liquidate(
    process.env.WALLET_ADDRESS,
    new BigNumber(process.env.DOLOMITE_ACCOUNT_NUMBER),
    liquidAccount.owner,
    liquidAccount.number,
    new BigNumber(owedBalance.marketId),
    new BigNumber(heldBalance.marketId),
    tokenPath,
    null,
    revertOnFailToSellCollateral,
    {
      gasPrice,
      from: sender,
      confirmationType: ConfirmationType.Hash,
    },
  );
}

async function liquidateAccountInternal(
  liquidAccount: ApiAccount,
  sender: string,
): Promise<TxResult> {
  const gasPrice = getGasPrice();

  return dolomite.liquidatorProxy.liquidate(
    process.env.WALLET_ADDRESS,
    new BigNumber(process.env.DOLOMITE_ACCOUNT_NUMBER),
    liquidAccount.owner,
    liquidAccount.number,
    new BigNumber(process.env.DOLOMITE_MIN_ACCOUNT_COLLATERALIZATION),
    new BigNumber(process.env.DOLOMITE_MIN_OVERHEAD_VALUE),
    owedPreferences.map((p) => new BigNumber(p)),
    collateralPreferences.map((p) => new BigNumber(p)),
    {
      gasPrice,
      from: sender,
      confirmationType: ConfirmationType.Hash,
    },
  );
}

export async function liquidateExpiredAccount(account: ApiAccount, markets: ApiMarket[], lastBlockTimestamp: DateTime) {
  if (process.env.DOLOMITE_EXPIRATIONS_ENABLED.toLowerCase() !== 'true') {
    return false;
  }

  Logger.info({
    at: 'dolomite-helpers#liquidateExpiredAccount',
    message: 'Starting account expiry liquidation',
    accountOwner: account.owner,
    accountNumber: account.number,
  });

  const sender = process.env.WALLET_ADDRESS;

  if (process.env.DOLOMITE_AUTO_SELL_COLLATERAL.toLowerCase() === 'true') {
    return liquidateExpiredAccountAndSellCollateralInternal(account, sender);
  } else {
    return liquidateExpiredAccountInternal(account, markets, sender, lastBlockTimestamp);
  }
}

async function liquidateExpiredAccountAndSellCollateralInternal(
  liquidAccount: ApiAccount,
  sender: string,
): Promise<TxResult | undefined> {
  if (!process.env.DOLOMITE_BRIDGE_CURRENCY_ADDRESS) {
    Logger.error({
      at: 'dolomite-helpers#liquidateExpiredAccountAndSellCollateralInternal',
      message: 'BRIDGE_CURRENCY_ADDRESS is not provided',
      error: new Error('BRIDGE_CURRENCY_ADDRESS is not provided'),
    });
    return Promise.resolve(undefined);
  }

  const gasPrice = getGasPrice();

  const bridgeAddress = process.env.DOLOMITE_BRIDGE_CURRENCY_ADDRESS.toLowerCase();
  const revertOnFailToSellCollateral = process.env.DOLOMITE_REVERT_ON_FAIL_TO_SELL_COLLATERAL.toLowerCase() === 'true';
  const owedBalance = Object.values(liquidAccount.balances)
    .filter(value => new BigNumber(value.wei).lt('0'))[0];

  const heldBalance = Object.values(liquidAccount.balances)
    .filter(value => new BigNumber(value.wei).gt('0'))[0];

  if (
    !owedBalance.expiryAddress
    || !owedBalance.expiresAt
    || owedBalance.expiryAddress.toLowerCase() !== dolomite.contracts.expiry.options.address.toLowerCase()
  ) {
    Logger.error({
      at: 'dolomite-helpers#liquidateExpiredAccountAndSellCollateralInternal',
      message: 'owedBalance does not expire or uses the wrong expiration contract address',
      error: new Error('owedBalance does not expire or uses the wrong expiration contract address'),
    });
    return Promise.resolve(undefined);
  }

  let tokenPath: string[];
  if (
    owedBalance.tokenAddress.toLowerCase() === bridgeAddress
    || heldBalance.tokenAddress.toLowerCase() === bridgeAddress
  ) {
    tokenPath = [heldBalance.tokenAddress, owedBalance.tokenAddress];
  } else {
    tokenPath = [heldBalance.tokenAddress, bridgeAddress, owedBalance.tokenAddress];
  }

  return dolomite.liquidatorProxyWithAmm.liquidate(
    process.env.WALLET_ADDRESS,
    new BigNumber(process.env.DOLOMITE_ACCOUNT_NUMBER),
    liquidAccount.owner,
    liquidAccount.number,
    new BigNumber(owedBalance.marketId),
    new BigNumber(heldBalance.marketId),
    tokenPath,
    owedBalance.expiresAt,
    revertOnFailToSellCollateral,
    {
      gasPrice,
      from: sender,
      confirmationType: ConfirmationType.Hash,
    },
  );
}

async function liquidateExpiredAccountInternal(
  account: ApiAccount,
  markets: ApiMarket[],
  sender: string,
  lastBlockTimestamp: DateTime,
) {
  const expiredMarkets: string[] = [];
  const operation = dolomite.operation.initiate();

  const weis: BigNumber[] = [];
  const prices: BigNumber[] = [];
  const liquidationRewardPremiums: BigNumber[] = [];
  const collateralPreferencesBN = collateralPreferences.map((p) => new BigNumber(p));

  for (let i = 0; i < collateralPreferences.length; i += 1) {
    const balance = account.balances[i];

    if (!balance) {
      weis.push(INTEGERS.ZERO);
    } else {
      weis.push(new BigNumber(balance.wei));
    }

    const market = markets.find(m => m.id === i);
    if (!market) {
      throw new Error(`Could not find market with ID ${i}`);
    }

    prices.push(new BigNumber(market.oraclePrice));
    liquidationRewardPremiums.push(new BigNumber(market.liquidationRewardPremium));
  }

  Object.keys(account.balances)
    .forEach((marketId) => {
      const balance = account.balances[marketId];

      // 0 indicates the balance never expires
      if (!balance.expiresAt || balance.expiresAt.eq(0)) {
        return;
      }

      // Can't expire positive balances
      if (!new BigNumber(balance.par).isNegative()) {
        return;
      }

      const expiryTimestamp = balance.expiresAt;
      const lastBlockTimestampBN = new BigNumber(Math.floor(lastBlockTimestamp.toMillis() / 1000));
      const delayHasPassed = expiryTimestamp.plus(process.env.DOLOMITE_EXPIRED_ACCOUNT_DELAY_SECONDS)
        .lte(lastBlockTimestampBN);

      if (delayHasPassed) {
        expiredMarkets.push(marketId);
        operation.fullyLiquidateExpiredAccountV2(
          process.env.WALLET_ADDRESS,
          new BigNumber(process.env.DOLOMITE_ACCOUNT_NUMBER),
          account.owner,
          account.number,
          new BigNumber(marketId),
          expiryTimestamp,
          lastBlockTimestampBN,
          weis,
          prices,
          liquidationRewardPremiums,
          collateralPreferencesBN,
        );
      }
    });

  if (expiredMarkets.length === 0) {
    throw new Error('Supposedly expirable account has no expirable balances');
  }

  return commitLiquidation(account, operation, sender);
}

async function commitLiquidation(account, operation, sender): Promise<boolean> {
  const gasPrice = getGasPrice();

  Logger.info({
    at: 'dolomite-helpers#commitLiquidation',
    message: 'Sending account liquidation transaction',
    accountOwner: account.owner,
    accountNumber: account.number,
    gasPrice,
    from: sender,
  });

  const response = await operation.commit({
    gasPrice,
    from: sender,
    confirmationType: ConfirmationType.Hash,
  });

  if (!response) {
    Logger.info({
      at: 'dolomite-helpers#commitLiquidation',
      message: 'Liquidation transaction has already been received',
      accountOwner: account.owner,
      accountNumber: account.number,
    });

    return false;
  }

  Logger.info({
    at: 'dolomite-helpers#commitLiquidation',
    message: 'Successfully submitted liquidation transaction',
    accountOwner: account.owner,
    accountNumber: account.number,
    response,
  });

  return !!response;
}
