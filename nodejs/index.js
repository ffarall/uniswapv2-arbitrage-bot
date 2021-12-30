// *************************************************************
// *                        REQUIRES
// *************************************************************
const {ChainId, Fetcher, Route, Trade, TokenAmount, TradeType, Token} = require("@uniswap/sdk");
const {ethers} = require("ethers");

const tokensJson = require("./tokens.json");
const keys = require("./keys.json");
const Grapher = require("./grapher.js");


// *************************************************************
// *                      CONSTANTS
// *************************************************************
const chainId = ChainId.MAINNET;


// *************************************************************
// *                       METHODS
// *************************************************************
const provider = new ethers.providers.WebSocketProvider(keys.wssInfuraEndpoint);

const getRoutes = async (tokensJson) => {
    let tokens = {};
    let routes = [];

    for (const [token, address] of Object.entries(tokensJson)) {
        tokens[token] = await Fetcher.fetchTokenData(chainId, address, provider);
    }

    // After I am sure that all tokens have been fetched...
    for (const token in tokens) {
        // Adding route from USDC to token.
        if (token != "USDC") {
            const pair = await Fetcher.fetchPairData(tokens["USDC"], tokens[token], provider);
            const route = new Route([pair], tokens["USDC"]);
            const inv_route = new Route([pair], tokens[token]);
            routes.push({
                "route": route,
                "tokens": ["USDC", token]
            }, {
                "route": inv_route,
                "tokens": [token, "USDC"]
            });

            // Adding route from WETH to token.
            if (token != "WETH") {
                const pair = await Fetcher.fetchPairData(tokens["WETH"], tokens[token], provider);
                const route = new Route([pair], tokens["WETH"]);
                const inv_route = new Route([pair], tokens[token]);
                routes.push({
                    "route": route,
                    "tokens": ["WETH", token]
                }, {
                    "route": inv_route,
                    "tokens": [token, "WETH"]
                });
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
            console.log(route, response[route]["tokens"], response[route]["route"].midPrice.toSignificant(6));
        }

        routes = response;
    });
    
    const inTokenAmount = "1000000000000000000000";
    const slippage = estimateSlippageForTrade(routes[30]["route"], inTokenAmount, TradeType.EXACT_INPUT);
    console.log(`The slippage for a trade between tokens ${routes[30]["tokens"]}, with an amount of ${inTokenAmount} ${routes[30]["tokens"][0]} is: ${slippage} ${routes[30]["tokens"][1]}.`);

    let grapher = new Grapher();
    grapher.populateCryptoGraph(routes, Object.keys(tokensJson));
    grapher.detectArbitrage();

    provider.destroy();
}


main();