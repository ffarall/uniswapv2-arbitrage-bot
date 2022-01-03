// *************************************************************
// *                        REQUIRES
// *************************************************************
const {ChainId, Fetcher, Route, Trade, TokenAmount, TradeType} = require("@uniswap/sdk");
const {ethers} = require("ethers");

const tokensJson = require("./tokens.json");
const keys = require("./keys.json");
const UniswapGraph = require("./grapher.js");


// *************************************************************
// *                      CONSTANTS
// *************************************************************
const CHAIN_ID = ChainId.MAINNET;
const MIN_REL_GAIN = 0.0005;    // 0.05%
const MIN_ABS_GAIN = 100;
const SOURCES = ["USDC", "USDT", "DAI"];
const LIQUIDITY_THRESHOLD = 1e6;


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

const estimatePoolLiquidities = (route, grapher) => {
    const pair = route.pairs[0];
    const path = route.path;
    const token0Symbol = Object.keys(tokensJson).find(key => tokensJson[key].toUpperCase() === pair.token0.address.toUpperCase());
    const token1Symbol = Object.keys(tokensJson).find(key => tokensJson[key].toUpperCase() === pair.token1.address.toUpperCase());

    var liquidities = new Map();
    liquidities[token0Symbol] = pair.reserve0.toExact();
    liquidities[token1Symbol] = pair.reserve1.toExact();

    for (const token of path) {
        const address = token.address.toUpperCase();
        const tokenSymbol = Object.keys(tokensJson).find(key => tokensJson[key].toUpperCase() === address);
        liquidities[tokenSymbol] = parseFloat(liquidities[tokenSymbol]);
        if (address != tokensJson["USDC"].toUpperCase()) {
            // Getting approximate price of the token in USD (using USDC)
            const tokenInUSD = Math.exp(-grapher.getEdge(tokenSymbol, "USDC"));
            liquidities[tokenSymbol] = liquidities[tokenSymbol] * tokenInUSD;
        }
    }

    return liquidities;
}


// *************************************************************
// *                          MAIN
// *************************************************************
const main = async () => {
    let routes = [];
    let grapher = new UniswapGraph(Object.keys(tokensJson), routes);

    await getRoutes(tokensJson).then(response => {
        for (const route in response) {
            // Printing pairs that the bot works with (only the first run)
            const midPrice = response[route]["route"].midPrice.toSignificant(6);

            console.log(`${route}: Pair (${response[route]["tokens"]}) has a midPrice of ${midPrice}`);
        }

        routes = response;
    });
    // Populating graphs with routes
    grapher.populate(Object.keys(tokensJson), routes);

    var discardedForLowLiquidity = [];
    for (const route in routes) {
        const liquidities = estimatePoolLiquidities(routes[route]["route"], grapher);
        const token0Symbol = routes[route]["tokens"][0];
        const token1Symbol = routes[route]["tokens"][1];
        
        if (liquidities[token0Symbol] < LIQUIDITY_THRESHOLD || liquidities[token1Symbol] < LIQUIDITY_THRESHOLD) {
            console.log("\x1b[31m%s\x1b[0m", `Pair (${routes[route]["tokens"]}) has low liquidity (approx. ${liquidities[token0Symbol].toPrecision(6)} USD and ${liquidities[token1Symbol].toPrecision(6)} USD, respectively) and therefore will not be considered.`);
            discardedForLowLiquidity.push(route);
        
        } else {
            console.log("\x1b[32m%s\x1b[0m", `Pair (${routes[route]["tokens"]}) has acceptable liquidity (approx. ${liquidities[token0Symbol].toPrecision(6)} USD and ${liquidities[token1Symbol].toPrecision(6)} USD, respectively).`)
        }
    }

    // Going through array in reverse order not to mess up with the routes array indexes.
    for (var i = discardedForLowLiquidity.length - 1; i >= 0; i--) {
        routes.splice(discardedForLowLiquidity[i], 1);
    }

    console.log("");
    console.log("Pairs left:");
    for (const route in routes) {
        const midPrice = routes[route]["route"].midPrice.toSignificant(6);
        console.log(`${route}: Pair (${routes[route]["tokens"]}) has a midPrice of ${midPrice}`);
    }
    console.log("");
    // Populating again with routes left
    grapher.populate(Object.keys(tokensJson), routes);
    
    while (true) {
        await getRoutes(tokensJson).then(response => { routes = response });
        // Populating graphs with routes
        grapher.populate(Object.keys(tokensJson), routes);

        var discardedForLowLiquidity = [];
        for (const route in routes) {
            const liquidities = estimatePoolLiquidities(routes[route]["route"], grapher);
            const token0Symbol = routes[route]["tokens"][0];
            const token1Symbol = routes[route]["tokens"][1];
            
            if (liquidities[token0Symbol] < LIQUIDITY_THRESHOLD || liquidities[token1Symbol] < LIQUIDITY_THRESHOLD) {
                discardedForLowLiquidity.push(route);
            }
        }

        // Going through array in reverse order not to mess up with the routes array indexes.
        for (var i = discardedForLowLiquidity.length - 1; i >= 0; i--) {
            routes.splice(discardedForLowLiquidity[i], 1);
        }
        // Populating again with routes left
        grapher.populate(Object.keys(tokensJson), routes);

        sources: {
            for (const source of SOURCES) {
                if (grapher.detectArbitrage(source)) {
                    if (grapher.gain > MIN_REL_GAIN) {
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

                    } else {
                        console.log(`Arbitrage found but with low gain. Will not be considered.`);
                        console.log("");
                        console.log("");
                        console.log("");
                        console.log("");
                    }
                }
            }
        }

        await getRoutes(tokensJson).then(response => {
            routes = response;
        });
    } 
}


main();