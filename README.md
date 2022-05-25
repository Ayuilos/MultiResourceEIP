## Simple Summary
A standard interface for multi-resource non-fungible tokens.

## Abstract

The Multi Resource NFT standard is a standalone part of RMRK concepts and an extension of ERC-721. It allows for the construction of a new primitive: context-dependent output of multimedia information per single NFT.

An NFT can have multiple resources (outputs), and orders them by priority. They do not have to match in mimetype or tokenURI, nor do they depend on one another. Resources are not standalone entities, but should be thought of as “namespaced tokenURIs” that can be ordered at will by the NFT owner, but only modified, updated, added, or removed if agreed on by both owner and minter.

## Motivation

There are four key use cases that the current ERC721 standard is ill-equipped to handle:

cross-metaverse compatibility
multi-media output
media redundancy
NFT evolution
Let us look at each in depth.

Cross-metaverse compatibility
Perhaps better phrased as cross-engine compatibility, solves the (very valid) complaint of gamer communities when they say that a skin for Counterstrike is not portable into something like Fortnite because the engines are different - it is not a simple matter of just having an NFT.

With Multi-resource NFTs, it is.

One resource is a skin for Fortnite, an actual skin file. Another is a skin file for Counterstrike. A third is a generic resource intended to be shown in catalogs, marketplaces, portfolio trackers - a representation, stylized thumbnail, or animated demo or trailer of the skin that renders outside of any of the two games.

When using the NFT in one such game, not only do the game developers not need to pre-build the asset into the game and then allow it based on NFT balance in the logged in web3 address, but the NFT has everything it needs in its skin file, making storage and ownership of this skin actually decentralized and not reliant on the gamedev team.

After the fact, this NFT can be given further utility by means of new additional resources: more games, more skins, appended to the same NFT. Thus, a game skin as an NFT becomes an ever-evolving NFT of infinite utility.

Multi-media output
An NFT that is an eBook can be both a PDF and an audio file at the same time, and depending on which software loads it, that is the media output that gets consumed: PDF if loaded into Kindle, audio if loaded into Audible. Additionally, an extra resource that is a simple image can be present in the NFT, intended for showing on the various marketplaces, SERP pages, portfolio trackers and others - perhaps the book’s cover image.

Media Redundancy
Many NFTs are minted hastily without best practices in mind - specifically, many NFTs are minted with metadata centralized on a server somewhere or, in some cases, a hardcoded IPFS gateway which can also go down, instead of just an IPFS hash.

By adding the same metadata file as different resources, e.g., one resource of a metadata and its linked image on Arweave, one resource of this same combo on Sia, another of the same combo on IPFS, etc., the resilience of the metadata and its referenced media increases exponentially as the chances of all the protocols going down at once become ever less likely.

NFT Evolution
Many NFTs, particularly game related ones, require evolution. This is especially the case in modern metaverses where no metaverse is actually a metaverse - it is just a multiplayer game hosted on someone’s server which replaced username/password logins with reading an NFT’s balance.

When the server goes down or the game shuts down, the player ends up with nothing (loss of experience) or something unrelated (resources or accessories unrelated to the game experience, spamming the wallet, incompatible with other “verses” - see cross-metaverse compatibility above).

With Multi-resource NFTs, a minter or another pre-approved entity is allowed to suggest a new resource to the NFT owner who can then accept it or reject it. The resource can even target an existing resource which is to be replaced.

This allows level-up mechanics where, once enough experience has been collected, a user can accept the level-up. The level-up consists of a new resource being added to the NFT, and once accepted, this new resource replaces the old one.

As a concrete example, think of Pokemon™️ evolving - once enough experience has been attained, a trainer can choose to evolve their monster. With Multi-resource NFTs, it is not necessary to have centralized control over metadata to replace it, nor is it necessary to airdrop another NFT into a user’s wallet - instead, a new Raichu resource is minted onto Pikachu, and if accepted, the Pikachu resource is gone, replaced by Raichu, which now has its own attributes, values, etc.

The level-up mechanic can be further expanded by being combined with nesting and equippables as specified in the RMRK concepts but this is outside of the scope of this EIP.

## Specification

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

