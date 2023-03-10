const { ethers, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts()

    // Basic NFT
    const basicNFT = await ethers.getContract("BasicNFT", deployer)
    const basicMintTx = await basicNFT.mintNFT()
    await basicMintTx.wait(1)
    console.log(`Basic NFT index 0 has tokenURI: ${await basicNFT.tokenURI(0)}`)

    // Random IPFS NFT
    const randomNFT = await ethers.getContract("RandomIpfsNFT", deployer)
    const mintFee = await randomNFT.getMintFee()

    await new Promise(async (resolve, reject) => {
        setTimeout(resolve, 300000)
        randomNFT.once("NFTMinted", () => resolve())

        const randomNFTMintTx = await randomNFT.requestNFT({ value: mintFee.toString() })
        const randomNFTMintReceipt = await randomNFTMintTx.wait(1)
        if (developmentChains.includes(network.name)) {
            const requestId = randomNFTMintReceipt.events[1].args.requestId.toString()
            const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomNFT.address)
        }
    })
    console.log(`Random IPFS NFT index 0 tokenURI: ${await randomNFT.tokenURI(0)}`)

    // Dynamic SVG NFT
    const dynamicNFT = await ethers.getContract("DynamicSvgNFT", deployer)
    const highValue = ethers.utils.parseEther("4000")
    const dynamicNFTMintTx = await dynamicNFT.mintNFT(highValue.toString())
    await dynamicNFTMintTx.wait(1)
    console.log(`Dynamic SVG NFT index 0 tokenURI: ${await dynamicNFT.tokenURI(0)}`)
}

module.exports.tags = ["all", "mint"]
