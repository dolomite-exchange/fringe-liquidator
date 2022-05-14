import BigNumber from 'bignumber.js';

export interface ApiAccount {
  id: string;
  owner: string;
  lendingTokenAddress: string;
  collateralTokenAddress: string;
  /**
   * The value of the debt accrued. Liquidation reward is `totalOutstanding * (1.00 + reward_percent)`
   */
  totalOutstanding: BigNumber;
  /**
   * A value less than 1 means it is liquidatable
   */
  healthFactor: BigNumber;
}
