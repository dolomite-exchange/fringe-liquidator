import BigNumber from 'bignumber.js';

export interface ApiAccount {
  id: string;
  owner: string;
  lendingTokenAddress: string;
  collateralTokenAddress: string;
  // eslint-disable-next-line max-len
  totalOutstanding: BigNumber; // value of the debt accrued. Liquidation reward is `totalOutstanding * (1.00 + reward_percent)`
  healthFactor: BigNumber; // value of < 1 means it is liquidatable
}
