// *************************************************************
// *                        REQUIRES
// *************************************************************
const {ChainId, Fetcher, Route} = require("@uniswap/sdk");
const {ethers} = require("ethers");

const tokensJson = require("./tokens.json");
const keys = require("./keys.json");


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


// *************************************************************
// *                          MAIN
// *************************************************************
const main = async () => {
    await getRoutes(tokensJson).then(response => {
        for (const route in response) {
            console.log(response[route]["tokens"], response[route]["route"].midPrice.toSignificant(6));
        }
    });
    
    provider.destroy();
}


main();