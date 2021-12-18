// declare global env variable to define types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ETHEREUM_NODE_URL: string,
      LIQUIDATION_KEY_EXPIRATION_SEC: string,
      DOLOMITE_ACCOUNT_NUMBER: string,
      DOLOMITE_AUTO_SELL_COLLATERAL: boolean,
      DOLOMITE_REVERT_ON_FAIL_TO_SELL_COLLATERAL: boolean,
      DOLOMITE_BRIDGE_CURRENCY_ADDRESS: string,
      DOLOMITE_COLLATERAL_PREFERENCES: string,
      DOLOMITE_EXPIRATIONS_ENABLED: string,
      DOLOMITE_EXPIRED_ACCOUNT_DELAY_SECONDS: string,
      DOLOMITE_MIN_ACCOUNT_COLLATERALIZATION: string,
      DOLOMITE_MIN_OVERHEAD_VALUE: string,
      DOLOMITE_OWED_PREFERENCES: string,
      WALLET_ADDRESS: string,
    }
  }
}

export { };
