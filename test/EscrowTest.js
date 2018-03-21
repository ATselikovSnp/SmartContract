"use strict";
const Escrow = artifacts.require("./Escrow.sol");
const assertRevert = require('./helpers/assertRevert');
let testAccounts = {
    sender: null,
    receiver: null,
    arbiter: null,
};
let testAmount = web3.toWei(1, "ether");

contract('Escrow', function (accounts) {
    before(async function () {
        testAccounts.sender = accounts[0];
        testAccounts.receiver = accounts[1];
        testAccounts.arbiter = accounts[2];
    });

    beforeEach(async function () {
        this.escrow = await Escrow.new(testAccounts.sender, testAccounts.receiver, testAccounts.arbiter);
        //let blockNumber = web3.eth.getTransaction(this.escrow.transactionHash).blockNumber;
        //console.log("Gas used to deploy contract", web3.eth.getBlock(blockNumber).gasUsed);
        //console.log("Contract address", this.escrow.contract.address);

    });

    it("should allow to pay for sender", async function () {
        web3.eth.sendTransaction({from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        assert.equal(web3.eth.getBalance(this.escrow.contract.address), testAmount);
    });

    it("should allow NOT to pay for any other account rather then sender", async function () {
        try {
            web3.eth.sendTransaction({from: testAccounts.receiver, to: this.escrow.contract.address, value: testAmount})
        } catch (e) {
            assertRevert.errorOnly(e);
        }
        try {
            web3.eth.sendTransaction({from: testAccounts.arbiter, to: this.escrow.contract.address, value: testAmount})
        } catch (e) {
            assertRevert.errorOnly(e);
        }
        try {
            web3.eth.sendTransaction({from: accounts[9], to: this.escrow.contract.address, value: testAmount})
        } catch (e) {
            assertRevert.errorOnly(e);
        }
    });

    it("should allow withdraw only after payment", async function () {
        await assertRevert.promiseAssert(this.escrow.withdraw({from: accounts[5]}));
        await assertRevert.promiseAssert(this.escrow.withdraw({from: testAccounts.sender}));
        web3.eth.sendTransaction({from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        let receiverBalance = web3.eth.getBalance(testAccounts.receiver);
        await this.escrow.withdraw({from: testAccounts.sender});
        let receiverBalanceAfter = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(receiverBalance.toString(),receiverBalanceAfter.toString());
    });

    it("should NOT allow withdraw second time", async function () {
        web3.eth.sendTransaction({from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        let receiverBalance = web3.eth.getBalance(testAccounts.receiver);
        await this.escrow.withdraw({from: testAccounts.sender});
        await assertRevert.promiseAssert(this.escrow.withdraw({from: testAccounts.sender}));
        let receiverBalanceAfter = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(receiverBalance.toString(),receiverBalanceAfter.toString());

    });

    it("should withdraw only after 2/3 confirmation", async function () {
        web3.eth.sendTransaction({from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        await this.escrow.withdraw({from: testAccounts.receiver});
        let receiverBalance = web3.eth.getBalance(testAccounts.receiver);
        await this.escrow.withdraw({from: testAccounts.sender});
        let receiverBalanceAfter = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(receiverBalance.plus(testAmount).toString(),receiverBalanceAfter.toString());
    });

    it("should allow refund only after payment", async function () {
        await assertRevert.promiseAssert(this.escrow.refund({from: accounts[5]}));
        await assertRevert.promiseAssert(this.escrow.refund({from: testAccounts.sender}));
        web3.eth.sendTransaction({from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        let senderBalance = web3.eth.getBalance(testAccounts.sender);
        await this.escrow.refund({from: testAccounts.receiver});
        let senderBalanceAfter = web3.eth.getBalance(testAccounts.sender);
        assert.equal(senderBalance.toString(),senderBalanceAfter.toString());
    });

    it("should NOT allow refund second time", async function () {
        web3.eth.sendTransaction({from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        let senderBalance = web3.eth.getBalance(testAccounts.sender);
        await this.escrow.refund({from: testAccounts.receiver});
        await assertRevert.promiseAssert(this.escrow.refund({from: testAccounts.receiver}));
        let senderBalanceAfter = web3.eth.getBalance(testAccounts.sender);
        assert.equal(senderBalance.toString(),senderBalanceAfter.toString());

    });

    it("should refund only after 2/3 confirmation", async function () {
        web3.eth.sendTransaction({from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        await this.escrow.refund({from: testAccounts.sender});
        let senderBalance = web3.eth.getBalance(testAccounts.sender);
        await this.escrow.refund({from: testAccounts.receiver});
        let senderBalanceAfter = web3.eth.getBalance(testAccounts.sender);
        assert.equal(senderBalance.plus(testAmount).toString(),senderBalanceAfter.toString());
    });

    it("should withdraw with 2 withdraw and one refund", async function () {
        web3.eth.sendTransaction({from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        await this.escrow.refund({from: testAccounts.sender});
        await this.escrow.withdraw({from: testAccounts.receiver});
        let receiverBalance = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(web3.eth.getBalance(this.escrow.contract.address), testAmount);
        await this.escrow.withdraw({from: testAccounts.arbiter});
        assert.equal(web3.eth.getBalance(this.escrow.contract.address), 0);
        let receiverBalanceAfter = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(receiverBalance.plus(testAmount).toString(),receiverBalanceAfter.toString());
    });

    it("should withdraw with if user change mind and after refund confirm withdraw", async function () {
        web3.eth.sendTransaction({from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        await this.escrow.refund({from: testAccounts.sender});
        await this.escrow.withdraw({from: testAccounts.receiver});
        let receiverBalance = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(web3.eth.getBalance(this.escrow.contract.address), testAmount);
        await this.escrow.withdraw({from: testAccounts.sender});
        assert.equal(web3.eth.getBalance(this.escrow.contract.address), 0);
        let receiverBalanceAfter = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(receiverBalance.plus(testAmount).toString(),receiverBalanceAfter.toString());
    });

    it("should be able to send currency unlit escrow is finished", async function () {
        web3.eth.sendTransaction({from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        web3.eth.sendTransaction({from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        assert.equal(web3.eth.getBalance(this.escrow.contract.address), testAmount*2);
        await this.escrow.withdraw({from: testAccounts.receiver});
        let receiverBalance = web3.eth.getBalance(testAccounts.receiver);
        await this.escrow.withdraw({from: testAccounts.sender});
        let receiverBalanceAfter = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(receiverBalance.plus(testAmount).plus(testAmount).toString(),receiverBalanceAfter.toString());
        try {
            web3.eth.sendTransaction({from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        } catch (e) {
            assertRevert.errorOnly(e);
        }

    });
});