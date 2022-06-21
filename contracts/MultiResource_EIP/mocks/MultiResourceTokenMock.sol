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
        uint32 resourceId,
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
        uint32 resourceId,
        uint32 overwrites
    ) external onlyIssuer {
        _addResourceToToken(tokenId, resourceId, overwrites);
    }

    function addResourceEntry(
        uint32 id,
        string memory metadataURI,
        uint64[] memory custom
    ) external onlyIssuer {
        _addResourceEntry(id, metadataURI, custom);
    }

    function setCustomResourceData(
        uint32 resourceId,
        uint64 customResourceId,
        bytes memory data
    ) external onlyIssuer {
        _setCustomResourceData(resourceId, customResourceId, data);
    }

    function addCustomDataToResource(
        uint32 resourceId,
        uint64 customResourceId
    ) external onlyIssuer {
        _addCustomDataToResource(resourceId, customResourceId);
    }

    function removeCustomDataFromResource(
        uint32 resourceId,
        uint256 index
    ) external onlyIssuer {
        _removeCustomDataFromResource(resourceId, index);
    }

    function _setIssuer(address issuer) private {
        _issuer = issuer;
    }

}
