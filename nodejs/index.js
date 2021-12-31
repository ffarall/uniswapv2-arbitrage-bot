// *************************************************************
// *                        REQUIRES
// *************************************************************
const {ChainId, Fetcher, Route, Trade, TokenAmount, TradeType, Token} = require("@uniswap/sdk");
const {ethers} = require("ethers");

const tokensJson = require("./tokens.json");
const keys = require("./keys.json");
const UniswapGraph = require("./grapher.js");


// *************************************************************
// *                      CONSTANTS
// *************************************************************
const CHAIN_ID = ChainId.MAINNET;


// *************************************************************
// *                       METHODS
// *************************************************************
const provider = new ethers.providers.WebSocketProvider(keys.wssInfuraEndpoint);

const getRoutes = async (tokensJson) => {
    let tokens = {};
    let routes = [];

    for (const [token, address] of Object.entries(tokensJson)) {
        tokens[token] = await Fetcher.fetchTokenData(CHAIN_ID, address, provider);
    }

    // After I am sure that all tokens have been fetched...
    for (const tokenStart in tokens) {
        for (const tokenEnd in tokens) {
            try {
                const pair = await Fetcher.fetchPairData(tokens[tokenStart], tokens[tokenEnd], provider);
                const route = new Route([pair], tokens[tokenStart]);
    
                routes.push({
                    "route": route,
                    "tokens": [tokenStart, tokenEnd]
                });

            } catch (error) {
                // Pair does not exist.
            }
        }
    }

    return routes;
}

const estimateSlippageForTrade = (route, tokenAmount, tradeType) => {
    const trade = new Trade(route, new TokenAmount(route.input, tokenAmount), tradeType);
    return (route.midPrice.toSignificant(6) - trade.executionPrice.toSignificant(6));
}


// *************************************************************
// *                          MAIN
// *************************************************************
const main = async () => {
    let routes = [];

    await getRoutes(tokensJson).then(response => {
        for (const route in response) {
            // Printing pairs that the bot works with (only the first run)
            console.log(route, response[route]["tokens"], response[route]["route"].midPrice.toSignificant(6));
        }

        routes = response;
    });
    
    const inTokenAmount = "1000000000000000000000";
    const slippage = estimateSlippageForTrade(routes[30]["route"], inTokenAmount, TradeType.EXACT_INPUT);
    console.log(`The slippage for a trade between tokens ${routes[30]["tokens"]}, with an amount of ${inTokenAmount} ${routes[30]["tokens"][0]} is: ${slippage} ${routes[30]["tokens"][1]}.`);

    let grapher = new UniswapGraph(Object.keys(tokensJson), routes);
    grapher.detectArbitrage("USDT");

    provider.destroy();
}


main();