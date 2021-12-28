// *************************************************************
// *                        REQUIRES
// *************************************************************
const {ChainId, Fetcher, WETH, Route} = require("@uniswap/sdk");
const {ethers} = require("ethers");
const fs = require("fs");


// *************************************************************
// *                      CONSTANTS
// *************************************************************
const chainId = ChainId.MAINNET;
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";


// *************************************************************
// *                        CODE
// *************************************************************
let rawdata = fs.readFileSync('tokens.json');
let pairsJson = JSON.parse(rawdata);
console.log(pairsJson);

const init = async () => {
    const usdc = await Fetcher.fetchTokenData(chainId, usdcAddress);
    const dai = await Fetcher.fetchTokenData(chainId, daiAddress);

    const usdc2daiPair = await Fetcher.fetchPairData(usdc, dai);
    const dai2wethPair = await Fetcher.fetchPairData(dai, WETH[chainId]);

    const usdc2daiRoute = new Route([usdc2daiPair], usdc);
    const dai2wethRoute = new Route([dai2wethPair], dai);

    console.log(usdc2daiRoute.midPrice.toSignificant(6));
    console.log(dai2wethRoute.midPrice.toSignificant(6));
}

init();