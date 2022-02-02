// declare global env variable to define types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DOLOMITE_ACCOUNT_NUMBER: string,
      DOLOMITE_AUTO_SELL_COLLATERAL: string,
      DOLOMITE_REVERT_ON_FAIL_TO_SELL_COLLATERAL: string,
      DOLOMITE_MIN_OWED_OUTPUT_AMOUNT_DISCOUNT: string,
      DOLOMITE_BRIDGE_CURRENCY_ADDRESS: string,
      DOLOMITE_COLLATERAL_PREFERENCES: string,
      DOLOMITE_EXPIRATIONS_ENABLED: string,
      DOLOMITE_EXPIRED_ACCOUNT_DELAY_SECONDS: string,
      DOLOMITE_MIN_ACCOUNT_COLLATERALIZATION: string,
      DOLOMITE_MIN_OVERHEAD_VALUE: string,
      DOLOMITE_OWED_PREFERENCES: string,
      ETHEREUM_NODE_URL: string,
      LIQUIDATION_KEY_EXPIRATION_SEC: string,
      DELAY_BETWEEN_TRANSACTIONS_MILLIS: string,
      SUBGRAPH_URL: string,
      WALLET_ADDRESS: string,
    }
  }
}

export { };
