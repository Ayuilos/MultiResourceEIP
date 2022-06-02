// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "../MultiResourceToken.sol";

contract MultiResourceTokenMock is MultiResourceToken {

    address private _issuer;

    constructor(string memory name_, string memory symbol_)
    MultiResourceToken(name_, symbol_) {
        _setIssuer(_msgSender());
    }

    modifier onlyIssuer() {
        require(_msgSender() == _issuer, "RMRK: Only issuer");
        _;
    }

    function setFallbackURI(string memory fallbackURI) external onlyIssuer {
        _setFallbackURI(fallbackURI);
    }

    function setIssuer(address issuer) external onlyIssuer {
        _setIssuer(issuer);
    }

    function _setIssuer(address issuer) private {
        _issuer = issuer;
    }

    function getIssuer() external view returns (address) {
        return _issuer;
    }

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function addResourceToToken(
        uint256 _tokenId,
        bytes8 _resourceId,
        bytes8 _overwrites
    ) external virtual {
        _addResourceToToken( _tokenId, _resourceId, _overwrites);
    }

    function addResourceEntry(
        bytes8 _id,
        string memory _src,
        string memory _thumb,
        string memory _metadataURI,
        bytes16[] memory _custom
    ) external virtual onlyIssuer {
        _addResourceEntry(_id, _src, _thumb, _metadataURI, _custom);
    }

    function setCustomResourceData(bytes8 resourceId, bytes16 customResourceId, bytes memory data) external onlyIssuer {
        _setCustomResourceData(resourceId, customResourceId, data);
    }

    function addCustomDataRefToResource(bytes8 resourceId, bytes16 customResourceId) external onlyIssuer {
        _addCustomDataRefToResource(resourceId, customResourceId);
    }

    function removeCustomDataRefToResource(bytes8 resourceId, uint256 index) external onlyIssuer {
        _removeCustomDataRefToResource(resourceId, index);
    }

}
