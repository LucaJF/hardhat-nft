const { network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenURIMetadata } = require("../utils/uploadToPinata")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")
const UPLOAD_TO_PINATA = process.env.UPLOAD_TO_PINATA
const imagesLocation = "./images/randomNFT"
const metadataTemplate = (name, description, image) => ({
    name,
    description,
    image,
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
})

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Mock, vrfCoordinatorV2Address, subscriptionId
    let tokenUris = [
        "ipfs://QmS5b47e1VtEWijWumfToQAt4jU4MWBQhKFNRS472jGmsh",
        "ipfs://QmRXBHVtn4xqd4ihBAMQDE759yQjwEKxWRinTd3amQExvJ",
        "ipfs://QmWJoGNxZ8KNf77oYM8BCc5Tt63NaoxyxoZoTUupY68Uuj",
    ]

    UPLOAD_TO_PINATA === "true" && (tokenUris = await handleTokenURIs())

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("----------------------------------------------------")

    const { gasLane, callbackGasLimit, mintFee } = networkConfig[chainId]
    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        gasLane,
        callbackGasLimit,
        tokenUris,
        mintFee,
    ]
    const randomIPFSNFT = await deploy("RandomIpfsNFT", {
        from: deployer,
        log: true,
        args,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (developmentChains.includes(network.name)) {
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, randomIPFSNFT.address)
    }

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        // await verify(randomIPFSNFT.address, args)
    }

    log("----------------------------------------------------")
}

module.exports.tags = ["all", "randomipfsnft", "main"]

async function handleTokenURIs() {
    const tokenURIs = []
    const { responses: imageUploadReses, files } = await storeImages(imagesLocation)

    for (idx in imageUploadReses) {
        const { IpfsHash: imageIpfsHash } = imageUploadReses[idx]
        const name = files[idx].replace(".png", "")
        const tokenURIMetadata = metadataTemplate(
            name,
            `An dorable ${name} pup!`,
            `ipfs://${imageIpfsHash}`
        )
        console.log(`Uploading ${name}`)
        const { IpfsHash: jsonIpfsHash } = await storeTokenURIMetadata(tokenURIMetadata)
        tokenURIs.push(jsonIpfsHash ? `ipfs://${jsonIpfsHash}` : "")
    }

    console.log(`Token URIs Uploaded! They are: 
        ${tokenURIs.toString()}
    `)

    return tokenURIs
}
