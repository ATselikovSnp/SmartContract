pragma solidity ^0.4.24;

contract EscrowOneForAll {

    /**
    * Member addresses
    **/
    uint256 public currentDealNumber;
    struct Deal {
        address sender;
        address receiver;
        address arbiter;
        uint256 amount;
        uint256 transferred;
        mapping(string => CallStruct) oneTimeCallMapping;
        bool finished;
        bool refunded;
    }
    mapping (uint256 => Deal) public deals;
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

    modifier onlyIfNotPayed(uint256 dealNumber){
        require (deals[dealNumber].transferred == 0);
        _;
    }

    modifier onlyIfCorrectAmount(uint256 dealNumber){
        require (msg.value == deals[dealNumber].amount);
        _;
    }

    /**
    * Allow only smart contract member
    **/
    modifier onlyMembers(uint256 dealNumber) {
        require(
            (deals[dealNumber].sender == msg.sender)
            || (deals[dealNumber].receiver == msg.sender)
            || (deals[dealNumber].arbiter == msg.sender)
        );
        _;
    }

    /**
    * Allow only sender
    **/
    modifier onlySender(uint256 dealNumber) {
        require(deals[dealNumber].sender == msg.sender);
        _;
    }

    /**
    * Allow only sender
    **/
    modifier onlyIfPayed(uint256 dealNumber) {
        require(deals[dealNumber].transferred > 0);
        _;
    }
    /**
    * Only if currency returned
    **/
    modifier onlyIfNoFinished(uint256 dealNumber) {
        require(!deals[dealNumber].finished);
        _;
    }

    /**
    * Allow to call function once only
    * @param name name of function
    **/
    modifier oneTimeCall(string name, uint256 dealNumber) {
        emit Voted();
        Deal storage deal = deals[dealNumber];
        require(deal.oneTimeCallMapping[name].sender[msg.sender] == false);
        if (deal.oneTimeCallMapping[name].totalCall == 1) {//we increment value after, so this is a second call
            _;
        }
        deal.oneTimeCallMapping[name].sender[msg.sender] = true;
        deal.oneTimeCallMapping[name].totalCall++;
    }

    /**
    * Event that provide emitted on payments
    * @param sender address of sender
    * @param amount amount of ether
    **/
    event PaymentReceived(address sender, uint amount);

    /**
    * Event that emitted on Voting of smart contract participants
    **/
    event Voted();

    /**
    * Event that emitted on finalization of smart contract
    **/
    event Finalized();


    /**
    * Contract constructor
    **/
    constructor() public {
       currentDealNumber = 0;
    }


    /**
    * Withdraw payout
    * only if 2 users confirmed process
    **/
    function createDeal(address _sender, address _receiver, address _arbiter, uint256 _amount) public returns(uint256){
        Deal storage deal = deals[currentDealNumber];
        deal.sender = _sender;
        deal.receiver = _receiver;
        deal.arbiter = _arbiter;
        deal.amount = _amount;
        deal.transferred = 0;
        deal.finished = false;
        deal.refunded = false;
        uint256 dealNumber = currentDealNumber;
        currentDealNumber += 1;
        return dealNumber;
    }

    function withdraw(uint256 dealNumber) onlyMembers(dealNumber) onlyIfPayed(dealNumber) oneTimeCall('withdraw', dealNumber) public returns (bool){
        Deal storage deal = deals[dealNumber];
        deal.receiver.transfer(deal.transferred);
        deal.finished = true;
        emit Finalized();
        return true;
    }

    /**
    * Refund payout
    * only if 2 users confirmed process
    **/
    function refund(uint256 dealNumber) onlyMembers(dealNumber) onlyIfPayed(dealNumber) oneTimeCall('refund', dealNumber) public returns (bool){
        Deal storage deal = deals[dealNumber];
        deal.sender.transfer(deal.transferred);
        deal.refunded = true;
        deal.finished = true;
        emit Finalized();
        return true;
    }
    function getRefunded(uint256 dealNumber) public view returns(bool){
        return deals[dealNumber].refunded;
    }
    /**
    * Pay function
    **/
    function payForDeal(uint256 dealNumber) onlySender(dealNumber) onlyIfNoFinished(dealNumber) onlyIfCorrectAmount(dealNumber) onlyIfNotPayed(dealNumber) public payable {
        Deal storage deal = deals[dealNumber];
        deal.transferred = msg.value;
        emit PaymentReceived(msg.sender, msg.value);
    }

    /**
    * Getter user vote status '1' - withdraw  '-1' refund, '0' - no vote
    **/
    function getAddressVote(address userAddress, uint256 dealNumber) public view returns (int8){
        if ((deals[dealNumber].oneTimeCallMapping['withdraw'].totalCall > 0) && deals[dealNumber].oneTimeCallMapping['withdraw'].sender[userAddress]){
            return 1;
        }
        if ((deals[dealNumber].oneTimeCallMapping['refund'].totalCall > 0) && deals[dealNumber].oneTimeCallMapping['refund'].sender[userAddress]){
            return -1;
        }
        return 0;
    }
}
