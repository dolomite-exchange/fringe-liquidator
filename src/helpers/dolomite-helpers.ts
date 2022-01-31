import {
  BigNumber,
  Integer,
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

const collateralPreferences: string[] = process.env.DOLOMITE_COLLATERAL_PREFERENCES.split(',')
  .map((pref) => pref.trim());
const owedPreferences: string[] = process.env.DOLOMITE_OWED_PREFERENCES.split(',')
  .map((pref) => pref.trim());

export function isExpired(
  expiresAt: Integer | null,
  latestBlockTimestamp: DateTime,
): boolean {
  let expiresAtPlusDelay = expiresAt?.plus(process.env.DOLOMITE_EXPIRED_ACCOUNT_DELAY_SECONDS);
  return expiresAtPlusDelay?.lt(latestBlockTimestamp.toSeconds()) ?? false;
}

export async function liquidateAccount(
  liquidAccount: ApiAccount,
  lastBlockTimestamp: DateTime,
  blockNumber: number,
): Promise<TxResult | undefined> {
  if (process.env.DOLOMITE_LIQUIDATIONS_ENABLED !== 'true') {
    return undefined;
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
    { blockNumber },
  );

  if (!liquidatable) {
    Logger.info({
      at: 'dolomite-helpers#liquidateAccount',
      message: 'Account is not liquidatable',
      accountOwner: liquidAccount.owner,
      accountNumber: liquidAccount.number,
    });

    return undefined;
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
    return Promise.reject(new Error('Supposedly liquidatable account has no borrows'));
  }

  if (supplyMarkets.length === 0) {
    return Promise.reject(new Error('Supposedly liquidatable account has no collateral'));
  }

  if (process.env.DOLOMITE_AUTO_SELL_COLLATERAL.toLowerCase() === 'true') {
    return liquidateAccountInternalAndSellCollateral(liquidAccount, sender, lastBlockTimestamp, false);
  } else {
    return liquidateAccountInternal(liquidAccount, sender);
  }
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

export async function liquidateExpiredAccount(
  account: ApiAccount,
  marketMap: { [marketId: string]: ApiMarket },
  lastBlockTimestamp: DateTime,
) {
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
    return liquidateAccountInternalAndSellCollateral(account, sender, lastBlockTimestamp, true);
  } else {
    return liquidateExpiredAccountInternal(account, marketMap, sender, lastBlockTimestamp);
  }
}

async function liquidateAccountInternalAndSellCollateral(
  liquidAccount: ApiAccount,
  sender: string,
  lastBlockTimestamp: DateTime,
  isExpiring: boolean,
): Promise<TxResult> {
  if (!process.env.DOLOMITE_BRIDGE_CURRENCY_ADDRESS) {
    const message = 'DOLOMITE_BRIDGE_CURRENCY_ADDRESS is not provided';
    Logger.error({
      at: 'dolomite-helpers#liquidateAccountInternalAndSellCollateral',
      message,
    });
    return Promise.reject(new Error(message));
  }
  if (!process.env.DOLOMITE_ACCOUNT_NUMBER) {
    const message = 'DOLOMITE_ACCOUNT_NUMBER is not provided';
    Logger.error({
      at: 'dolomite-helpers#liquidateAccountInternalAndSellCollateral',
      message,
    });
    return Promise.reject(new Error(message));
  }
  if (!process.env.DOLOMITE_REVERT_ON_FAIL_TO_SELL_COLLATERAL) {
    const message = 'DOLOMITE_REVERT_ON_FAIL_TO_SELL_COLLATERAL is not provided';
    Logger.error({
      at: 'dolomite-helpers#liquidateAccountInternalAndSellCollateral',
      message,
    });
    return Promise.reject(new Error(message));
  }

  const bridgeAddress = process.env.DOLOMITE_BRIDGE_CURRENCY_ADDRESS.toLowerCase();
  const owedBalance = Object.values(liquidAccount.balances)
    .filter(balance => {
      if (isExpiring) {
        // Return any market that has expired and is borrowed (negative)
        return isExpired(balance.expiresAt, lastBlockTimestamp) && balance.wei.lt('0');
      } else {
        return balance.wei.lt('0');
      }
    })[0];
  const heldBalance = Object.values(liquidAccount.balances)
    .filter(value => value.wei.gt('0'))
    [0];
  const gasPrice = getGasPrice();

  const owedToken = owedBalance.tokenAddress.toLowerCase();
  const heldToken = heldBalance.tokenAddress.toLowerCase();

  let tokenPath: string[];
  if (owedToken === bridgeAddress || heldToken === bridgeAddress) {
    tokenPath = [heldBalance.tokenAddress, owedBalance.tokenAddress];
  } else {
    tokenPath = [heldBalance.tokenAddress, bridgeAddress, owedBalance.tokenAddress];
  }

  const minOwedOutputDiscount = new BigNumber(process.env.DOLOMITE_MIN_OWED_OUTPUT_AMOUNT_DISCOUNT);
  if (minOwedOutputDiscount.gte(INTEGERS.ONE)) {
    return Promise.reject(new Error('DOLOMITE_MIN_OWED_OUTPUT_AMOUNT_DISCOUNT must be less than 1.00'));
  } else if (minOwedOutputDiscount.lt(INTEGERS.ZERO)) {
    return Promise.reject(new Error('DOLOMITE_MIN_OWED_OUTPUT_AMOUNT_DISCOUNT must be greater than or equal to 0'));
  }

  const minOwedOutputAmount = owedBalance.wei.abs()
    .times(INTEGERS.ONE.minus(minOwedOutputDiscount))
    .integerValue(BigNumber.ROUND_FLOOR);
  const revertOnFailToSellCollateral = process.env.DOLOMITE_REVERT_ON_FAIL_TO_SELL_COLLATERAL.toLowerCase() === 'true';

  return dolomite.liquidatorProxyWithAmm.liquidate(
    process.env.WALLET_ADDRESS,
    new BigNumber(process.env.DOLOMITE_ACCOUNT_NUMBER),
    liquidAccount.owner,
    liquidAccount.number,
    new BigNumber(owedBalance.marketId),
    new BigNumber(heldBalance.marketId),
    tokenPath,
    isExpiring ? (owedBalance.expiresAt ?? null) : null,
    minOwedOutputAmount,
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
  marketMap: { [marketId: string]: ApiMarket },
  sender: string,
  lastBlockTimestamp: DateTime,
) {
  const expiredMarkets: string[] = [];
  const operation = dolomite.operation.initiate();

  const weis: { [marketId: string]: Integer } = {};
  const prices: { [marketId: string]: Integer } = {};
  const liquidationRewardPremiums: { [marketId: string]: Integer } = {};
  const collateralPreferencesBN = collateralPreferences.map((p) => new BigNumber(p));

  for (let i = 0; i < collateralPreferences.length; i += 1) {
    const marketId = collateralPreferences[i];
    const balance = account.balances[marketId];

    if (!balance) {
      weis[marketId] = INTEGERS.ZERO;
    } else {
      weis[marketId] = new BigNumber(balance.wei);
    }

    const market = marketMap[marketId];
    if (!market) {
      throw new Error(`Could not find API market with ID ${marketId}`);
    }

    prices[marketId] = market.oraclePrice;
    liquidationRewardPremiums[marketId] = market.liquidationRewardPremium;
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
        operation.fullyLiquidateExpiredAccount(
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
