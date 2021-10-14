import { Web3, Solo as Dolomite } from '@dolomite-exchange/v2-protocol';
import Logger from '../lib/logger';

const WALLET_ADDRESS = process.env.WALLET_ADDRESS.toLowerCase();
const opts = { defaultAccount: WALLET_ADDRESS };

const provider: any = new Web3.providers.HttpProvider(process.env.ETHEREUM_NODE_URL);

export const dolomite = new Dolomite(
  provider,
  Number(process.env.NETWORK_ID),
  opts,
);

export async function loadAccounts() {
  if (!process.env.WALLET_PRIVATE_KEY) {
    Logger.error({
      at: 'web3#loadAccounts',
      message: 'WALLET_PRIVATE_KEY is not provided',
      error: new Error('WALLET_PRIVATE_KEY is not provided'),
    });
    return;
  }

  if (!process.env.WALLET_ADDRESS) {
    Logger.error({
      at: 'web3#loadAccounts',
      message: 'WALLET_ADDRESS is not provided',
      error: new Error('WALLET_ADDRESS is not provided'),
    });
    return;
  }

  const dolomiteAccount = dolomite.web3.eth.accounts.wallet.add(
    process.env.WALLET_PRIVATE_KEY,
  );

  const dolomiteAddress = dolomiteAccount.address.toLowerCase();

  if (dolomiteAddress !== WALLET_ADDRESS) {
    Logger.error({
      at: 'web3#loadAccounts',
      message: 'Owner private key does not match address',
      expected: process.env.WALLET_ADDRESS,
      dolomiteAddress: dolomiteAddress,
      error: new Error('Owner private key does not match address'),
    });
  } else {
    Logger.info({
      at: 'web3#loadAccounts',
      message: 'Loaded liquidator account',
      address: WALLET_ADDRESS,
    });
  }
}


export async function initializeDolomiteLiquidations() {
  const proxyAddress = dolomite.contracts.liquidatorProxyV1.options.address;
  const isProxyAproved = await dolomite.getters.getIsLocalOperator(
    WALLET_ADDRESS,
    proxyAddress,
    { from: WALLET_ADDRESS },
  );

  if (!isProxyAproved) {
    Logger.info({
      at: 'web3#loadAccounts',
      message: 'Liquidation proxy contract has not been approved. Approving...',
      address: WALLET_ADDRESS,
      proxyAddress,
    });

    await dolomite.permissions.approveOperator(
      proxyAddress,
      { from: WALLET_ADDRESS },
    );
  }
}
