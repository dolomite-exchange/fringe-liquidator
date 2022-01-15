import { DateTime } from 'luxon';
import {
  BigNumber,
} from '@dolomite-exchange/dolomite-margin';
import { AccountOperation } from '@dolomite-exchange/dolomite-margin/dist/src/modules/operate/AccountOperation';
import {
  ApiAccount,
  ApiMarket,
  ApiRiskParam,
} from '../src/lib/api-types';
import DolomiteLiquidator from '../src/lib/dolomite-liquidator';
import AccountStore from '../src/lib/account-store';
import MarketStore from '../src/lib/market-store';
import LiquidationStore from '../src/lib/liquidation-store';
import * as blockHelper from '../src/helpers/block-helper';
import { dolomite } from '../src/helpers/web3';
import Logger from '../src/lib/logger';
import RiskParamsStore from '../src/lib/risk-params-store';

jest.mock('@dolomite-exchange/dolomite-margin/dist/src/modules/operate/AccountOperation');
jest.mock('../src/helpers/block-helper');

describe('dolomite-liquidator', () => {
  let accountStore: AccountStore;
  let marketStore: MarketStore;
  let liquidationStore: LiquidationStore;
  let dolomiteLiquidator: DolomiteLiquidator;
  let riskParamsStore: RiskParamsStore;

  beforeEach(() => {
    jest.clearAllMocks();
    marketStore = new MarketStore();
    accountStore = new AccountStore(marketStore);
    liquidationStore = new LiquidationStore();
    riskParamsStore = new RiskParamsStore();
    dolomiteLiquidator = new DolomiteLiquidator(accountStore, marketStore, liquidationStore, riskParamsStore);
    (blockHelper.getLatestBlockTimestamp as any) = jest.fn().mockImplementation(
      async () => DateTime.utc(2020, 1, 1),
    );
  });

  describe('#_liquidateAccounts', () => {
    it('Successfully liquidates accounts without selling collateral', async () => {
      process.env.DOLOMITE_EXPIRATIONS_ENABLED = 'true';
      process.env.DOLOMITE_BRIDGE_CURRENCY_ADDRESS = getTestMarkets()[0].tokenAddress;
      process.env.DOLOMITE_AUTO_SELL_COLLATERAL = 'false';

      const liquidatableAccounts = getTestLiquidatableAccounts();
      const expiredAccounts = getTestExpiredAccounts();
      const markets = getTestMarkets();
      const riskParams = getTestRiskParams();
      accountStore.getLiquidatableDolomiteAccounts = jest.fn().mockImplementation(
        () => liquidatableAccounts,
      );
      accountStore.getExpirableDolomiteAccounts = jest.fn().mockImplementation(
        () => expiredAccounts,
      );
      marketStore.getDolomiteMarkets = jest.fn().mockImplementation(
        () => markets,
      );
      riskParamsStore.getDolomiteRiskParams = jest.fn().mockImplementation(
        () => riskParams
      )
      dolomite.getters.isAccountLiquidatable = jest.fn().mockImplementation(
        () => true,
      );

      let commitCount = 0;
      const liquidations: any[] = [];
      const liquidatableExpiredAccounts: any[] = [];
      (AccountOperation as any).mockImplementation(() => ({
        fullyLiquidateExpiredAccountV2: (...args) => {
          Logger.info('fullyLiquidateExpiredAccountV2');
          liquidatableExpiredAccounts.push(args);
        },
        commit: () => {
          commitCount += 1;
          return true;
        },
      }));
      dolomite.liquidatorProxy.liquidate = jest.fn().mockImplementation(
        (...args) => {
          liquidations.push(args);
          return { gas: 1 };
        },
      );

      await dolomiteLiquidator._liquidateAccounts();

      expect(liquidations.length).toBe(liquidatableAccounts.length);
      expect(commitCount).toBe(liquidatableExpiredAccounts.length);
      expect(liquidatableExpiredAccounts.length).toBe(1);

      const sortedLiquidations = liquidatableAccounts.map((account: ApiAccount) => {
        return liquidations.find((l) => l[2] === account.owner && l[3] === account.number);
      });

      expect(sortedLiquidations[0][0]).toBe(process.env.WALLET_ADDRESS);
      expect(sortedLiquidations[0][1].toFixed())
        .toBe(process.env.DOLOMITE_ACCOUNT_NUMBER);
      expect(sortedLiquidations[0][4].toFixed())
        .toBe(process.env.DOLOMITE_MIN_ACCOUNT_COLLATERALIZATION);
      expect(sortedLiquidations[0][5].toFixed())
        .toBe(new BigNumber(process.env.DOLOMITE_MIN_OVERHEAD_VALUE).toFixed());
      expect(sortedLiquidations[0][6])
        .toEqual(process.env.DOLOMITE_OWED_PREFERENCES.split(',')
          .map((p) => new BigNumber(p)));
      expect(sortedLiquidations[0][7])
        .toEqual(process.env.DOLOMITE_COLLATERAL_PREFERENCES.split(',')
          .map((p) => new BigNumber(p)));

      expect(sortedLiquidations[1][0]).toBe(process.env.WALLET_ADDRESS);
      expect(sortedLiquidations[1][1].toFixed())
        .toBe(process.env.DOLOMITE_ACCOUNT_NUMBER);
      expect(sortedLiquidations[1][4].toFixed())
        .toBe(process.env.DOLOMITE_MIN_ACCOUNT_COLLATERALIZATION);
      expect(sortedLiquidations[1][5].toFixed())
        .toBe(new BigNumber(process.env.DOLOMITE_MIN_OVERHEAD_VALUE).toFixed());
      expect(sortedLiquidations[1][6])
        .toEqual(process.env.DOLOMITE_OWED_PREFERENCES.split(',')
          .map((p) => new BigNumber(p)));
      expect(sortedLiquidations[1][7])
        .toEqual(process.env.DOLOMITE_COLLATERAL_PREFERENCES.split(',')
          .map((p) => new BigNumber(p)));

      expect(liquidatableExpiredAccounts[0][4].eq(new BigNumber(2))).toBe(true); // marketId
      expect(liquidatableExpiredAccounts[0][0]).toBe(process.env.WALLET_ADDRESS);
      expect(liquidatableExpiredAccounts[0][1])
        .toEqual(new BigNumber(process.env.DOLOMITE_ACCOUNT_NUMBER));
      expect(liquidatableExpiredAccounts[0][3]).toEqual(new BigNumber(22)); // liquidAccountNumber
    });
  });
});

