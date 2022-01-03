const {Pool} = require("@uniswap/v3-sdk");
const {Token} = require("@uniswap/sdk-core");
const {abi} = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");
const { ethers } = require("ethers");

class UniswapPoolObserver {
    constructor(provider) {
        this.provider = provider;
    }

    async getPoolLiquidity() {
        const poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
        const poolContract = new ethers.Contract(
            poolAddress,
            abi,
            this.provider
        );

        const liquidity = await poolContract.liquidity();
        return liquidity;
    }
}

module.exports = UniswapPoolObserver;