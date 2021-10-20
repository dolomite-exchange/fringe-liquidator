import { BigNumber } from '@dolomite-exchange/v2-protocol';
import { ConfirmationType } from '@dolomite-exchange/v2-protocol/dist/src/types';
import { DateTime } from 'luxon';
import { dolomite } from './web3';
import { getLatestBlockTimestamp } from './block-helper';
import { getGasPrice } from '../lib/gas-price';
import Logger from '../lib/logger';
import { ApiAccount, ApiMarket } from '../lib/api-types';

const collateralPreferences = process.env.DOLOMITE_COLLATERAL_PREFERENCES.split(',')
  .map((pref) => pref.trim());
const owedPreferences = process.env.DOLOMITE_OWED_PREFERENCES.split(',')
  .map((pref) => pref.trim());

export async function liquidateAccount(liquidAccount: ApiAccount) {
  if (process.env.DOLOMITE_LIQUIDATIONS_ENABLED !== 'true') {
    return;
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

    return;
  }

  const sender = process.env.WALLET_ADDRESS;
  const borrowMarkets: string[] = [];
  const supplyMarkets: string[] = [];

  Object.keys(liquidAccount.balances).forEach((marketId) => {
    const par = new BigNumber(liquidAccount.balances[marketId].par);

    if (par.lt(new BigNumber(0))) {
      borrowMarkets.push(marketId);
    } else if (par.gt(new BigNumber(0))) {
      supplyMarkets.push(marketId);
    }
  });

  if (borrowMarkets.length === 0) {
    throw new Error('Supposedly liquidatable account has no borrows');
  }

  if (supplyMarkets.length === 0) {
    throw new Error('Supposedly liquidatable account has no collateral');
  }

  const gasPrice = getGasPrice();

  if (process.env.AUTO_SELL_COLLATERAL) {
    if (!process.env.BASE_CURRENCY_ADDRESS) {
      Logger.error({
        at: 'dolomite-helpers#liquidate',
        message: 'BASE_CURRENCY_ADDRESS is not provided',
        error: new Error('BASE_CURRENCY_ADDRESS is not provided'),
      });
      return;
    }

    const baseAddress = process.env.BASE_CURRENCY_ADDRESS.toLowerCase();
    const revertOnFailToSellCollateral = false; // for readability
    const owedBalance = Object.values(liquidAccount.balances).filter(value => new BigNumber(value.wei).lt('0'))[0];
    const heldBalance = Object.values(liquidAccount.balances).filter(value => new BigNumber(value.wei).gt('0'))[0];
    let tokenPath: string[];
    if (
      owedBalance.tokenAddress.toLowerCase() === baseAddress
        || heldBalance.tokenAddress.toLowerCase() === baseAddress
    ) {
      tokenPath = [heldBalance.tokenAddress, owedBalance.tokenAddress];
    } else {
      tokenPath = [heldBalance.tokenAddress, baseAddress, owedBalance.tokenAddress];
    }
    await dolomite.liquidatorProxyWithAmm.liquidate(
      process.env.WALLET_ADDRESS,
      new BigNumber(process.env.DOLOMITE_ACCOUNT_NUMBER),
      liquidAccount.owner,
      new BigNumber(liquidAccount.number),
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
  } else {
    await dolomite.liquidatorProxy.liquidate(
      process.env.WALLET_ADDRESS,
      new BigNumber(process.env.DOLOMITE_ACCOUNT_NUMBER),
      liquidAccount.owner,
      new BigNumber(liquidAccount.number),
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
}

export async function liquidateExpiredAccount(account: ApiAccount, markets: ApiMarket[]): Promise<boolean> {
  if (process.env.DOLOMITE_EXPIRATIONS_ENABLED !== 'true') {
    return false;
  }

  Logger.info({
    at: 'dolomite-helpers#liquidateExpiredAccount',
    message: 'Starting account expiry liquidation',
    accountOwner: account.owner,
    accountNumber: account.number,
  });

  const sender = process.env.WALLET_ADDRESS;
  const lastBlockTimestamp = await getLatestBlockTimestamp();

  const expiredMarkets: string[] = [];
  const operation = dolomite.operation.initiate();

  const weis: BigNumber[] = [];
  const prices: BigNumber[] = [];
  const liquidationRewardPremiums: BigNumber[] = [];
  const collateralPreferencesBN = collateralPreferences.map((p) => new BigNumber(p));

  for (let i = 0; i < collateralPreferences.length; i += 1) {
    const balance = account.balances[i];

    if (!balance) {
      weis.push(new BigNumber(0));
    } else {
      weis.push(new BigNumber(balance.wei));
    }

    const market = markets.find(m => m.id === i);
    if (!market) {
      throw new Error(`Could not find market with ID ${i}`)
    }

    prices.push(new BigNumber(market.oraclePrice));
    liquidationRewardPremiums.push(new BigNumber(market.liquidationRewardPremium));
  }

  Object.keys(account.balances).forEach((marketId) => {
    const balance = account.balances[marketId];

    // 0 indicates the balance never expires
    if (!balance.expiresAt || new BigNumber(balance.expiresAt).eq(0)) {
      return;
    }

    // Can't expire positive balances
    if (!new BigNumber(balance.par).isNegative()) {
      return;
    }

    const isV2Expiry = balance.expiryAddress
      && (
        balance.expiryAddress.toLowerCase()
        === dolomite.contracts.expiryV2.options.address.toLowerCase()
      );
    const expiryTimestamp = DateTime.fromISO(balance.expiresAt);
    const expiryTimestampBN = new BigNumber(Math.floor(expiryTimestamp.toMillis() / 1000));
    const lastBlockTimestampBN = new BigNumber(Math.floor(lastBlockTimestamp.toMillis() / 1000));
    const delayHasPassed = expiryTimestampBN.plus(process.env.DOLOMITE_EXPIRED_ACCOUNT_DELAY_SECONDS)
      .lte(lastBlockTimestampBN);

    if (isV2Expiry && delayHasPassed) {
      expiredMarkets.push(marketId);
      operation.fullyLiquidateExpiredAccountV2(
        process.env.WALLET_ADDRESS,
        new BigNumber(process.env.DOLOMITE_ACCOUNT_NUMBER),
        account.owner,
        new BigNumber(account.number),
        new BigNumber(marketId),
        expiryTimestampBN,
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