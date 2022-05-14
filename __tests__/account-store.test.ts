import BigNumber from 'bignumber.js';
import AccountStore from '../src/lib/account-store';
import * as FringeClient from '../src/clients/fringe';

describe('fringe-liquidator', () => {
  let accountStore: AccountStore;

  beforeEach(() => {
    jest.clearAllMocks();
    accountStore = new AccountStore();
  });

  describe('#_update', () => {
    it('Successfully gets liquidatable accounts normally', async () => {
      // @ts-ignore
      // noinspection JSConstantReassignment
      FringeClient.getLiquidatableFringeAccountsFromNetwork = jest.fn().mockImplementation(() => {
        return Promise.resolve(JSON.parse(getTestLiquidatableAccounts()));
      });

      await accountStore._update();

      const liquidatableAccounts = accountStore.getLiquidatableFringeAccounts();
      expect(liquidatableAccounts.length).toEqual(11);
      expect(liquidatableAccounts.filter(account => account.healthFactor.lt('1')).length).toEqual(7);
      expect(liquidatableAccounts[0].owner).toEqual('0xf098e9a76145538c92c6146c4db40654f97ce82b');
      expect(liquidatableAccounts[0].lendingTokenAddress).toEqual('0x5236aab9f4b49bfd93a9500e427b042f65005e6a');
      expect(liquidatableAccounts[0].collateralTokenAddress).toEqual('0x40ea2e5c5b2104124944282d8db39c5d13ac6770');
      expect(liquidatableAccounts[0].totalOutstanding).toEqual(new BigNumber('44.444623'));
      expect(liquidatableAccounts[0].healthFactor.gte('1')).toEqual(true);
    });
  });
});

function getTestLiquidatableAccounts(): string {
  // eslint-disable-next-line max-len
  return '{"paging":{"currentPage":1,"pageSize":11,"totalCount":11,"totalPages":1},"data":[{"address":"f098e9a76145538c92c6146c4db40654f97ce82b","lendingTokenAddress":"5236aab9f4b49bfd93a9500e427b042f65005e6a","loanBalance":"44.346453","totalOutstanding":"44.444623","collateralTokenAddress":"40ea2e5c5b2104124944282d8db39c5d13ac6770","collateralBallance":"100.000000000000000000","healthFactor":"1.022152646001744687990715997298480853353171653632881529898453632962529573037440322083506029514526425"},{"address":"944257f641a3ff2d85156ef6a97b1b972e3ef2ba","lendingTokenAddress":"5236aab9f4b49bfd93a9500e427b042f65005e6a","loanBalance":"612.231027","totalOutstanding":"613.451108","collateralTokenAddress":"69648ef43b7496b1582e900569cd9ddec49c045e","collateralBallance":"100.000753473327468883","healthFactor":"0.9980192455696078064627116135227520038972690224564726028663395942549996991773303635470815711689936340"},{"address":"f1af3d7c15e40b3a42a85d29d7dd3e6801f976a3","lendingTokenAddress":"5236aab9f4b49bfd93a9500e427b042f65005e6a","loanBalance":"36.825277","totalOutstanding":"37.025656","collateralTokenAddress":"fa91a86700508806ad2a49bebce34a08c6ad7a65","collateralBallance":"0.613629783248002530","healthFactor":"0.9945881039892986636077426960375799958817745187283109852260281357337733597481702957538416064795718947"},{"address":"6ec0435da908de5d9322a38e60a428a11eafc7a0","lendingTokenAddress":"5236aab9f4b49bfd93a9500e427b042f65005e6a","loanBalance":"500.000296","totalOutstanding":"500.505150","collateralTokenAddress":"fa91a86700508806ad2a49bebce34a08c6ad7a65","collateralBallance":"10.000000000000000000","healthFactor":"1.199032781181172661260328689924569207729430955905248927009042764095434382643215559320418581107507086"},{"address":"1fcbbf86ac3d4ae9601ebc3c4a2adf72afccf497","lendingTokenAddress":"5236aab9f4b49bfd93a9500e427b042f65005e6a","loanBalance":"2000.000000","totalOutstanding":"2002.920088","collateralTokenAddress":"40ea2e5c5b2104124944282d8db39c5d13ac6770","collateralBallance":"5000.000000000000000000","healthFactor":"1.134073950632822251668385084367879184204377503851766251794664710557339020507142669388415460337626810"},{"address":"c2114274d86be287c790d18cf2aff1c312927f99","lendingTokenAddress":"5236aab9f4b49bfd93a9500e427b042f65005e6a","loanBalance":"599.963553","totalOutstanding":"600.093853","collateralTokenAddress":"c6636b088ab0f794ddfc1204e7c58d8148f62203","collateralBallance":"1.000000000000000000","healthFactor":"0.9997828672975925317468632694026279252688828992220988472614799472041917416541175601743749239837655861"},{"address":"0978c0a76ea13c318875df7e87bc3959d3ad2816","lendingTokenAddress":"5236aab9f4b49bfd93a9500e427b042f65005e6a","loanBalance":"2000.000000","totalOutstanding":"2002.885019","collateralTokenAddress":"40ea2e5c5b2104124944282d8db39c5d13ac6770","collateralBallance":"5100.000000000000000000","healthFactor":"1.156775683587056676666869612249069401022865207221363714239254589981033753990048691856534376524786419"},{"address":"944257f641a3ff2d85156ef6a97b1b972e3ef2ba","lendingTokenAddress":"5236aab9f4b49bfd93a9500e427b042f65005e6a","loanBalance":"599.963553","totalOutstanding":"601.154340","collateralTokenAddress":"c6636b088ab0f794ddfc1204e7c58d8148f62203","collateralBallance":"1.000000000000000000","healthFactor":"0.9980191659266736725214360092617812590357411376253226417694996596048861595177038894870159300521726251"},{"address":"c2114274d86be287c790d18cf2aff1c312927f99","lendingTokenAddress":"5236aab9f4b49bfd93a9500e427b042f65005e6a","loanBalance":"612.231399","totalOutstanding":"612.364516","collateralTokenAddress":"69648ef43b7496b1582e900569cd9ddec49c045e","collateralBallance":"100.000000000000000000","healthFactor":"0.9997826180379138754669449201070298462558206099583993531068674789118577863515527408514963659324767276"},{"address":"205d2cb6a93acbe59f69efeed82f2f6c0c885a81","lendingTokenAddress":"5236aab9f4b49bfd93a9500e427b042f65005e6a","loanBalance":"6001.220824","totalOutstanding":"6011.439766","collateralTokenAddress":"fa91a86700508806ad2a49bebce34a08c6ad7a65","collateralBallance":"100.000000000000000000","healthFactor":"0.9983000841066732232146597541072326199866310030328265290315478143975800422251124324082597819379032268"},{"address":"c2114274d86be287c790d18cf2aff1c312927f99","lendingTokenAddress":"5236aab9f4b49bfd93a9500e427b042f65005e6a","loanBalance":"5977.312813","totalOutstanding":"5978.609879","collateralTokenAddress":"37a7d483d2dfe97d0c00cef6f257e25d321e6d4e","collateralBallance":"1.000000000000000000","healthFactor":"0.9997830488982805228459363069941496679482538285217990889416920926343653807085946508870712017234132028"}]}';
}