function getTestLiquidatableAccounts(): ApiAccount[] {
  return [
    {
      id: '0x78F4529554137A9015dC653758aB600aBC2ffD48-0',
      owner: '0x78F4529554137A9015dC653758aB600aBC2ffD48',
      number: new BigNumber('0'),
      balances: {
        0: {
          par: new BigNumber('100'),
          wei: new BigNumber('200'),
          marketId: 0,
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
        },
        1: {
          par: new BigNumber('-15573'),
          wei: new BigNumber('-31146'),
          marketId: 1,
          tokenAddress: '0x0000000000000000000000000000000000000001',
          tokenSymbol: 'USDC',
        },
      },
    },
    {
      id: '0x78F4529554137A9015dC653758aB600aBC2ffD48-1',
      owner: '0x78F4529554137A9015dC653758aB600aBC2ffD48',
      number: new BigNumber('1'),
      balances: {
        0: {
          par: new BigNumber('-1010101010101010010101010010101010101001010'),
          wei: new BigNumber('-2010101010101010010101010010101010101001010'),
          marketId: 0,
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
        },
        1: {
          par: new BigNumber('1010101010101010010101010010101010101001010'),
          wei: new BigNumber('2010101010101010010101010010101010101001010'),
          marketId: 1,
          tokenAddress: '0x0000000000000000000000000000000000000001',
          tokenSymbol: 'USDC',
        },
      },
    },
  ];
}

function getTestExpiredAccounts(): ApiAccount[] {
  return [
    {
      id: '0x78F4529554137A9015dC653758aB600aBC2ffD48-22',
      owner: '0x78F4529554137A9015dC653758aB600aBC2ffD48',
      number: new BigNumber('22'),
      balances: {
        0: {
          par: new BigNumber('-1010101010101010010101010010101010101001010'),
          wei: new BigNumber('-2010101010101010010101010010101010101001010'),
          marketId: 0,
          tokenAddress: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          expiresAt: new BigNumber(Math.floor(new Date(2050, 5, 25).getTime() / 1000)),
          expiryAddress: dolomite.contracts.expiry.options.address,
        },
        1: {
          par: new BigNumber('1010101010101010010101010010101010101001010'),
          wei: new BigNumber('2010101010101010010101010010101010101001010'),
          marketId: 1,
          tokenAddress: '0x0000000000000000000000000000000000000001',
          tokenSymbol: 'USDC',
          expiresAt: undefined,
          expiryAddress: undefined,
        },
        2: {
          par: new BigNumber('-1010101010101010010101010010101010101001010'),
          wei: new BigNumber('-2010101010101010010101010010101010101001010'),
          marketId: 2,
          tokenAddress: '0x0000000000000000000000000000000000000002',
          tokenSymbol: 'DAI',
          expiresAt: new BigNumber(Math.floor(new Date(1982, 5, 25).getTime() / 1000)),
          expiryAddress: dolomite.contracts.expiry.options.address,
        },
        3: {
          marketId: 3,
          tokenAddress: '0x0000000000000000000000000000000000000003',
          tokenSymbol: 'LINK',
          par: new BigNumber('-1010101010101010010101010010101010101001010'),
          wei: new BigNumber('-2010101010101010010101010010101010101001010'),
        },
      },
    },
  ];
}

function getTestMarkets(): ApiMarket[] {
  return [
    {
      id: 0,
      tokenAddress: '0x0234567812345678123456781234567812345678',
      oraclePrice: new BigNumber('173192500000000000000'),
      marginPremium: new BigNumber('0'),
      liquidationRewardPremium: new BigNumber('0'),
    },
    {
      id: 1,
      tokenAddress: '0x1234567812345678123456781234567812345678',
      oraclePrice: new BigNumber('985976069960621971'),
      marginPremium: new BigNumber('0'),
      liquidationRewardPremium: new BigNumber('0'),
    },
    {
      id: 2,
      tokenAddress: '0x2234567812345678123456781234567812345678',
      oraclePrice: new BigNumber('985976069960621971'),
      marginPremium: new BigNumber('0'),
      liquidationRewardPremium: new BigNumber('0'),
    },
    {
      id: 3,
      tokenAddress: '0x3234567812345678123456781234567812345678',
      oraclePrice: new BigNumber('985976069960621971'),
      marginPremium: new BigNumber('0'),
      liquidationRewardPremium: new BigNumber('0'),
    },
  ];
}

function getTestRiskParams(): ApiRiskParam {
  return {
    liquidationRatio: new BigNumber('1150000000000000000'), // 115% or 1.15
    liquidationReward: new BigNumber('1050000000000000000'), // 105% or 1.05
  }
}
