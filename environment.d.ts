// declare global env variable to define types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ACCOUNT_WALLET_ADDRESS: string,
      AUTO_SELL_COLLATERAL: string,
      DOLOMITE_ACCOUNT_NUMBER: string,
      MIN_OWED_OUTPUT_AMOUNT_DISCOUNT: string,
      BRIDGE_TOKEN_ADDRESS: string,
      COLLATERAL_PREFERENCES: string,
      EXPIRATIONS_ENABLED: string,
      EXPIRED_ACCOUNT_DELAY_SECONDS: string,
      GAS_PRICE_ADDITION: string,
      GAS_PRICE_MULTIPLIER: string,
      MIN_ACCOUNT_COLLATERALIZATION: string,
      MIN_OVERHEAD_VALUE: string,
      OWED_PREFERENCES: string,
      INITIAL_GAS_PRICE_WEI: string,
      ETHEREUM_NODE_URL: string,
      LIQUIDATION_KEY_EXPIRATION_SECONDS: string,
      REVERT_ON_FAIL_TO_SELL_COLLATERAL: string,
      SEQUENTIAL_TRANSACTION_DELAY_MS: string,
      SUBGRAPH_URL: string,
    }
  }
}

export { };
