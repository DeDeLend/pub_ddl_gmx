import { ethers, timeAndMine } from "hardhat";
import { solidity } from "ethereum-waffle";
import chai from "chai";
import { preparation } from "./Preparation";
import { fixture } from "./Preparation";

chai.use(solidity);
const { expect } = chai;

describe("DDL_POOL.ts", async () => {
    describe("General Functionality", async () => {
        let contracts: Awaited<ReturnType<typeof fixture>>;

        beforeEach(async () => {
            contracts = await fixture();
            await preparation(contracts)
        })

        it("Should install new ddlContract at the wrong time", async () => {
            await expect(
                contracts.PoolDDL.connect(contracts.deployer).setDDLContract(contracts.alice.address)
            ).to.be.revertedWith("Function is timelocked")
            await contracts.PoolDDL.connect(contracts.deployer).unlockFunction(contracts.alice.address)
            await expect(
                contracts.PoolDDL.connect(contracts.deployer).setDDLContract(contracts.alice.address)
            ).to.be.revertedWith("Function is timelocked")
        })

        it("Should set new ddlContract", async () => {
            await contracts.PoolDDL.connect(contracts.deployer).unlockFunction(contracts.alice.address)
            await timeAndMine.setTimeIncrease("6d")
            await expect(
                contracts.PoolDDL.connect(contracts.deployer).setDDLContract(contracts.alice.address)
            ).to.be.revertedWith("Function is timelocked")
            await timeAndMine.setTimeIncrease("1d")
            await contracts.PoolDDL.connect(contracts.deployer).setDDLContract(contracts.alice.address)
            
        })

    })
})