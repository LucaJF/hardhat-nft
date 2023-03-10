const { assert, expect } = require("chai")
const { network, ethers, deployments } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random IPFS NFT Unit Tests", () => {
          let deployer, randomIPFSNFT, vrfCoordinatorV2Mock

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "randomipfsnft"])
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              randomIPFSNFT = await ethers.getContract("RandomIpfsNFT", deployer)
          })

          describe("constructor", () => {
              it("sets starting values correctly", async () => {
                  const tokenURI0 = await randomIPFSNFT.getDogTokenURIs(0)
                  assert(tokenURI0.includes("ipfs://"))
              })
          })

          describe("getBreedFromModdedRng", () => {
              it("should return pug if moddedRng < 10", async () => {
                  const expectedVal = await randomIPFSNFT.getBreedFromModdedRng(5)
                  assert.equal(0, expectedVal)
              })

              it("should return shiba_inu if moddedRng is between 10 and 39", async () => {
                  const expectedVal = await randomIPFSNFT.getBreedFromModdedRng(25)
                  assert.equal(1, expectedVal)
              })

              it("should return st_bernard if moddedRng is between 40 and 99", async () => {
                  const expectedVal = await randomIPFSNFT.getBreedFromModdedRng(95)
                  assert.equal(2, expectedVal)
              })

              it("should revert if moddedRng > 99", async () => {
                  await expect(
                      randomIPFSNFT.getBreedFromModdedRng(100)
                  ).to.be.revertedWithCustomError(randomIPFSNFT, "RandomIpfsNFT__RangeOutOfBounds")
              })
          })

          describe("requestNFT", () => {
              it("fails if payment isn't sent with the request", async () => {
                  await expect(randomIPFSNFT.requestNFT()).to.be.revertedWithCustomError(
                      randomIPFSNFT,
                      "RandomIpfsNFT__NeedMoreETHSent"
                  )
              })

              it("reverts if payment amount is less than the mint fee", async () => {
                  const fee = await randomIPFSNFT.getMintFee()
                  await expect(
                      randomIPFSNFT.requestNFT({ value: ethers.utils.parseEther("0.004") })
                  ).to.be.revertedWithCustomError(randomIPFSNFT, "RandomIpfsNFT__NeedMoreETHSent")
              })

              it("emits an event and kicks off a random word request", async () => {
                  const fee = await randomIPFSNFT.getMintFee()
                  await expect(randomIPFSNFT.requestNFT({ value: fee.toString() })).to.emit(
                      randomIPFSNFT,
                      "NFTRequested"
                  )
              })
          })

          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async () => {
                  await new Promise(async (resolve, reject) => {
                      randomIPFSNFT.once("NFTMinted", async () => {
                          try {
                              const tokenURI = await randomIPFSNFT.getDogTokenURIs(0)
                              const tokenCounter = await randomIPFSNFT.getTokenCounter()

                              assert(tokenURI.includes("ipfs://"))
                              assert.equal(tokenCounter.toString(), "1")

                              resolve()
                          } catch (err) {
                              console.log(err)
                              reject(err)
                          }
                      })

                      try {
                          const fee = await randomIPFSNFT.getMintFee()
                          const res = await randomIPFSNFT.requestNFT({ value: fee.toString() })
                          const receipt = await res.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              receipt.events[1].args.requestId,
                              randomIPFSNFT.address
                          )
                      } catch (err) {
                          console.log(err)
                          reject(err)
                      }
                  })
              })
          })
      })
