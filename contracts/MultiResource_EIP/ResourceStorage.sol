// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.9;

/**
    @dev Ancillary resource storage contract.
*/
contract ResourceStorage {

    struct Resource {
        bytes8 id; //8 bytes
        string src; //32+
        string thumb; //32+
        string metadataURI; //32+
        bytes custom;
    }

    //Mapping of bytes8 to Resource. Consider an incrementer for zero collision chance.
    mapping(bytes8 => Resource) private _resources;

    //List of all resources
    bytes8[] private allResources;

    //Name of resource collection
    string private _resourceName;

    constructor(string memory resourceName_) {
        setResourceName(resourceName_);
    }

    /**
     * @dev Function to handle adding a resource entry to the storage contract.
     * param1 _id is a unique resource identifier.
     * param2 _src is the primary URI of the resource (used for non-base resources)
     * param3 _thumb is the thumbnail URI of the resource
     * param4 _metadataURI is the URI of the resource's metadata
     */

    function _addResourceEntry(
        bytes8 _id,
        string memory _src,
        string memory _thumb,
        string memory _metadataURI,
        bytes memory _custom
    ) internal {
        require(_id != bytes8(0), "RMRK: Write to zero");
        require(
            _resources[_id].id == bytes8(0),
            "RMRK: resource already exists"
        );
        Resource memory resource_ = Resource({
            id: _id,
            src: _src,
            thumb: _thumb,
            metadataURI: _metadataURI,
            custom: _custom
        });
        _resources[_id] = resource_;
        allResources.push(_id);
    }

    function getResource(bytes8 resourceId)
        public
        view
        returns (Resource memory)
    {
        Resource memory resource_ = _resources[resourceId];
        require(
            resource_.id != bytes8(0),
            "RMRK: No resource matching Id"
        );
        return resource_;
    }

    /**
     * @dev Resource name getter
     */

    function getResourceName() public view returns (string memory) {
        return _resourceName;
    }

    /**
     * @dev Resource name setter
     */

    function setResourceName(string memory resourceName) internal {
        _resourceName = resourceName;
    }
}
