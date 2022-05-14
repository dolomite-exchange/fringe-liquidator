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
  /**
   * The amount the liquidator will receive in terms of ETH (the gas token of the network). This number is in Wei
   * format, meaning it has 18 decimals of precision (1200000000000000000 == 1.2 ETH). This is used to determine if the
   * liquidation will be profitable or not
   */
  liquidationRewardGasToken: BigNumber;
}
