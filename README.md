<div style="text-align: center" align="center">
    <img src="https://d1fdloi71mui9q.cloudfront.net/MGdS5FKxT1mKvXFTRgSq_EGEicdODOa7Q2fJT" width="256" alt="Fringe Logo" />
</div>

<div style="text-align: center" align="center">
  <a href='https://hub.docker.com/r/dolomiteprotocol/fringe-liquidator' style="text-decoration:none;">
    <img src='https://img.shields.io/badge/docker-container-blue.svg?longCache=true' alt='Docker' />
  </a>
  <a href='https://github.com/dolomite-exchange/fringe-liquidator/blob/master/LICENSE' style="text-decoration:none;">
    <img src='https://img.shields.io/github/license/dolomite-exchange/fringe-liquidator.svg?longCache=true' alt='License' />
  </a>
  <a href='https://t.me/fringefinance' style="text-decoration:none;">
    <img src='https://img.shields.io/badge/chat-on%20telegram-9cf.svg?longCache=true' alt='Telegram' />
  </a>
</div>

# Fringe Liquidator

Bot to automatically liquidate undercollateralized Fringe accounts.

## Usage

### Docker

Requires a running [docker](https://docker.com) engine.

```
docker run \
  -e ACCOUNT_WALLET_ADDRESS=0x2c7536E3605D9C16a7a3D7b1898e529396a65c23 \
  -e ACCOUNT_WALLET_PRIVATE_KEY=0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318 \
  -e ETHEREUM_NODE_URL=https://matic-mumbai.chainstacklabs.com \
  -e FRINGE_LIQUIDATOR_ADDRESS=0x2D9346C4E84f2eC4F41881BaaCc83E85F11D6519 \
  -e GAS_REQUEST_API_KEY=YOUR_BLOCK_NATIVE_API_KEY \
  -e NETWORK_ID=4 \
  -e SEQUENTIAL_TRANSACTION_DELAY_MS=1000 \
  dolomiteprotocol/fringe-liquidator
```

## Overview

This service will automatically liquidate undercollateralized and/or expired accounts on Fringe.

This bot works for Fringe (Margin) accounts. Use the envvars `LIQUIDATIONS_ENABLED`, 

**Liquidations on Fringe happen between Accounts, but this bot uses flash loans to automatically close out under-
water accounts. You can also fund your Fringe Account on [app.fringe.fi](https://app.fringe.fi).**


## Configuration

### Environment Variables

| ENV Variable                       | Description                                                                                                                                                                                                                                                                                                                             |
|------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ACCOUNT_POLL_INTERVAL_MS           | How frequently to poll for liquidatable accounts. Defaults to `5000` milliseconds.                                                                                                                                                                                                                                                      |
| ACCOUNT_WALLET_ADDRESS             | **REQUIRED** Ethereum address of the Fringe account owner that will do the liquidations.                                                                                                                                                                                                                                                |
| ACCOUNT_WALLET_PRIVATE_KEY         | **REQUIRED** Ethereum private key the Fringe account owner that will do the liquidations. Make sure that "0x" is at the start of it (MetaMask exports private keys without it).                                                                                                                                                         |
| ETHEREUM_NODE_URL                  | **REQUIRED** The URL of the Ethereum node to use (e.g. an [Alchemy](https://alchemy.com) or [Infura](https://infura.io/) endpoint).                                                                                                                                                                                                     |
| FRINGE_LIQUIDATOR_ADDRESS          | **REQUIRED** The address used to perform liquidations on the Fringe Primary Lending contract.                                                                                                                                                                                                                                           |
| GAS_PRICE_MULTIPLIER               | How much to multiply the `fast` gas price by when sending transactions. Defaults to `1` but it is recommended users set this variable to something higher.                                                                                                                                                                              |
| GAS_PRICE_POLL_INTERVAL_MS         | How frequently to update the gas price. Defaults to `15000` milliseconds.                                                                                                                                                                                                                                                               |
| GAS_REQUEST_API_KEY                | The Blocknative API key used to ping for live Ethereum gas prices.                                                                                                                                                                                                                                                                      |
| INITIAL_GAS_PRICE_WEI              | The initial gas price used by the bot until the first successful poll occurs. Defaults to `10000000000` wei (10 gwei).                                                                                                                                                                                                                  |
| LIQUIDATE_POLL_INTERVAL_MS         | How frequently the bot should use current account, price, and market index data to check for liquidatable accounts and, if necessary, commit any liquidations on-chain. Defaults to `5000` milliseconds.                                                                                                                                |
| LIQUIDATION_KEY_EXPIRATION_SECONDS | Amount of time in seconds to wait before trying to liquidate the same account again. Defaults to `120` seconds.                                                                                                                                                                                                                         |
| LIQUIDATIONS_ENABLED               | Whether to liquidate Fringe accounts or not. Defaults to `true`.                                                                                                                                                                                                                                                                        |
| NETWORK_ID                         | **REQUIRED** Ethereum Network ID. This must match the chain ID sent back from `ETHEREUM_NODE_URL`.                                                                                                                                                                                                                                      |
| PRICE_POLL_INTERVAL_MS             | How frequently the bot should ping for the price of ETH, to be used to measure the economic value of performing a liquidation. Defaults to `15000` millis.                                                                                                                                                                              |
| SEQUENTIAL_TRANSACTION_DELAY_MS    | **REQUIRED** How long to wait between sending liquidation/expiration transactions. Useful for ensuring the liquidator's nonce is always correct and the market price has time to reach equilibrium between many sequential liquidations, in case these sequential liquidations push the price far away from the Chainlink oracle price. |
