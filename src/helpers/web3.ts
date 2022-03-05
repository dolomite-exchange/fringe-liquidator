import {
  DolomiteMargin,
  Web3,
} from '@dolomite-exchange/dolomite-margin';
import Logger from '../lib/logger';
import { ChainId } from '../lib/chain-id';

const ACCOUNT_WALLET_ADDRESS = process.env.ACCOUNT_WALLET_ADDRESS.toLowerCase();
const opts = { defaultAccount: ACCOUNT_WALLET_ADDRESS };

const provider: any = new Web3.providers.HttpProvider(process.env.ETHEREUM_NODE_URL);

const networkId = Number(process.env.NETWORK_ID);
if (Object.keys(ChainId).indexOf(networkId.toString()) === -1) {
  throw new Error(`Invalid networkId ${networkId}`)
}

export const dolomite = new DolomiteMargin(
  provider,
  Number(process.env.NETWORK_ID),
  opts,
);

export async function loadAccounts() {
  if (!process.env.ACCOUNT_WALLET_PRIVATE_KEY) {
    Logger.error({
      at: 'web3#loadAccounts',
      message: 'ACCOUNT_WALLET_PRIVATE_KEY is not provided',
      error: new Error('ACCOUNT_WALLET_PRIVATE_KEY is not provided'),
    });
    return;
  }

  if (!process.env.ACCOUNT_WALLET_ADDRESS) {
    Logger.error({
      at: 'web3#loadAccounts',
      message: 'ACCOUNT_WALLET_ADDRESS is not provided',
      error: new Error('ACCOUNT_WALLET_ADDRESS is not provided'),
    });
    return;
  }

  const dolomiteAccount = dolomite.web3.eth.accounts.wallet.add(
    process.env.ACCOUNT_WALLET_PRIVATE_KEY,
  );

  const dolomiteAddress = dolomiteAccount.address.toLowerCase();

  if (dolomiteAddress !== ACCOUNT_WALLET_ADDRESS) {
    Logger.error({
      dolomiteAddress,
      at: 'web3#loadAccounts',
      message: 'Owner private key does not match address',
      expected: process.env.ACCOUNT_WALLET_ADDRESS,
      error: new Error('Owner private key does not match address'),
    });
  } else {
    Logger.info({
      at: 'web3#loadAccounts',
      message: 'Loaded liquidator account',
      address: ACCOUNT_WALLET_ADDRESS,
      accountNumber: process.env.DOLOMITE_ACCOUNT_NUMBER,
    });
  }
}

export async function initializeDolomiteLiquidations() {
  await checkOperatorIsApproved(dolomite.contracts.liquidatorProxyV1.options.address);
  await checkOperatorIsApproved(dolomite.contracts.liquidatorProxyV1WithAmm.options.address);
}

async function checkOperatorIsApproved(operator: string) {
  if (!(await getIsGlobalOperator(operator)) && !(await getIsLocalOperator(operator))) {
    Logger.info({
      at: 'web3#loadAccounts',
      message: `Proxy contract at ${operator} has not been approved. Approving...`,
      address: ACCOUNT_WALLET_ADDRESS,
      operator,
    });

    await dolomite.permissions.approveOperator(
      operator,
      { from: ACCOUNT_WALLET_ADDRESS },
    );
  }
}

async function getIsGlobalOperator(operator: string): Promise<boolean> {
  return dolomite.getters.getIsGlobalOperator(
    operator,
    { from: ACCOUNT_WALLET_ADDRESS },
  );
}

async function getIsLocalOperator(operator: string): Promise<boolean> {
  return dolomite.getters.getIsLocalOperator(
    ACCOUNT_WALLET_ADDRESS,
    operator,
    { from: ACCOUNT_WALLET_ADDRESS },
  );
}
