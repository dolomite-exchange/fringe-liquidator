import { Web3, DolomiteMargin } from '@dolomite-exchange/dolomite-margin';
import Logger from '../lib/logger';

const WALLET_ADDRESS = process.env.WALLET_ADDRESS.toLowerCase();
const opts = { defaultAccount: WALLET_ADDRESS };

const provider: any = new Web3.providers.HttpProvider(process.env.ETHEREUM_NODE_URL);

export const dolomite = new DolomiteMargin(
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
      dolomiteAddress,
      at: 'web3#loadAccounts',
      message: 'Owner private key does not match address',
      expected: process.env.WALLET_ADDRESS,
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
  await checkOperatorIsApproved(dolomite.contracts.liquidatorProxyV1.options.address);
  await checkOperatorIsApproved(dolomite.contracts.liquidatorProxyV1WithAmm.options.address);
}

async function checkOperatorIsApproved(operator: string) {
  if (!(await getIsGlobalOperator(operator)) && !(await getIsLocalOperator(operator))) {
    Logger.info({
      at: 'web3#loadAccounts',
      message: `Proxy contract at ${operator} has not been approved. Approving...`,
      address: WALLET_ADDRESS,
      operator,
    });

    await dolomite.permissions.approveOperator(
      operator,
      { from: WALLET_ADDRESS },
    );
  }
}

async function getIsGlobalOperator(operator: string): Promise<boolean> {
  return dolomite.getters.getIsGlobalOperator(
    operator,
    { from: WALLET_ADDRESS },
  );
}

async function getIsLocalOperator(operator: string): Promise<boolean> {
  return dolomite.getters.getIsLocalOperator(
    WALLET_ADDRESS,
    operator,
    { from: WALLET_ADDRESS },
  );
}
