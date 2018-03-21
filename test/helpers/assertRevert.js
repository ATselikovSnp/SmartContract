//https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/assertRevert.js

let errorOnly = (error) => {
    const revertFound = error.message.search('revert') >= 0;
    assert(revertFound, `Expected "revert", got ${error} instead`);
};

let promiseFunction = async (promise) => {
    try {
        await promise;
        assert.fail('Expected revert not received');
    } catch (error) {
        errorOnly(error);
    }
};

module.exports = {
    errorOnly: errorOnly,
    promiseAssert: promiseFunction
};