<p align="center"><img src="https://dolomite.io/assets/img/logo.png" width="256" /></p>

<div align="center">
  <a href='https://hub.docker.com/r/dolomite-exchange/liquidator' style="text-decoration:none;">
    <img src='https://img.shields.io/badge/docker-container-blue.svg?longCache=true' alt='Docker' />
  </a>
  <a href='https://coveralls.io/github/dolomite-exchange/liquidator' style="text-decoration:none;">
    <img src='https://coveralls.io/repos/github/dolomite-exchange/liquidator/badge.svg?t=toKMwT' alt='Coverage Status' />
  </a>
  <a href='https://github.com/dolomite-exchange/dolomite-v2-protocol/blob/master/LICENSE' style="text-decoration:none;">
    <img src='https://img.shields.io/github/license/dolomite-exchange/dolomite-v2-protocol.svg?longCache=true' alt='License' />
  </a>
  <a href='https://t.me/dolomite_official' style="text-decoration:none;">
    <img src='https://img.shields.io/badge/chat-on%20telegram-9cf.svg?longCache=true' alt='Telegram' />
  </a>
</div>

# Dolomite V2 Liquidator

Bot to automatically liquidate undercollateralized and expired Dolomite accounts.

## Usage

### Docker

Requires a running [docker](https://docker.com) engine.

```
docker run \
  -e WALLET_ADDRESS=0x2c7536E3605D9C16a7a3D7b1898e529396a65c23 \
  -e WALLET_PRIVATE_KEY=0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318 \
  -e ETHEREUM_NODE_URL=https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY \
  -e DOLOMITE_LIQUIDATIONS_ENABLED=true \
  -e DOLOMITE_EXPIRATIONS_ENABLED=false \
  dolomite/liquidator
```

## Overview

This service will automatically liquidate undercollateralized and/or expired accounts on Dolomite.

This bot works for Dolomite (Margin-Trading) accounts. Use the envvars `DOLOMITE_LIQUIDATIONS_ENABLED`, 
`DOLOMITE_EXPIRATIONS_ENABLED` to control what kind of liquidations to perform.

**Liquidations on Dolomite happen internally between Accounts, so you will need an already-funded Dolomite Account to 
use this liquidator bot. If you use the default of `DOLOMITE_ACCOUNT_NUMBER=0`, you can fund your Dolomite Margin
Account on [app.dolomite.io](https://app.dolomite.io).**

Successfully liquidating Accounts will modify your Dolomite Account balances. You can liquidate assets you do not have 
in your Account provided you have another asset as collateral, which will just cause your Dolomite Account Balance to 
go negative in that asset.

### Dolomite Liquidations
Liquidations on Dolomite reward a 5% spread on top of the current oracle prices for the assets being liquidated and 
used as collateral. Example:

Undercollateralized Account:
```
+2 ETH
-350 DAI
```

Liquidator Account:
```
+100 ETH
-1000 DAI
```

Oracle Prices:
```
ETH Oracle Price: $200
DAI Oracle Price: $1
```

Fully liquidating this account would cause 350 DAI to be paid to zero out its balance, and would reward 
`350 DAI * ($1/DAI / $200/ETH) * 1.05 = 1.8375 ETH` as payout. After the liquidation the account balances would be:


Undercollateralized Account:
```
+0.1625 ETH
0 DAI
```

Liquidator Account:
```
+101.8375 ETH
-1350 DAI
```

## Configuration

### Environment Variables

|   ENV Variable                                |   Description                                                     |
|-----------------------------------------------|-------------------------------------------------------------------|
|   WALLET_ADDRESS                              |   **REQUIRED** Ethereum address of the Dolomite account owner that will do the liquidations
|   WALLET_PRIVATE_KEY                          |   **REQUIRED** Ethereum private key the Dolomite account owner that will do the liquidations. Make sure that "0x" is at the start of it (MetaMask exports private keys without it).
|   NETWORK_ID                                  |   Ethereum Network ID
|   ETHEREUM_NODE_URL                           |   **REQUIRED** The URL of the Ethereum node to use (e.g. an [Alchemy](https://alchemy.com/?r=99314874-10ab-44f3-9070-9abd86f4388d) or [Infura](https://infura.io/) endpoint)
|   LIQUIDATION_KEY_EXPIRATION_SEC              |   Amount of time in seconds to wait before trying to liquidate the same account again
|   GAS_STATION_URL                             |   URL of the gas station API to use
|   GAS_PRICE_MULTIPLIER                        |   How much to multiply the `fast` gas price by when sending transactions
|   GAS_PRICE_UPDATE_FREQUENCY_SEC              |   How frequently to update the gas price
|   BASE_CURRENCY_ADDRESS                       |   The address of the base currency used as the bridge for selling collateral. On most Ethereum-based networks, this will be the WETH address 
|   DOLOMITE_LIQUIDATIONS_ENABLED               |   true or false - whether to liquidate Dolomite accounts (true by default)
|   DOLOMITE_EXPIRATIONS_ENABLED                |   true or false - whether to liquidate expired accounts (false by default)
|   DOLOMITE_COLLATERAL_PREFERENCES             |   List of preferences for which collateral markets to receive first when liquidating
|   DOLOMITE_OWED_PREFERENCES                   |   List of preferences for which markets to liquidate first on an account when liquidating
|   DOLOMITE_ACCOUNT_NUMBER                     |   The Dolomite account number to use for the liquidating account. If you're not sure what this is, use 0. This will show up on [app.dolomite.io](https://app.dolomite.io) if you connect with the same wallet.
|   DOLOMITE_MIN_ACCOUNT_COLLATERALIZATION      |   The desired minimum collateralization of the liquidator account after completing a liquidation. Prevents the liquidator account from being at risk of being liquidated itself if the price of assets continues to move in some direction. Higher values are safer. e.g. 0.5 = 150% collateralization
|   DOLOMITE_MIN_OVERHEAD_VALUE                 |   If you can liquidate less than this amount of value before hitting `DOLOMITE_MIN_ACCOUNT_COLLATERALIZATION`, then don't liquidate. (1 USD = 1e36)
|   DOLOMITE_EXPIRED_ACCOUNT_DELAY_SECONDS      |   How long to wait before liquidating expired accounts. The spread for liquidating expired accounts ramps up linearly from 0% to 5% over 1 hour.
|   ACCOUNT_POLL_INTERVAL_MS                    |   How frequently to poll for liquidatable accounts
|   MARKET_POLL_INTERVAL_MS                     |   How frequently to poll for market updates
