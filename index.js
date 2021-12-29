// *************************************************************
// *                        REQUIRES
// *************************************************************
const {ChainId, Fetcher, Route} = require("@uniswap/sdk");
const {ethers} = require("ethers");
const {Address} = require("cluster");

const tokensJson = require("./tokens.json");
const keys = require("./keys.json");


// *************************************************************
// *                      CONSTANTS
// *************************************************************
const chainId = ChainId.MAINNET;


// *************************************************************
// *                        CODE
// *************************************************************
const provider = new ethers.providers.WebSocketProvider(keys.wssInfuraEndpoint);

const init = async (tokensJson) => {
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
            routes.push({
                "route": route,
                "tokens": ["USDC", token]
            });

            // Adding route from WETH to token.
            if (token != "WETH") {
                const pair = await Fetcher.fetchPairData(tokens["WETH"], tokens[token], provider);
                const route = new Route([pair], tokens["WETH"]);
                routes.push({
                    "route": route,
                    "tokens": ["WETH", token]
                });
            }
        }
    }

    return routes;
}

init(tokensJson).then(response => {
    for (const route in response) {
        console.log(response[route]["tokens"], response[route]["route"].midPrice.toSignificant(6));
    }

    provider.destroy();
});