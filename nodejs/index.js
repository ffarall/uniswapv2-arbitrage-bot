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
const MIN_ABS_GAIN = 100;
const SOURCES = ["USDC", "USDT", "DAI"];


// *************************************************************
// *                       METHODS
// *************************************************************
// Override warn method to hide them from console.
console.warn = () => {};

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

const getNegCycleRoutes = async (negCycle) => {
    let tokens = {};
    let routes = [];

    for (const token of negCycle) {
        tokens[token] = await Fetcher.fetchTokenData(CHAIN_ID, tokensJson[token], provider);
    }

    // After I am sure that all tokens have been fetched...
    for (var i = 0; i < negCycle.length - 1; i++) {
        const pair = await Fetcher.fetchPairData(tokens[negCycle[i]], tokens[negCycle[i+1]], provider);
        const route = new Route([pair], tokens[negCycle[i]]);

        routes.push({
            "route": route,
            "tokens": [negCycle[i], negCycle[i+1]]
        });
    }

    return routes;
}

const estimateGainForCycle = (routes, tokenAmount, tradeType) => {
    let executionGain = 1;
    var newAmount = tokenAmount;

    for (const route of routes) {
        const newAmountArgument = Math.ceil(newAmount * 10**(route["route"].input.decimals));
        const trade = new Trade(route["route"], new TokenAmount(route["route"].input, newAmountArgument), tradeType);
        
        console.log(`Estimating swap (midPrice = ${route["route"].midPrice.toSignificant(6)}, executionPrice = ${trade.executionPrice.toSignificant(6)}): ${newAmount.toPrecision(6)} ${route["tokens"][0]} for ${(newAmount * trade.executionPrice.toSignificant(6)).toPrecision(6)} ${route["tokens"][1]}.`);

        executionGain *= trade.executionPrice.toSignificant(6);
        newAmount *= trade.executionPrice.toSignificant(6);
    }

    return (executionGain - 1);
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
    
    while (true) {
        await getRoutes(tokensJson).then(response => {
            routes = response;
        });

        let grapher = new UniswapGraph(Object.keys(tokensJson), routes);
        sources: {
            for (const source of SOURCES) {
                if (grapher.detectArbitrage(source)) {
                    let minTokenToTrade = Math.ceil(MIN_ABS_GAIN / grapher.gain);
                    console.log(`In order to get a gain of ${MIN_ABS_GAIN} ${source}, the investment should be of ${minTokenToTrade} ${source}.`);

                    console.log("");
                    console.log("-------- Simulating cycle swaps --------");

                    const negCycleRoutes = await getNegCycleRoutes(grapher.negCycle);
                    const executionGain = estimateGainForCycle(negCycleRoutes, minTokenToTrade, TradeType.EXACT_INPUT);

                    console.log("");
                    console.log("------- Conclusions for the loop -------");

                    if (executionGain < 0) {
                        console.log(`The gain is lost when calculating actual gain (${(executionGain * 100).toPrecision(6)}%) estimated for the trades.`);

                    } else {
                        console.log(`The actual gain of the cycle is ${(executionGain * 100).toPrecision(6)}%.`);
                    }

                    const slippage = minTokenToTrade * (executionGain - grapher.gain);
                    console.log(`The slippage is ${slippage.toPrecision(6)}, and absolute earnings would be ${(minTokenToTrade * executionGain).toPrecision(6)}`);

                    console.log("");
                    console.log("");
                    console.log("");
                    console.log("");

                    break sources;
                }
            }
        }
    }

    provider.destroy();
}


main();