// declare global env variable to define types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ACCOUNT_WALLET_ADDRESS: string,
      BRIDGE_TOKEN_ADDRESS: string,
      GAS_PRICE_ADDITION: string,
      GAS_PRICE_MULTIPLIER: string,
      GAS_REQUEST_API_KEY: string,
      INITIAL_GAS_PRICE_WEI: string,
      ETHEREUM_NODE_URL: string,
      LIQUIDATION_KEY_EXPIRATION_SECONDS: string,
      SEQUENTIAL_TRANSACTION_DELAY_MS: string,
    }
  }
}

export { };
