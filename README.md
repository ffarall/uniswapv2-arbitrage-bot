# uniswapv2-arbitrage-bot
 Simple cryptocurrency arbitrage bot working with Uniswap V2 DEX.

## Disclaimer
This bot implements a very simple arbitrage strategy, which almost all the time won't produce actual earnings. Don't use it expecting to earn a lot of money.

## Repo structure
- `nodejs`: Includes the NodeJS project for the bot with all it's dependencies and source files.
    - `index.js`: Main file. Contains all the methods related to communicating with the Uniswap SDK as well as the main loop. Some of it's main functions include retrieving information of the pairs of tokens the bot works with, filtering pairs by liquidity of the pools and calculating slippage for a trade.

    - `grapher.js`: Module that takes care of the logic behind the bot. Models the Uniswap exchange as a net of interconnected nodes, with additive weights given by $ -ln(convRate) $, where $ convRate $ is the `midPrice` provided by Uniswap for a given pair of tokens. Utilises Bellman-Ford's algorithm to detect a negative loop inside the graph.
    
    - `keys.json`: Keys for the endpoints used.

    - `tokens.json`: List of token addresses the bot works with.

    - `auxTokens.json`: Full list of tokens' addresses (backup in case `tokens.json` is modified to work with less tokens).

## Dependencies
This repo depends on [ethers](https://docs.ethers.io/v5/) and [Uniswap SDK V3](https://github.com/Uniswap/v3-sdk). To add them, open the terminal at `nodejs` folder and run:
```
npm install ethers
npm install @uniswap/sdk
```

## How to run
Open the terminal inside `nodejs` folder and run `node index.js`. The program is in an infinite loop searching for arbitrages, and to stop it, use the keyboard shortcut Ctrl + C.

## Example of program working
<img src="example.gif"/>
