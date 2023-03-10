const pinataSDK = require("@pinata/sdk")
const { resolve } = require("path")
const { readdirSync, createReadStream } = require("fs")

const PINATA_API_KEY = process.env.PINATA_API_KEY
const PINATA_API_SECRET = process.env.PINATA_API_SECRET
const pinata = new pinataSDK(PINATA_API_KEY, PINATA_API_SECRET)

async function storeImages(imagesFilePath) {
    const fullImagesPath = resolve(imagesFilePath)
    const files = readdirSync(fullImagesPath)
    const responses = []

    console.log("Uploading to Pinata!")

    for (index in files) {
        console.log(`Working on ${files[index]}...`)

        const readableStreamForFile = createReadStream(`${fullImagesPath}/${files[index]}`)
        try {
            const response = await pinata.pinFileToIPFS(readableStreamForFile, {
                pinataMetadata: {
                    name: `${files[index]}`,
                },
            })
            responses.push(response)
        } catch (err) {
            console.log(err.message)
        }
    }

    console.log("Uploaded to Pinata!!!")

    return { responses, files }
}

async function storeTokenURIMetadata(metadata) {
    try {
        const res = await pinata.pinJSONToIPFS(metadata, {
            pinataMetadata: {
                name: `${metadata.name} JSON Metadata`,
            },
        })
        return res
    } catch (err) {
        console.log(err.message)
    }

    return { IpfsHash: null }
}

module.exports = { storeImages, storeTokenURIMetadata }
