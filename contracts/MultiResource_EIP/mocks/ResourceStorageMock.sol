// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

import "../ResourceStorage.sol";

contract ResourceStorageMock is ResourceStorage {

    constructor(string memory resourceName_) ResourceStorage(resourceName_) {}

    function addResourceEntry(
        bytes8 _id,
        string memory _src,
        string memory _thumb,
        string memory _metadataURI,
        bytes memory _custom
    ) external virtual {
        _addResourceEntry(_id, _src, _thumb, _metadataURI, _custom);
    }
}