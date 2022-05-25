// SPDX-License-Identifier: Apache-2.0

import "./IMultiResourceReceiver.sol";
import "./IResourceStorage.sol";
import "./IERC721.sol";

pragma solidity ^0.8.0;

interface IMultiResource is IERC721 {

    struct LocalResource {
        address resourceAddress;
        bytes8 resourceId;
    }

    event ResourceAddedToToken(uint256 indexed tokenId, bytes16 localResourceId);

    event ResourceAccepted(uint256 indexed tokenId, bytes16 localResourceId);

    event ResourceRejected(uint256 indexed tokenId, bytes16 localResourceId);

    event ResourcePrioritySet(uint256 indexed tokenId);

    event ResourceOverwriteProposed(uint256 indexed tokenId, bytes16 localResourceId, bytes16 overwrites);

    event ResourceOverwritten(uint256 indexed tokenId, bytes16 overwritten);

    function acceptResource(uint256 _tokenId, uint256 index) external;

    function rejectResource(uint256 _tokenId, uint256 index) external;

    function rejectAllResources(uint256 _tokenId) external;

    function setPriority(uint256 _tokenId, uint16[] memory _ids) external;

    function getActiveResources(uint256 _tokenId) external view returns(bytes16[] memory);

    function getPendingResources(uint256 _tokenId) external view returns(bytes16[] memory);

    function getActiveResourcePriorities(uint256 _tokenId) external view returns(uint16[] memory);

    function getResourceOverwrites(uint256 _tokenId, bytes16 _resId) external view returns(bytes16);

    function getLocalResource(bytes16 resourceKey) external view returns(LocalResource memory);

    function getResourceObject(address _storage, bytes8 _id) external view returns (IResourceStorage.Resource memory);

    function tokenURI(uint256 _tokenId) external view returns (string memory);

    //Abstractions

    function getResObjectByIndex(uint256 _tokenId, uint256 _index) external view returns(IResourceStorage.Resource memory);

    function getPendingResObjectByIndex(uint256 _tokenId, uint256 _index) external view returns(IResourceStorage.Resource memory);

    function getFullResources(uint256 _tokenId) external view returns (IResourceStorage.Resource[] memory);

    function getFullPendingResources(uint256 _tokenId) external view returns (IResourceStorage.Resource[] memory);
}