```
/// @title ERC-**** Multi-Resource Token Standard
/// @dev See https://eips.ethereum.org/EIPS/********
///  Note: the ERC-165 identifier for this interface is 0x********.
pragma solidity ^0.8.9;

interface IERCMultiResource /* is ERC721 */ {

    struct Resource {
      bytes8 id;
      string src;
      string thumb;
      string metadataURI;
      bytes custom;
    }

    struct LocalResource {
        address resourceAddress;
        bytes8 resourceId;
    }
    /*
    @dev This emits whenever a pending resource has been added to a token's pending resources.
    */
    event ResourceAddedToToken(uint256 indexed tokenId, bytes16 localResourceId);

    /*
    @dev This emits whenever a resource has accepted by the token owner.
    */
    event ResourceAccepted(uint256 indexed tokenId, bytes16 localResourceId);

    /*
    @dev This emits whenever a pending resource has been dropped from the pending resources array.
    */
    event ResourceRejected(uint256 indexed tokenId, bytes16 localResourceId);

    /*
    @dev This emits whenever a resource's priority has been set.
    */
    event ResourcePrioritySet(uint256 indexed tokenId);

    /*
    @dev This emits whenever a pending resource also proposes to overwrite an exisitng resource.
    */
    event ResourceOverwriteProposed(uint256 indexed tokenId, bytes16 localResourceId, bytes16 overwrites);

    /*
    @dev This emits whenever a pending resource overwrites an existing resource.
    */
    event ResourceOverwritten(uint256 indexed tokenId, bytes16 overwritten);

    /*
    @notice Accepts the resouce from pending.
    @dev Moves the resource from the pending array to the accepted array. Array
      order is not preserved.
    @param tokenId the token to accept a resource
    @param resourceIndex the index of the resource to accept
    */
    function acceptResource(uint256 tokenId, uint256 resourceIndex) external;

    /*
    @notice Reject a resource, dropping it from the pending array.
    @dev Drops the resource from the pending array. Array order is not preserved.
    @param tokenId the token to reject a resource
    @param resourceIndex the index of the resource to reject
    */
    function rejectResource(uint256 tokenId, uint256 resourceIndex) external;

    /*
    @notice Reject all resources, clearing the pending array.
    @dev Sets the pending array to empty.
    @param tokenId the token to reject a resource
    */
    function rejectAllResources(uint256 tokenId) external;

    /*
    @notice Set the priority of the active resources array.
    @dev Priorities have a 1:1 relationship with their corresponding index in
      the active resources array. E.G, a priority array of [1, 3, 2] indicates
      that the the active resource at index 1 of the active resource array
      has a priority of 1, index 2 has a priority of 3, and index 3 has a priority
      of 2. There is no validation on priority value input; out of order indexes
      must be handled by the frontend. The length of the priorities array must
      be equal to the present length of the active resources array.
    @param tokenId the token of the resource priority to set
    @param priorities An array of priorities to set.
    */
    function setPriority(uint256 tokenId, uint16[] memory priorities) external;

    /*
    @notice Returns an array of byte16 identifiers from the active resources
      array for resource lookup.
    @dev Each bytes16 resource corresponds to a local mapping of
      (bytes16 => (address, bytes8)), where address is the address of a
      resource storage contract, and bytes8 is the id of the relevant resource
      on that storage contract. See addResourceEntry dev comment for rationale.
    @param tokenId the token of the active resource set to get
    @return an array of bytes16 local resource ids corresponding to active resources
    */
    function getActiveResources(uint256 tokenId) external view returns(bytes16[] memory);

    /*
    @notice Returns an array of byte16 identifiers from the pending resources
      array for resource lookup.
    @dev Each bytes16 resource corresponds to a local mapping of
      (bytes16 => (address, bytes8)), where address is the address of a
      resource storage contract, and bytes8 is the id of the relevant resource
      on that storage contract. See addResourceEntry dev comment for rationale.
    @param tokenId the token of the active resource set to get
    @return an array of bytes16 local resource ids corresponding to pending resources
    */
    function getPendingResources(uint256 tokenId) external view returns(bytes16[] memory);

    /*
    @notice Returns the local resource associated with its bytes16 key.
    @dev The localResource struct consists of an address and a bytes8, corresponding to the
      resource storage contract and the bytes8 key of the resource on that contract.
    @param resourceKey a bytes16 identifier for a local resource object
    @return a LocalResource object
    */
    function getLocalResource(bytes16 resourceKey) public virtual view returns(LocalResource memory);

    /*
    @notice Returns the resource object from a target resource storage contract.
    @param storage the address of the resource storage contract
    @param id the bytes8 identifier of the resource to query
    @return a resource object
    */
    function getResourceObject(address storage, bytes8 id) public virtual view returns (IResourceStorage.Resource memory);

    /*
    @notice Returns an array of uint16 resource priorities
    @dev No checking is done on resource priority ranges, sorting must be
      handled by the frontend.kenId` is not a valid NFT.
    /// @param _tokenId The
    @param tokenId the token of the active resource set to get
    @return an array of uint16 resource priorities corresponding to active resources
    */
    function getActiveResourcePriorities(uint256 tokenId) external view returns(uint16[] memory);

    /*
    @notice Returns the bytes16 resource ID a given token will overwrite if
      overwrite is enabled for a pending resource.
    @param tokenId the token of the active pending overwrite
    @param resId the resource ID which will be potentially overwritten
    @return a bytes16 corresponding to the local resource ID of the resource that will overwrite @param resId
    */
    function getResourceOverwrites(uint256 tokenId, bytes16 resId) external view returns(bytes16);

    /*
    @notice Returns the src field of the first active resource on the token,
      otherwise returns a fallback src.
    @param tokenId the token to query for a URI
    @return the string URI of the token
    */
    function tokenURI(uint256 tokenId) external view returns (string memory);

}

