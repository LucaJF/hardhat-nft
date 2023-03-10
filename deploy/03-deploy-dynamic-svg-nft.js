const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { readFileSync } = require("fs")

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let ethUsdPriceFeedAddress

    if (developmentChains.includes(network.name)) {
        const ethUsdPriceFeed = await ethers.getContract("MockV3Aggregator", deployer)
        ethUsdPriceFeedAddress = ethUsdPriceFeed.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed
    }

    log("----------------------------------------------------")

    const lowSVG = await readFileSync("./images/dynamicNFT/frown.svg", { encoding: "utf8" })
    const highSVG = await readFileSync("./images/dynamicNFT/happy.svg", { encoding: "utf8" })
    const args = [ethUsdPriceFeedAddress, lowSVG, highSVG]
    const dynamicNFT = await deploy("DynamicSvgNFT", {
        from: deployer,
        log: true,
        args,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        // await verify(dynamicNFT.address, args)
    }

    log("----------------------------------------------------")
}

module.exports.tags = ["all", "dynamicsvgnft", "main"]
