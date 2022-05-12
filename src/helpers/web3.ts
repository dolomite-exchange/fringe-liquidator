import ethers, { Wallet } from 'ethers';
import { ChainId } from '../lib/chain-id';
import Logger from '../lib/logger';

const accountWalletAddress = process.env.ACCOUNT_WALLET_ADDRESS.toLowerCase();

export const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_NODE_URL);
let wallet: Wallet;

export function signer(): Wallet {
  return wallet;
}

const networkId = Number(process.env.NETWORK_ID);
if (Object.keys(ChainId).indexOf(networkId.toString()) === -1) {
  throw new Error(`Invalid networkId ${networkId}`)
}

export async function loadAccounts() {
  if (!process.env.ACCOUNT_WALLET_PRIVATE_KEY) {
    const errorMessage = 'ACCOUNT_WALLET_PRIVATE_KEY is not provided';
    Logger.error({
      at: 'web3#loadAccounts',
      message: errorMessage,
    });
    return Promise.reject(new Error(errorMessage));
  }

  wallet = new ethers.Wallet(process.env.ACCOUNT_WALLET_PRIVATE_KEY, provider)

  if (!process.env.ACCOUNT_WALLET_ADDRESS) {
    const errorMessage = 'ACCOUNT_WALLET_ADDRESS is not provided';
    Logger.error({
      at: 'web3#loadAccounts',
      message: errorMessage,
    });
    return Promise.reject(new Error(errorMessage));
  }

  if (wallet.address.toLowerCase() !== accountWalletAddress) {
    Logger.error({
      at: 'web3#loadAccounts',
      message: 'Owner private key does not match ENV variable address',
      privateKeyResolvesTo: wallet.address.toLowerCase(),
      environmentVariable: accountWalletAddress.toLowerCase(),
    });
    return Promise.reject(new Error('Owner private key does not match address'));
  }

  Logger.info({
    at: 'web3#loadAccounts',
    message: 'Loaded liquidator account',
    accountWalletAddress,
  });
  return Promise.resolve(wallet.address);
}
