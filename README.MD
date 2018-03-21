# About
This repository contains basic ESCROW smart contract for [Crypt-ON](https://crypt-on.io/) project.

Smart contract allow to secure send currency between two address on Ethereum network. 
To create new ESCROW you should provide three addresses into  Ethereum networks - sender, receiver and arbiter.

Next we will call this three addresses as members.

Smart contract hold all currency and wait for members command. 

Members allow to control currency flow (withdraw or refund).  
To execute any of this operations smart contract required al least 2 votes of 3.
Ideally sender and receiver solving problems with them self, but sometimes they need help of external member (arbiter) to solve conflicts.

Smart contract allow only sender member to transfer currency into smart contract.

No one allow to send currency to smart contract after member decide to withdraw or refund all available currency. 


# Testing
You should have [node.js](https://nodejs.org/en/) installed
```bash
npm test
```

# Compile
```bash
npm run compile
```
