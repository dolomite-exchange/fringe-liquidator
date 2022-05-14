import BigNumber from 'bignumber.js';
import { getGasPriceWeiForEip1559, updateGasPrice } from '../src/helpers/gas-price-helpers';
import AccountStore from '../src/lib/account-store';
import { ApiAccount } from '../src/lib/api-types';
import FringeLiquidator from '../src/lib/fringe-liquidator';
import LiquidationStore from '../src/lib/liquidation-store';
import * as fringeHelpers from '../src/helpers/fringe-helpers';

describe('fringe-liquidator', () => {
  let accountStore: AccountStore;
  let liquidationStore: LiquidationStore;
  let fringeLiquidator: FringeLiquidator;

  beforeEach(() => {
    jest.clearAllMocks();
    accountStore = new AccountStore();
    liquidationStore = new LiquidationStore();
    fringeLiquidator = new FringeLiquidator(accountStore, liquidationStore);
  });

  describe('#_liquidateAccounts', () => {
    it('Successfully liquidates accounts normally', async () => {
      const liquidatableAccounts = getTestLiquidatableAccounts();
      accountStore.getLiquidatableFringeAccounts = jest.fn().mockImplementation(() => liquidatableAccounts);

      const liquidations: any[] = [];
      // @ts-ignore
      // noinspection JSConstantReassignment
      fringeHelpers.liquidateAccount = jest.fn().mockImplementation((args) => {
        liquidations.push(args);
      });

      await fringeLiquidator._liquidateAccounts();

      const sortedLiquidations = liquidatableAccounts.map((account: ApiAccount) => {
        return liquidations.find((l) => (l as ApiAccount).id === account.id);
      });

      expect(sortedLiquidations[0]).toBe(liquidatableAccounts[0]);
      expect(sortedLiquidations[1]).toBe(liquidatableAccounts[1]);
    });

    it('Should get gas price without a problem from Blocknative', async () => {
      // The API key is in the .env.production file, so we must load it in here.
      process.env.NODE_ENV = 'production';
      require('dotenv-flow').config();
      process.env.NETWORK_ID = '1';
      await updateGasPrice();
      const gasFees = getGasPriceWeiForEip1559();
      expect(gasFees).toBeDefined();

      const oneEth = new BigNumber('1000000000000000000');
      const oneGwei = new BigNumber('1000000000');
      expect(gasFees?.maxFeePerGas.gt(oneGwei)).toEqual(true);
      expect(gasFees?.maxFeePerGas.lt(oneEth)).toEqual(true);
      expect(gasFees?.priorityFee.gt(oneGwei)).toEqual(true);
      expect(gasFees?.priorityFee.lt(oneEth)).toEqual(true);
    });
  });
});

function getTestLiquidatableAccounts(): ApiAccount[] {
  const weth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
  const usdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  return [
    {
      id: '0x78F4529554137A9015dC653758aB600aBC2ffD48',
      owner: '0x78F4529554137A9015dC653758aB600aBC2ffD48',
      lendingTokenAddress: usdc,
      collateralTokenAddress: weth,
      totalOutstanding: new BigNumber('6000.42'),
      healthFactor: new BigNumber('0.98'),
    },
    {
      id: '0x48F4529554137A9015dC653758aB600aBC2ffD48',
      owner: '0x48F4529554137A9015dC653758aB600aBC2ffD48',
      lendingTokenAddress: usdc,
      collateralTokenAddress: weth,
      totalOutstanding: new BigNumber('124000.25'),
      healthFactor: new BigNumber('0.95'),
    },
  ];
}
