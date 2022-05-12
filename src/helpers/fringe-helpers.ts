import { BaseContract, ContractTransaction } from 'ethers';
import { ApiAccount } from '../lib/api-types';
import { ChainId } from '../lib/chain-id';
import Logger from '../lib/logger';
import { RinkebyLiquidator, RinkebyLiquidator__factory } from '../types';
import { getGasPriceWei, getGasPriceWeiForEip1559 } from './gas-price-helpers';
import { signer } from './web3';

export async function liquidateAccount(
  liquidAccount: ApiAccount,
): Promise<ContractTransaction | undefined> {
  if (process.env.LIQUIDATIONS_ENABLED !== 'true') {
    return undefined;
  }

  Logger.info({
    at: 'fringe-helpers#liquidateAccount',
    message: 'Starting account liquidation',
    accountOwner: liquidAccount.owner,
    collateralToken: liquidAccount.collateralTokenAddress,
    lendingToken: liquidAccount.lendingTokenAddress,
    totalOutstanding: liquidAccount.totalOutstanding,
  });

  try {
    const transaction: ContractTransaction = await liquidateAccountInternal(liquidAccount);
    Logger.info({
      at: 'fringe-helpers#liquidateAccount',
      message: 'Transaction information',
      transactionHash: transaction.hash,
      gasPrice: transaction.gasPrice?.toString(),
      maxFeePerGas: transaction.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString(),
    });
    return transaction
  } catch (e) {
    Logger.info({
      at: 'fringe-helpers#liquidateAccount',
      message: 'Account is not liquidatable',
      accountOwner: liquidAccount.owner,
    });
    return undefined;
  }
}

async function liquidateAccountInternal(
  liquidAccount: ApiAccount,
): Promise<ContractTransaction> {
  const eip1559GasPrice = getGasPriceWeiForEip1559();
  const gasPrice = getGasPriceWei();

  const liquidationContract = new BaseContract(
    process.env.FRINGE_ADDRESS as string,
    RinkebyLiquidator__factory.createInterface(),
    signer(),
  ) as RinkebyLiquidator;

  const flashLoanAddress = getFlashLoanAddress(liquidAccount);

  try {
    const gasLimit = await liquidationContract.estimateGas.liquidate(
      liquidAccount.owner,
      liquidAccount.collateralTokenAddress,
      liquidAccount.lendingTokenAddress,
      flashLoanAddress,
    );
    const gasPriceData = {
      gasPrice: eip1559GasPrice ? undefined : gasPrice.toFixed(),
      maxFeePerGas: eip1559GasPrice?.maxFeePerGas.toFixed(),
      maxPriorityFeePerGas: eip1559GasPrice?.priorityFee.toFixed(),
    }
    return liquidationContract.liquidate(
      liquidAccount.owner,
      liquidAccount.collateralTokenAddress,
      liquidAccount.lendingTokenAddress,
      flashLoanAddress,
      {
        gasLimit,
        ...gasPriceData,
      },
    );
  } catch (e) {
    return Promise.reject(new Error(`Could not get gas limit for liquidation: ${JSON.stringify(liquidAccount)}`));
  }
}

function getFlashLoanAddress(liquidAccount: ApiAccount): string {
  const networkId = Number(process.env.NETWORK_ID)
  const collateralTokenAddress = liquidAccount.collateralTokenAddress.toLowerCase()
  const lendingTokenAddress = liquidAccount.lendingTokenAddress.toLowerCase()

  if (networkId === ChainId.Ethereum) {
    const ethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'.toLowerCase();
    const usdcAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'.toLowerCase();
    if (
      (collateralTokenAddress === ethAddress && lendingTokenAddress === usdcAddress)
      || (collateralTokenAddress === usdcAddress && lendingTokenAddress === ethAddress)
    ) {
      // We're liquidating ETH/USDC, so we need to use the ETH-DAI pool
      return '0xae461ca67b15dc8dc81ce7615e0320da1a9ab8d5'.toLowerCase();
    } else {
      // Liquidate using the ETH/USDC pool
      return '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc'.toLowerCase();
    }
  } else if (networkId === ChainId.Rinkeby) {
    const prj6Address = '0x16E2f279A9BabD4CE133745DdA69C910CBe2e490'.toLowerCase();
    const usdcAddress = '0x5236aAB9f4b49Bfd93a9500E427B042f65005E6A'.toLowerCase();
    if (
      (collateralTokenAddress === prj6Address && lendingTokenAddress === usdcAddress)
      || (collateralTokenAddress === usdcAddress && lendingTokenAddress === prj6Address)
    ) {
      // We're liquidating PRJ6/USDC, so we need to use the PRJ4/USDC pool
      return '0x6d5e5b430a5ae439c7d5892e26bd539e3b5f8e77'.toLowerCase();
    } else {
      // Liquidate using the PRJ6/USDC pool
      return '0xe5eb9a95a9b71aee01914ae2f6c3dcccb7ac1791'.toLowerCase();
    }
  } else {
    throw new Error(`Could not get flash loan address for network: ${networkId}`)
  }
}