interface ERC721 /* is ERC165 */ {
    /// @dev This emits when ownership of any NFT changes by any mechanism.
    ///  This event emits when NFTs are created (`from` == 0) and destroyed
    ///  (`to` == 0). Exception: during contract creation, any number of NFTs
    ///  may be created and assigned without emitting Transfer. At the time of
    ///  any transfer, the approved address for that NFT (if any) is reset to none.
    event Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId);

    /// @dev This emits when the approved address for an NFT is changed or
    ///  reaffirmed. The zero address indicates there is no approved address.
    ///  When a Transfer event emits, this also indicates that the approved
    ///  address for that NFT (if any) is reset to none.
    event Approval(address indexed _owner, address indexed _approved, uint256 indexed _tokenId);

    /// @dev This emits when an operator is enabled or disabled for an owner.
    ///  The operator can manage all NFTs of the owner.
    event ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved);

    /// @notice Count all NFTs assigned to an owner
    /// @dev NFTs assigned to the zero address are considered invalid, and this
    ///  function throws for queries about the zero address.
    /// @param _owner An address for whom to query the balance
    /// @return The number of NFTs owned by `_owner`, possibly zero
    function balanceOf(address _owner) external view returns (uint256);

    /// @notice Find the owner of an NFT
    /// @dev NFTs assigned to zero address are considered invalid, and queries
    ///  about them do throw.
    /// @param _tokenId The identifier for an NFT
    /// @return The address of the owner of the NFT
    function ownerOf(uint256 _tokenId) external view returns (address);

    /// @notice Transfers the ownership of an NFT from one address to another address
    /// @dev Throws unless `msg.sender` is the current owner, an authorized
    ///  operator, or the approved address for this NFT. Throws if `_from` is
    ///  not the current owner. Throws if `_to` is the zero address. Throws if
    ///  `_tokenId` is not a valid NFT. When transfer is complete, this function
    ///  checks if `_to` is a smart contract (code size > 0). If so, it calls
    ///  `onERC721Received` on `_to` and throws if the return value is not
    ///  `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`.
    /// @param _from The current owner of the NFT
    /// @param _to The new owner
    /// @param _tokenId The NFT to transfer
    /// @param data Additional data with no specified format, sent in call to `_to`
    function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes data) external payable;

    /// @notice Transfers the ownership of an NFT from one address to another address
    /// @dev This works identically to the other function with an extra data parameter,
    ///  except this function just sets data to "".
    /// @param _from The current owner of the NFT
    /// @param _to The new owner
    /// @param _tokenId The NFT to transfer
    function safeTransferFrom(address _from, address _to, uint256 _tokenId) external payable;

    /// @notice Transfer ownership of an NFT -- THE CALLER IS RESPONSIBLE
    ///  TO CONFIRM THAT `_to` IS CAPABLE OF RECEIVING NFTS OR ELSE
    ///  THEY MAY BE PERMANENTLY LOST
    /// @dev Throws unless `msg.sender` is the current owner, an authorized
    ///  operator, or the approved address for this NFT. Throws if `_from` is
    ///  not the current owner. Throws if `_to` is the zero address. Throws if
    ///  `_tokenId` is not a valid NFT.
    /// @param _from The current owner of the NFT
    /// @param _to The new owner
    /// @param _tokenId The NFT to transfer
    function transferFrom(address _from, address _to, uint256 _tokenId) external payable;

    /// @notice Change or reaffirm the approved address for an NFT
    /// @dev The zero address indicates there is no approved address.
    ///  Throws unless `msg.sender` is the current NFT owner, or an authorized
    ///  operator of the current owner.
    /// @param _approved The new approved NFT controller
    /// @param _tokenId The NFT to approve
    function approve(address _approved, uint256 _tokenId) external payable;

    /// @notice Enable or disable approval for a third party ("operator") to manage
    ///  all of `msg.sender`'s assets
    /// @dev Emits the ApprovalForAll event. The contract MUST allow
    ///  multiple operators per owner.
    /// @param _operator Address to add to the set of authorized operators
    /// @param _approved True if the operator is approved, false to revoke approval
    function setApprovalForAll(address _operator, bool _approved) external;

    /// @notice Get the approved address for a single NFT
    /// @dev Throws if `_tokenId` is not a valid NFT.
    /// @param _tokenId The NFT to find the approved address for
    /// @return The approved address for this NFT, or the zero address if there is none
    function getApproved(uint256 _tokenId) external view returns (address);

    /// @notice Query if an address is an authorized operator for another address
    /// @param _owner The address that owns the NFTs
    /// @param _operator The address that acts on behalf of the owner
    /// @return True if `_operator` is an approved operator for `_owner`, false otherwise
    function isApprovedForAll(address _owner, address _operator) external view returns (bool);
}

