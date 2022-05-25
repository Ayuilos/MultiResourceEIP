// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

interface IResourceStorage {

    //Resource events
    event ResourceStorageSet(bytes8 id);

    struct Resource {
        bytes8 id; //8 bytes
        string src; //32+
        string thumb; //32+
        string metadataURI; //32+
        bytes custom;
    }

    function getResource(bytes8 resourceId)
        external
        view
        returns (Resource memory);
}
