pragma solidity ^0.8.15;

import "../interfaces/IMultiResourceReceiver.sol";

contract MultiResourceReceiverMock {

    bytes4 constant MR_RECEIVED = IMultiResourceReceiver.onMultiResourceReceived.selector;

    function onMultiResourceReceived(address, address, uint256, bytes calldata) public returns(bytes4) {
        return MR_RECEIVED;
    }
}
