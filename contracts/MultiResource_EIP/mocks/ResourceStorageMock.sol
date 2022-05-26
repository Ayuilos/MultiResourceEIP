// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "../ResourceStorage.sol";

contract ResourceStorageMock is ResourceStorage {

    modifier onlyIssuer() {
        require(_msgSender() == _issuer, "RMRK: Only issuer");
        _;
    }

    address private _issuer;

    constructor(string memory resourceName_) ResourceStorage(resourceName_) {
        _setIssuer(_msgSender());
    }

    function addResourceEntry(
        bytes8 _id,
        string memory _src,
        string memory _thumb,
        string memory _metadataURI,
        bytes memory _custom
    ) external virtual onlyIssuer {
        _addResourceEntry(_id, _src, _thumb, _metadataURI, _custom);
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
}