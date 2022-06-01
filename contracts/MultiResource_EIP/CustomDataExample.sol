// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "./MultiResourceToken.sol";

contract CustomDataProducer is MultiResourceToken {

    constructor()
        MultiResourceToken(
            "Test Contract",
            "TEST"
        )
        {}

    struct StatBlock {
        uint16 HP;
        uint16 MP;
        uint8 STR;
        uint8 INT;
    }

  //Pure function to return the stat block in a bytes format; pass the result as the 'custom' field of a resource object.
    function encodeStatBlock(uint16 HP_, uint16 MP_, uint8 STR_, uint8 INT_) public pure returns(bytes memory encodedStatBlock) {
        StatBlock memory stats = StatBlock ({
            HP: HP_,
            MP: MP_,
            STR: STR_,
            INT: INT_
        });

        encodedStatBlock = abi.encode(stats);
    }

}

contract StatBlockConsumer {

    struct StatBlock {
        uint16 HP;
        uint16 MP;
        uint8 STR;
        uint8 INT;
    }

    function getStatBlock(address tokenAddress, bytes8 resourceId, bytes16 customResourceId) public view returns (StatBlock memory stats) {
        bytes memory statBytes = IMultiResource(tokenAddress).getCustomResourceData(resourceId, customResourceId);
        stats = abi.decode(statBytes, (StatBlock));
    }

}