interface ERC165 {

    function supportsInterface(bytes4 interfaceID) external view returns (bool);

}

interface IResourceStorage {

  struct Resource {
      bytes8 id;
      string src;
      string thumb;
      string metadataURI;
      bytes custom;
  }

  /*
  @notice Returns the resource at the id.
  @dev Exact struct data types are left to the implementer
  @param _resourceId the id of the resource to return
  */
  function getResource(bytes8 _resourceId) external view returns (Resource memory);

}
```
## Rationale

#Resource fields
The MultiResource token standard supports five fields:

id: a bytes8 resource identifier
src: a string pointing to the media associated with the resource
thumb: a string pointing to thumbnail media associated with the resource
metadataURI: A string pointing to a metadata file associated with the resource
custom: A bytes object that may be used to store generic data

#Multi-Resource Storage Schema
Resources are stored on a token as an array of bytes16 identifiers.

In order to reduce redundant on-chain string storage, multi resource tokens store resources by reference via a secondary storage contract. A resource entry on the storage contract is stored via a bytes8 mapping to resource data. A bytes16 identifier is then computed from the hash of (address storageContractAddress, bytes8 resourceId). Both address and bytes8 identifier are then stored on the local contract as a bytes16 mapping to this reference.

A resource array is an array of these bytes16 references.

Resources are stored on a separate contract and referred to by reference for two reasons: generic reference storage on the multiresource token contract for variable resource struct types, and to reduce redundant storage on the multiresource token contract. With this structure, a generic resource can be added once on the storage contract, and a reference to it can be added to it once on the token contract. Implementers can then use string concatenation to procedurally generate a link to a content-addressed archive based on the base SRC in the resource and the token ID. Storing the resource on a new token will only take 16 bytes of storage in the resource array per token for repeated / tokenID dependent resources.

This structure ensures that for tokens whose source differs only via their tokenId, URIs may still be derived programmatically through concatenation.

#Propose-Commit pattern for resource addition
Adding resources to an existing token takes the form of a propose-commit pattern to allow for limited mutability by a 3rd party. When adding a resource to a token, it is first placed in the "Pending" array, and must be migrated to the "Active" array by the token owner. The "Pending" resources array is limited to 128 slots to prevent spam and griefing.

#Resource management
Several functions for resource management are included. In addition to permissioned migration from "Pending" to "Active", the owner of a token may also drop resources from both the active and the pending array -- an emergency function to clear all entries from the pending array is also included.

##TODO:
Fallback Resource

#Resource initialization

#Backward Compatibility
The Multi Resource token standard has been based on existing ERC721 implementations in order to take advantage of the robust tooling available for ERC721 implementations and to ensure compatibility with existing ERC721 infrastructure.

## Reference implementation

A reference implementation by Neon Crisis developer CicadaNCR is available in the RMRK EIP branch of the RMRK EVM contract suite: https://github.com/rmrk-team/evm/blob/eip/contracts/MultiResource_EIP/ERCMultiResourceToken.so

## Security Considerations

The same security considerations as with ERC721 apply: hidden logic may be present in any of the functions, including burn, add resource, accept resource, and more.

Caution is advised when dealing with non-audited contracts.

## Develop

These contracts are tested in Hardhat. Install Hardhat and run `npx hardhat test` to run the test script on the mock MultiResource implementation.
