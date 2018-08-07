pragma solidity ^0.4.24;

contract Escrow {

    /**
    * Member addresses
    **/
    address private sender;
    address private receiver;
    address private arbiter;

    uint256 private amount;

    /**
    * Structure to control call function numbers
    **/
    struct CallStruct {
        uint totalCall;
        mapping(address => bool) sender;
    }
    /**
    * Mapping for control limit call
    **/
    mapping(string => CallStruct) oneTimeCallMapping;

    /**
    * Flag show that escrow and finished (do not allow to send money into black hole)
    **/
    bool public finished = false;

    /**
    * Flag show that escrow and refunded
    **/
    bool public refunded = false;

    modifier onlyIfNotPayed(){
        require (address(this).balance == amount);
        _;
    }

    modifier onlyIfCorrectAmount(){
        require (msg.value == amount);
        _;
    }

    /**
    * Allow only smart contract member
    **/
    modifier onlyMembers() {
        require(
            (sender == msg.sender)
            || (receiver == msg.sender)
            || (arbiter == msg.sender)
        );
        _;
    }

    /**
    * Allow only sender
    **/
    modifier onlySender() {
        require(sender == msg.sender);
        _;
    }

    /**
    * Allow only sender
    **/
    modifier onlyIfPayed() {
        require(address(this).balance > 0);
        _;
    }
    /**
    * Only if currency returned
    **/
    modifier onlyIfNoFinished() {
        require(!finished);
        _;
    }

    /**
    * Allow to call function once only
    * @param name name of function
    **/
    modifier oneTimeCall(string name) {
        emit Voted();
        require(oneTimeCallMapping[name].sender[msg.sender] == false);
        if (oneTimeCallMapping[name].totalCall == 1) {//we increment value after, so this is a second call
            _;
        }
        oneTimeCallMapping[name].sender[msg.sender] = true;
        oneTimeCallMapping[name].totalCall++;
    }

    /**
    * Event that provide emitted on payments
    * @param sender address of sender
    * @param amount amount of ether
    **/
    event PaymentReceived(address sender, uint amount);

    /**
    * Event that emitted on voting of smart contract participants
    **/
    event Voted();

    /**
    * Event that emitted on finalization of smart contract
    **/
    event Finalized();


    /**
    * Contract constructor
    * @param _sender address of sender
    * @param _receiver address of receiver
    * @param _arbiter address of arbiter
    **/
    constructor(address _sender, address _receiver, address _arbiter, uint256 _amount) public {
        sender = _sender;
        receiver = _receiver;
        arbiter = _arbiter;
        amount = _amount;
    }


    /**
    * Withdraw payout
    * only if 2 users confirmed process
    **/
    function withdraw() onlyMembers onlyIfPayed oneTimeCall('withdraw') public returns (bool){
        receiver.transfer(address(this).balance);
        finished = true;
        emit Finalized();
        return true;

    }

    /**
    * Refund payout
    * only if 2 users confirmed process
    **/
    function refund() onlyMembers onlyIfPayed oneTimeCall('refund') public returns (bool){
        sender.transfer(address(this).balance);
        refunded = true;
        finished = true;
        emit Finalized();
        return true;
    }

    /**
    * Default payable function
    **/
    function() onlySender onlyIfNoFinished onlyIfCorrectAmount onlyIfNotPayed public payable {//default payable function

        emit PaymentReceived(msg.sender, msg.value);
    }

    /**
    * Getter user vote status '1' - withdraw  '-1' refund, '0' - no vote
    **/
    function getAddressVote(address userAddress) public view returns (int8){
        if ((oneTimeCallMapping['withdraw'].totalCall > 0) && oneTimeCallMapping['withdraw'].sender[userAddress]){
            return 1;
        }
        if ((oneTimeCallMapping['refund'].totalCall > 0) && oneTimeCallMapping['refund'].sender[userAddress]){
            return -1;
        }
        return 0;
    }
}