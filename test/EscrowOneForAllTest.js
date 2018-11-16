"use strict";
const Escrow = artifacts.require("./EscrowOneForAll.sol");
const assertRevert = require('./helpers/assertRevert');
let testAccounts = {
    sender: null,
    receiver: null,
    arbiter: null,
};
let testAmount = web3.toWei(1, "ether");

let dealNumber = null;

contract('EscrowOneForAll', function (accounts) {
    before(async function () {
        testAccounts.sender = accounts[0];
        testAccounts.receiver = accounts[1];
        testAccounts.arbiter = accounts[2];
    });

    beforeEach(async function () {
        this.escrow = await Escrow.new();
        const data = await this.escrow.createDeal.call(testAccounts.sender, testAccounts.receiver, testAccounts.arbiter, testAmount);
        dealNumber = data;
        await this.escrow.createDeal(testAccounts.sender, testAccounts.receiver, testAccounts.arbiter, testAmount);
        // console.log(data);
        //let blockNumber = web3.eth.getTransaction(this.escrow.transactionHash).blockNumber;
        //console.log("Gas used to deploy contract", web3.eth.getBlock(blockNumber).gasUsed);
        //console.log("Contract address", this.escrow.contract.address);

    });

    it("should allow to pay for sender", async function () {
        this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        assert.equal(web3.eth.getBalance(this.escrow.contract.address), testAmount);
        // console.log(dealNumber);
    });

    it("should allow NOT to pay for any other account rather then sender", async function () {
        try {
            this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.receiver, to: this.escrow.contract.address, value: testAmount})
        } catch (e) {
            assertRevert.errorOnly(e);
        }
        try {
            this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.arbiter, to: this.escrow.contract.address, value: testAmount})
        } catch (e) {
            assertRevert.errorOnly(e);
        }
        try {
            this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: accounts[9], to: this.escrow.contract.address, value: testAmount})
        } catch (e) {
            assertRevert.errorOnly(e);
        }
    });

    it("should allow withdraw only after payment", async function () {
        await assertRevert.promiseAssert(this.escrow.withdraw(dealNumber,{from: accounts[5]}));
        await assertRevert.promiseAssert(this.escrow.withdraw(dealNumber,{from: testAccounts.sender}));
        this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        let receiverBalance = web3.eth.getBalance(testAccounts.receiver);
        await this.escrow.withdraw(dealNumber,{from: testAccounts.sender});
        let receiverBalanceAfter = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(receiverBalance.toString(),receiverBalanceAfter.toString());
    });

    it("should NOT allow withdraw second time", async function () {
        this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        let receiverBalance = web3.eth.getBalance(testAccounts.receiver);
        await this.escrow.withdraw(dealNumber,{from: testAccounts.sender});
        await assertRevert.promiseAssert(this.escrow.withdraw(dealNumber,{from: testAccounts.sender}));
        let receiverBalanceAfter = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(receiverBalance.toString(),receiverBalanceAfter.toString());

    });

    it("should withdraw only after 2/3 confirmation", async function () {
        this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        await this.escrow.withdraw(dealNumber,{from: testAccounts.receiver});
        let receiverBalance = web3.eth.getBalance(testAccounts.receiver);
        await this.escrow.withdraw(dealNumber,{from: testAccounts.sender});
        let receiverBalanceAfter = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(receiverBalance.plus(testAmount).toString(),receiverBalanceAfter.toString());
        assert.isFalse(await this.escrow.getRefunded.call(dealNumber));
    });

    it("should allow refund only after payment", async function () {
        await assertRevert.promiseAssert(this.escrow.refund(dealNumber,{from: accounts[5]}));
        await assertRevert.promiseAssert(this.escrow.refund(dealNumber,{from: testAccounts.sender}));
        this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        let senderBalance = web3.eth.getBalance(testAccounts.sender);
        await this.escrow.refund(dealNumber,{from: testAccounts.receiver});
        let senderBalanceAfter = web3.eth.getBalance(testAccounts.sender);
        assert.equal(senderBalance.toString(),senderBalanceAfter.toString());
    });

    it("should NOT allow refund second time", async function () {
        this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        let senderBalance = web3.eth.getBalance(testAccounts.sender);
        await this.escrow.refund(dealNumber,{from: testAccounts.receiver});
        await assertRevert.promiseAssert(this.escrow.refund(dealNumber,{from: testAccounts.receiver}));
        let senderBalanceAfter = web3.eth.getBalance(testAccounts.sender);
        assert.equal(senderBalance.toString(),senderBalanceAfter.toString());

    });

    it("should refund only after 2/3 confirmation", async function () {
        this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        await this.escrow.refund(dealNumber,{from: testAccounts.sender});
        let senderBalance = web3.eth.getBalance(testAccounts.sender);
        await this.escrow.refund(dealNumber,{from: testAccounts.receiver});
        let senderBalanceAfter = web3.eth.getBalance(testAccounts.sender);
        assert.equal(senderBalance.plus(testAmount).toString(),senderBalanceAfter.toString());
        assert.isTrue(await this.escrow.getRefunded.call(dealNumber));
    });

    it("should withdraw with 2 withdraw and one refund", async function () {
        this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        await this.escrow.refund(dealNumber,{from: testAccounts.sender});
        await this.escrow.withdraw(dealNumber,{from: testAccounts.receiver});
        let receiverBalance = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(web3.eth.getBalance(this.escrow.contract.address), testAmount);
        await this.escrow.withdraw(dealNumber,{from: testAccounts.arbiter});
        assert.equal(web3.eth.getBalance(this.escrow.contract.address), 0);
        let receiverBalanceAfter = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(receiverBalance.plus(testAmount).toString(),receiverBalanceAfter.toString());
    });

    it("should withdraw with if user change mind and after refund confirm withdraw", async function () {
        this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        await this.escrow.refund(dealNumber,{from: testAccounts.sender});
        await this.escrow.withdraw(dealNumber,{from: testAccounts.receiver});
        let receiverBalance = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(web3.eth.getBalance(this.escrow.contract.address), testAmount);
        await this.escrow.withdraw(dealNumber,{from: testAccounts.sender});
        assert.equal(web3.eth.getBalance(this.escrow.contract.address), 0);
        let receiverBalanceAfter = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(receiverBalance.plus(testAmount).toString(),receiverBalanceAfter.toString());
    });

    it("should getAddressVote calculate withdraw cont", async function () {
        this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        assert.equal(await this.escrow.getAddressVote.call(testAccounts.sender,dealNumber),0);
        await this.escrow.withdraw(dealNumber,{from: testAccounts.sender});
        assert.equal(await this.escrow.getAddressVote.call(testAccounts.sender,dealNumber),1);
    });

    it("should getAddressVote calculate refund cont", async function () {
        this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        assert.equal(await this.escrow.getAddressVote.call(testAccounts.sender,dealNumber),0);
        await this.escrow.refund(dealNumber,{from: testAccounts.sender});
        assert.equal(await this.escrow.getAddressVote.call(testAccounts.sender,dealNumber),-1);
    });
    it("should not allow to transfer amount different than specified in contract", async function(){
        let senderBalance = web3.eth.getBalance(testAccounts.sender);
        try {
            this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount+1})
        } catch (e) {
            assertRevert.errorOnly(e);
        }
    });
    it("should not allow to transfer if contract balance is more than 0", async function(){
        this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        try{
            this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        }catch (e) {
            assertRevert.errorOnly(e);
        }
        assert.equal(web3.eth.getBalance(this.escrow.contract.address).toString(), testAmount);
        await this.escrow.withdraw(dealNumber,{from: testAccounts.receiver});
        let receiverBalance = web3.eth.getBalance(testAccounts.receiver);
        await this.escrow.withdraw(dealNumber,{from: testAccounts.sender});
        let receiverBalanceAfter = web3.eth.getBalance(testAccounts.receiver);
        assert.equal(receiverBalance.plus(testAmount).toString(),receiverBalanceAfter.toString());
        try {
            this.escrow.contract.payForDeal.sendTransaction(dealNumber,{from: testAccounts.sender, to: this.escrow.contract.address, value: testAmount});
        } catch (e) {
            assertRevert.errorOnly(e);
        }
    });
});
