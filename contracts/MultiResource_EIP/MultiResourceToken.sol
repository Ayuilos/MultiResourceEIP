// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.15;

import "./interfaces/IMultiResource.sol";
import "./interfaces/IERC721Receiver.sol";
import "./library/MultiResourceLib.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract MultiResourceToken is Context, IERC721, IMultiResource {

    using MultiResourceLib for uint256;
    using MultiResourceLib for uint64[];
    using MultiResourceLib for uint128[];
    using Address for address;
    using Strings for uint256;

    // Token name
    string private _name;

    // Token symbol
    string private _symbol;

    // Mapping from token ID to owner address
    mapping(uint256 => address) private _owners;

    // Mapping owner address to token count
    mapping(address => uint256) private _balances;

    // Mapping from token ID to approved address
    mapping(uint256 => address) private _tokenApprovals;

    // Mapping from owner to operator approvals
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Mapping from token ID to approved address for resources
    mapping(uint256 => address) internal _tokenApprovalsForResources;

    // Mapping from owner to operator approvals for resources
    mapping(
        address => mapping(address => bool)
    ) internal _operatorApprovalsForResources;

    //mapping of uint64 Ids to resource object
    mapping(uint64 => Resource) private _resources;

    //mapping of tokenId to new resource, to resource to be replaced
    mapping(uint256 => mapping(uint64 => uint64)) private _resourceOverwrites;

    //mapping of tokenId to all resources
    mapping(uint256 => uint64[]) private _activeResources;

    //mapping of tokenId to an array of resource priorities
    mapping(uint256 => uint16[]) private _activeResourcePriorities;

    //Double mapping of tokenId to active resources
    mapping(uint256 => mapping(uint64 => bool)) private _tokenResources;

    //mapping of tokenId to all resources by priority
    mapping(uint256 => uint64[]) private _pendingResources;

    //Mapping of uint64 resource ID to tokenEnumeratedResource for tokenURI
    mapping(uint64 => bool) private _tokenEnumeratedResource;

    //Mapping of uint128 custom field to bytes data
    mapping(uint64 => mapping (uint128 => bytes)) private _customResourceData;

    //List of all resources
    uint64[] private _allResources;

    //fallback URI
    string private _fallbackURI;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    ////////////////////////////////////////
    //        ERC-721 COMPLIANCE
    ////////////////////////////////////////


    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return
            interfaceId == type(IMultiResource).interfaceId ||
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }


    function balanceOf(
        address owner
    ) public view virtual override returns (uint256) {
        require(
            owner != address(0),
            "ERC721: address zero is not a valid owner"
        );
        return _balances[owner];
    }


    function ownerOf(
        uint256 tokenId
    ) public view virtual override returns (address) {
        address owner = _owners[tokenId];
        require(
            owner != address(0),
            "ERC721: owner query for nonexistent token"
        );
        return owner;
    }


    function name() public view virtual returns (string memory) {
        return _name;
    }


    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }


    function approve(address to, uint256 tokenId) public virtual {
        address owner = ownerOf(tokenId);
        require(to != owner, "MultiResource: approval to current owner");
        require(
            _msgSender() == owner || isApprovedForAll(owner, _msgSender()),
            "MultiResource: approve caller is not owner nor approved for all"
        );

        _approve(to, tokenId);
    }

    function approveForResources(address to, uint256 tokenId) external virtual {
        address owner = ownerOf(tokenId);
        require(to != owner, "MultiResource: approval to current owner");
        require(
            _msgSender() == owner
            || isApprovedForAllForResources(owner, _msgSender()),
            "MultiResource: approve caller is not owner nor approved for all"
        );
        _approveForResources(to, tokenId);
    }


    function getApproved(
        uint256 tokenId)
    public view virtual override returns (address) {
        require(
            _exists(tokenId),
            "MultiResource: approved query for nonexistent token"
        );

        return _tokenApprovals[tokenId];
    }


    function getApprovedForResources(
        uint256 tokenId
    ) public virtual view returns (address) {
        require(
            _exists(tokenId),
            "MultiResource: approved query for nonexistent token"
        );
        return _tokenApprovalsForResources[tokenId];
    }


    function setApprovalForAll(
        address operator,
        bool approved
    ) public virtual override {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    function isApprovedForAll(
        address owner,
        address operator
    ) public view virtual override returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function setApprovalForAllForResources(
        address operator,
        bool approved
    ) public virtual override {
        _setApprovalForAllForResources(_msgSender(), operator, approved);
    }

    function isApprovedForAllForResources(
        address owner, address operator
    ) public virtual view returns (bool) {
        return _operatorApprovalsForResources[owner][operator];
    }


    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        //solhint-disable-next-line max-line-length
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "MultiResource: transfer caller is not owner nor approved"
        );

        _transfer(from, to, tokenId);
    }


    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        safeTransferFrom(from, to, tokenId, "");
    }


    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "MultiResource: transfer caller is not owner nor approved"
        );
        _safeTransfer(from, to, tokenId, data);
    }

    function _safeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal virtual {
        _transfer(from, to, tokenId);
        require(
            _checkOnMultiResourceReceived(from, to, tokenId, data),
            "MultiResource: transfer to non MultiResource Receiver implementer"
        );
    }


    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _owners[tokenId] != address(0);
    }


    function _isApprovedOrOwner(
        address spender,
        uint256 tokenId
    ) internal view virtual returns (bool) {
        require(
            _exists(tokenId),
            "MultiResource: approved query for nonexistent token"
        );
        address owner = ownerOf(tokenId);
        return (
            spender == owner
            || isApprovedForAll(owner, spender)
            || getApproved(tokenId) == spender
        );
    }

    function _isApprovedForResourcesOrOwner(
        address user, uint256 tokenId
    ) internal view virtual returns (bool) {
        require(
            _exists(tokenId),
            "MultiResource: approved query for nonexistent token"
        );
        address owner = ownerOf(tokenId);
        return (
            user == owner
            || isApprovedForAllForResources(owner, user)
            || getApprovedForResources(tokenId) == user
        );
    }


    function _safeMint(address to, uint256 tokenId) internal virtual {
        _safeMint(to, tokenId, "");
    }


    function _safeMint(
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal virtual {
        _mint(to, tokenId);
        require(
            _checkOnMultiResourceReceived(address(0), to, tokenId, data),
            "MultiResource: transfer to non MultiResource Receiver implementer"
        );
    }


    function _mint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "MultiResource: mint to the zero address");
        require(!_exists(tokenId), "MultiResource: token already minted");

        _beforeTokenTransfer(address(0), to, tokenId);

        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);

        _afterTokenTransfer(address(0), to, tokenId);
    }


    function _burn(uint256 tokenId) internal virtual {
        address owner = ownerOf(tokenId);

        _beforeTokenTransfer(owner, address(0), tokenId);

        // Clear approvals
        _approve(address(0), tokenId);
        _approveForResources(address(0), tokenId);

        _balances[owner] -= 1;
        delete _owners[tokenId];

        emit Transfer(owner, address(0), tokenId);

        _afterTokenTransfer(owner, address(0), tokenId);
    }


    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {
        require(
            ownerOf(tokenId) == from,
            "MultiResource: transfer from incorrect owner"
        );
        require(
            to != address(0),
            "MultiResource: transfer to the zero address"
        );

        _beforeTokenTransfer(from, to, tokenId);

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);
        _approveForResources(address(0), tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);

        _afterTokenTransfer(from, to, tokenId);
    }


    function _approve(address to, uint256 tokenId) internal virtual {
        _tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    function _approveForResources(
        address to, uint256 tokenId
    ) internal virtual {
        _tokenApprovalsForResources[tokenId] = to;
        emit ApprovalForResources(ownerOf(tokenId), to, tokenId);
    }

    function _setApprovalForAll(
        address owner,
        address operator,
        bool approved
    ) internal virtual {
        require(owner != operator, "MultiResource: approve to caller");
        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }


    function _setApprovalForAllForResources(
        address owner,
        address operator,
        bool approved
    ) internal virtual {
        require(owner != operator, "MultiResource: approve to caller");
        _operatorApprovalsForResources[owner][operator] = approved;
        emit ApprovalForAllForResources(owner, operator, approved);
    }


    function _checkOnMultiResourceReceived(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (to.isContract()) {
            try IMultiResourceReceiver(to).onMultiResourceReceived(
                _msgSender(),
                from,
                tokenId,
                data
            ) returns (bytes4 retval) {
                return retval == IMultiResourceReceiver.onMultiResourceReceived.selector;
            } catch (bytes memory) {}

            try IERC721Receiver(to).onERC721Received(
                _msgSender(),
                from,
                tokenId,
                data
            ) returns (bytes4 retval) {
                return retval == 0x150b7a02; //IERC721 receiver selector
            }

            catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert(
                        "MultiResource: transfer to non MultiResource Receiver implementer"
                    );
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }


    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {}


    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {}

    ////////////////////////////////////////
    //                RESOURCES
    ////////////////////////////////////////

    function getFallbackURI() external view virtual returns (string memory) {
        return _fallbackURI;
    }

    function acceptResource(uint256 tokenId, uint256 index) external virtual {
        require(
            index < _pendingResources[tokenId].length,
            "MultiResource: index out of bounds"
        );
        require(
            _isApprovedForResourcesOrOwner(_msgSender(), tokenId),
            "MultiResource: not owner or approved"
        );
        uint64 resourceId = _pendingResources[tokenId][index];
        _pendingResources[tokenId].removeItemByIndex(index);

        uint64 overwrite = _resourceOverwrites[tokenId][resourceId];
        if (overwrite != uint64(0)) {
            // We could check here that the resource to overwrite actually exists but it is probably harmless.
            _activeResources[tokenId].removeItemByValue(overwrite);
            emit ResourceOverwritten(tokenId, overwrite);
            delete(_resourceOverwrites[tokenId][resourceId]);
        }
        _activeResources[tokenId].push(resourceId);
        //Push 0 value of uint16 to array, e.g., uninitialized
        _activeResourcePriorities[tokenId].push(uint16(0));
        emit ResourceAccepted(tokenId, resourceId);
    }

    function rejectResource(uint256 tokenId, uint256 index) external virtual {
        require(
            index < _pendingResources[tokenId].length,
            "MultiResource: index out of bounds"
        );
        require(
            _pendingResources[tokenId].length > index,
            "MultiResource: Pending resource index out of range"
        );
        require(
            _isApprovedForResourcesOrOwner(_msgSender(), tokenId),
            "MultiResource: not owner or approved"
        );

        uint64 resourceId = _pendingResources[tokenId][index];
        _pendingResources[tokenId].removeItemByValue(resourceId);
        _tokenResources[tokenId][resourceId] = false;
        delete(_resourceOverwrites[tokenId][resourceId]);

        emit ResourceRejected(tokenId, resourceId);
    }

    function rejectAllResources(uint256 tokenId) external virtual {
        require(
            _isApprovedForResourcesOrOwner(_msgSender(), tokenId),
            "MultiResource: not owner or approved"
        );
        uint256 len = _pendingResources[tokenId].length;
        for (uint i; i<len;) {
            uint64 resourceId = _pendingResources[tokenId][i];
            delete _resourceOverwrites[tokenId][resourceId];
            unchecked {++i;}
        }
        delete(_pendingResources[tokenId]);
        emit ResourceRejected(tokenId, uint64(0));
    }

    function setPriority(
        uint256 tokenId,
        uint16[] memory priorities
    ) external virtual {
        uint256 length = priorities.length;
        require(
            length == _activeResources[tokenId].length,
            "MultiResource: Bad priority list length"
        );
        require(
            _isApprovedForResourcesOrOwner(_msgSender(), tokenId),
            "MultiResource: not owner or approved"
        );
        _activeResourcePriorities[tokenId] = priorities;

        emit ResourcePrioritySet(tokenId);
    }

    function getActiveResources(
        uint256 tokenId
    ) public view virtual returns(uint64[] memory) {
        return _activeResources[tokenId];
    }

    function getPendingResources(
        uint256 tokenId
    ) public view virtual returns(uint64[] memory) {
        return _pendingResources[tokenId];
    }

    function getActiveResourcePriorities(
        uint256 tokenId
    ) public view virtual returns(uint16[] memory) {
        return _activeResourcePriorities[tokenId];
    }

    function getResourceOverwrites(
        uint256 tokenId,
        uint64 resourceId
    ) public view virtual returns(uint64) {
        return _resourceOverwrites[tokenId][resourceId];
    }

    function getResource(
        uint64 resourceId
    ) public view virtual returns (Resource memory)
    {
        Resource memory resource = _resources[resourceId];
        require(
            resource.id != uint64(0),
            "RMRK: No resource matching Id"
        );
        return resource;
    }

    function getCustomResourceData(
        uint64 resourceId,
        uint128 customResourceId
    ) public view virtual returns (bytes memory) {
        return _customResourceData[resourceId][customResourceId];
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual returns (string memory) {
        return _tokenURIAtIndex(tokenId, 0);
    }

    function tokenURIAtIndex(
        uint256 tokenId,
        uint256 index
    ) public view virtual returns (string memory) {
        return _tokenURIAtIndex(tokenId, index);
    }

    function tokenURIForCustomValue(
        uint256 tokenId,
        uint128 customResourceId,
        bytes memory customResourceValue
    ) public view virtual returns (string memory) {
        uint64[] memory activeResources = _activeResources[tokenId];
        uint256 len = _activeResources[tokenId].length;
        for (uint index; index<len;) {
            bytes memory actualCustomResourceValue = getCustomResourceData(
                activeResources[index],
                customResourceId
            );
            if (
                keccak256(actualCustomResourceValue) ==
                keccak256(customResourceValue)
            ) {
                return _tokenURIAtIndex(tokenId, index);
            }
            unchecked {++index;}
        }
        return _fallbackURI;
    }

    function _tokenURIAtIndex(
        uint256 tokenId,
        uint256 index
    ) internal view returns (string memory) {
        if (_activeResources[tokenId].length > index)  {
            uint64 activeResId = _activeResources[tokenId][index];
            string memory URI;
            Resource memory _activeRes = getResource(activeResId);
            if (!_tokenEnumeratedResource[activeResId]) {
                URI = _activeRes.metadataURI;
            }
            else {
                string memory baseURI = _activeRes.metadataURI;
                URI = bytes(baseURI).length > 0 ?
                    string(abi.encodePacked(baseURI, tokenId.toString())) : "";
            }
            return URI;
        }
        else {
            return _fallbackURI;
        }
    }

    // To be implemented with custom guards

    function _addResourceEntry(
        uint64 id,
        string memory metadataURI,
        uint128[] memory custom
    ) internal {
        require(id != uint64(0), "RMRK: Write to zero");
        require(
            _resources[id].id == uint64(0),
            "RMRK: resource already exists"
        );
        Resource memory resource = Resource({
            id: id,
            metadataURI: metadataURI,
            custom: custom
        });
        _resources[id] = resource;
        _allResources.push(id);

        emit ResourceSet(id);
    }

    function _setCustomResourceData(
        uint64 resourceId,
        uint128 customResourceId,
        bytes memory data
    ) internal {
        _customResourceData[resourceId][customResourceId] = data;
        emit ResourceCustomDataSet(resourceId, customResourceId);
    }

    function _addCustomDataToResource(
        uint64 resourceId,
        uint128 customResourceId
    ) internal {
        _resources[resourceId].custom.push(customResourceId);
        emit ResourceCustomDataAdded(resourceId, customResourceId);
    }

    function _removeCustomDataFromResource(
        uint64 resourceId,
        uint256 index
    ) internal {
        uint128 customResourceId = _resources[resourceId].custom[index];
        _resources[resourceId].custom.removeItemByIndex(index);
        emit ResourceCustomDataRemoved(resourceId, customResourceId);
    }

    function _addResourceToToken(
        uint256 tokenId,
        uint64 resourceId,
        uint64 overwrites
    ) internal {

        require(
            _owners[tokenId] != address(0),
            "ERC721: owner query for nonexistent token"
        );

        require(
            _tokenResources[tokenId][resourceId] == false,
            "MultiResource: Resource already exists on token"
        );

        require(
            getResource(resourceId).id != uint64(0),
            "MultiResource: Resource not found in storage"
        );

        require(
            _pendingResources[tokenId].length < 128,
            "MultiResource: Max pending resources reached"
        );

        _tokenResources[tokenId][resourceId] = true;

        _pendingResources[tokenId].push(resourceId);

        if (overwrites != uint64(0)) {
            _resourceOverwrites[tokenId][resourceId] = overwrites;
            emit ResourceOverwriteProposed(tokenId, resourceId, overwrites);
        }

        emit ResourceAddedToToken(tokenId, resourceId);
    }

    function _setFallbackURI(string memory fallbackURI) internal {
        _fallbackURI = fallbackURI;
    }

    function _setTokenEnumeratedResource(
        uint64 resourceId,
        bool state
    ) internal {
        _tokenEnumeratedResource[resourceId] = state;
    }

    // Utilities

    function getResObjectByIndex(
        uint256 tokenId,
        uint256 index
    ) public view virtual returns(Resource memory) {
        uint64 resourceId = getActiveResources(tokenId)[index];
        return getResource(resourceId);
    }

    function getPendingResObjectByIndex(
        uint256 tokenId,
        uint256 index
    ) public view virtual returns(Resource memory) {
        uint64 resourceId = getPendingResources(tokenId)[index];
        return getResource(resourceId);
    }

    function getFullResources(
        uint256 tokenId
    ) public view virtual returns (Resource[] memory) {
        uint64[] memory activeResources = _activeResources[tokenId];
        uint256 len = activeResources.length;
        Resource[] memory resources = new Resource[](len);
        for (uint i; i<len;) {
            resources[i] = getResource(activeResources[i]);
            unchecked {++i;}
        }
        return resources;
    }

    function getFullPendingResources(
        uint256 tokenId
    ) public view virtual returns (Resource[] memory) {
        uint64[] memory pendingResources = _pendingResources[tokenId];
        uint256 len = pendingResources.length;
        Resource[] memory resources = new Resource[](len);
        for (uint i; i<len;) {
            resources[i] = getResource(pendingResources[i]);
            unchecked {++i;}
        }
        return resources;
    }

    function getAllResources() public view virtual returns (uint64[] memory) {
        return _allResources;
    }

    function isTokenEnumeratedResource(
        uint64 resourceId
    ) public view virtual returns(bool) {
        return _tokenEnumeratedResource[resourceId];
    }

}
