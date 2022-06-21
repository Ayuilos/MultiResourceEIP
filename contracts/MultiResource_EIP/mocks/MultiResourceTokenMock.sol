// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.15;

import "../MultiResourceToken.sol";

contract MultiResourceTokenMock is MultiResourceToken {

    address private _issuer;

    constructor(string memory name, string memory symbol)
        MultiResourceToken(name, symbol)
    {
        _setIssuer(_msgSender());
    }

    modifier onlyIssuer() {
        require(_msgSender() == _issuer, "RMRK: Only issuer");
        _;
    }

    function setFallbackURI(string memory fallbackURI) external onlyIssuer {
        _setFallbackURI(fallbackURI);
    }

    function setTokenEnumeratedResource(
        uint64 resourceId,
        bool state
    ) external onlyIssuer {
        _setTokenEnumeratedResource(resourceId, state);
    }

    function setIssuer(address issuer) external onlyIssuer {
        _setIssuer(issuer);
    }

    function getIssuer() external view returns (address) {
        return _issuer;
    }

    function mint(address to, uint256 tokenId) external onlyIssuer {
        _mint(to, tokenId);
    }

    function addResourceToToken(
        uint256 tokenId,
        uint64 resourceId,
        uint64 overwrites
    ) external onlyIssuer {
        _addResourceToToken(tokenId, resourceId, overwrites);
    }

    function addResourceEntry(
        uint64 id,
        string memory metadataURI,
        uint128[] memory custom
    ) external onlyIssuer {
        _addResourceEntry(id, metadataURI, custom);
    }

    function setCustomResourceData(
        uint64 resourceId,
        uint128 customResourceId,
        bytes memory data
    ) external onlyIssuer {
        _setCustomResourceData(resourceId, customResourceId, data);
    }

    function addCustomDataToResource(
        uint64 resourceId,
        uint128 customResourceId
    ) external onlyIssuer {
        _addCustomDataToResource(resourceId, customResourceId);
    }

    function removeCustomDataFromResource(
        uint64 resourceId,
        uint256 index
    ) external onlyIssuer {
        _removeCustomDataFromResource(resourceId, index);
    }

    function _setIssuer(address issuer) private {
        _issuer = issuer;
    }

}
