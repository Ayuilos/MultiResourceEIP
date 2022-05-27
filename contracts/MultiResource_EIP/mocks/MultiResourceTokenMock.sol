// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "../MultiResourceToken.sol";

contract MultiResourceTokenMock is MultiResourceToken {

    constructor(string memory name_, string memory symbol_) MultiResourceToken(name_, symbol_) {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function addResourceToToken(
        uint256 _tokenId,
        address _resourceAddress,
        bytes8 _resourceId,
        bytes16 _overwrites
    ) external virtual {
        _addResourceToToken( _tokenId, _resourceAddress, _resourceId, _overwrites);
    }

}