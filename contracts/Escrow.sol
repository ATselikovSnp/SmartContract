pragma solidity ^0.4.19;

contract Escrow {

    /**
    * Member addresses
    **/
    address private sender;
    address private receiver;
    address private arbiter;

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
    bool finished = false;


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
        require(this.balance > 0);
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
        require(oneTimeCallMapping[name].sender[msg.sender] == false);
        if (oneTimeCallMapping[name].totalCall == 1) {//we increment value after, so this is a second call
            _;
        }
        oneTimeCallMapping[name].sender[msg.sender] = true;
        oneTimeCallMapping[name].totalCall++;
    }

    /**
    * Allow to call function once only
    * @param sender address of sender
    * @param amount amount of ether
    **/
    event PaymentReceived(address sender, uint amount);


    /**
    * Contract constructor
    * @param _sender address of sender
    * @param _receiver address of receiver
    * @param _arbiter address of arbiter
    **/
    function Escrow(address _sender, address _receiver, address _arbiter) public {
        sender = _sender;
        receiver = _receiver;
        arbiter = _arbiter;
    }


    /**
    * Withdraw payout
    * only if 2 users confirmed process
    **/
    function withdraw() onlyMembers onlyIfPayed oneTimeCall('withdraw') public returns (bool){
        receiver.transfer(this.balance);
        finished = true;
        return true;

    }

    /**
    * Refund payout
    * only if 2 users confirmed process
    **/
    function refund() onlyMembers onlyIfPayed oneTimeCall('refund') public returns (bool){
        sender.transfer(this.balance);
        finished = true;
    }

    /**
    * Default payable function
    **/
    function() onlySender onlyIfNoFinished public payable {//should be default payable function?
        //emit PaymentReceived(msg.sender, msg.value); // Use this version after truffle update. Solc 0.4.21+
        PaymentReceived(msg.sender, msg.value);// Triggering event


    }
}