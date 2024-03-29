import { ethers } from 'hardhat';
import { expect } from 'chai';
import {
  MultiResourceTokenMock,
  ERC721ReceiverMock,
  NonReceiverMock,
  MultiResourceReceiverMock,
} from '../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('MultiResource', async () => {
  let token: MultiResourceTokenMock;
  let nonReceiver: NonReceiverMock;
  let receiver721: ERC721ReceiverMock;
  let receiverMultiresource: MultiResourceReceiverMock;

  let owner: SignerWithAddress;
  let addrs: SignerWithAddress[];

  const name = 'RmrkTest';
  const symbol = 'RMRKTST';

  const metaURIDefault = 'metaURI';
  const customDefault: string[] = [];

  beforeEach(async () => {
    const [signersOwner, ...signersAddr] = await ethers.getSigners();
    owner = signersOwner;
    addrs = signersAddr;

    const Token = await ethers.getContractFactory('MultiResourceTokenMock');
    token = await Token.deploy(name, symbol);
    await token.deployed();
  });

  describe('Init', async function () {
    it('Name', async function () {
      expect(await token.name()).to.equal(name);
    });

    it('Symbol', async function () {
      expect(await token.symbol()).to.equal(symbol);
    });
  });

  describe('ERC165 check', async function () {
    it('can support IERC165', async function () {
      expect(await token.supportsInterface('0x01ffc9a7')).to.equal(true);
    });

    it('can support IERC721', async function () {
      expect(await token.supportsInterface('0x80ac58cd')).to.equal(true);
    });

    it('can support IMultiResource', async function () {
      expect(await token.supportsInterface('0x4d6339c8')).to.equal(true);
    });

    it('cannot support other interfaceId', async function () {
      expect(await token.supportsInterface('0xffffffff')).to.equal(false);
    });
  });

  describe('Check OnReceived ERC721 and Multiresource', async function () {
    it('Revert on transfer to non onERC721/onMultiresource implementer', async function () {
      const tokenId = 1;
      await token.mint(owner.address, tokenId);

      const NonReceiver = await ethers.getContractFactory('NonReceiverMock');
      nonReceiver = await NonReceiver.deploy();
      await nonReceiver.deployed();

      await expect(
        token
          .connect(owner)
          ['safeTransferFrom(address,address,uint256)'](owner.address, nonReceiver.address, 1),
      ).to.be.revertedWith('MultiResource: transfer to non MultiResource Receiver implementer');
    });

    it('onMultiResourceReceived callback on transfer', async function () {
      const tokenId = 1;
      await token.mint(owner.address, tokenId);

      const MRReceiver = await ethers.getContractFactory('MultiResourceReceiverMock');
      receiverMultiresource = await MRReceiver.deploy();
      await receiverMultiresource.deployed();

      await token
        .connect(owner)
        ['safeTransferFrom(address,address,uint256)'](
          owner.address,
          receiverMultiresource.address,
          1,
        );
      expect(await token.ownerOf(1)).to.equal(receiverMultiresource.address);
    });

    it('onERC721Received callback on transfer', async function () {
      const tokenId = 1;
      await token.mint(owner.address, tokenId);

      const ERC721Receiver = await ethers.getContractFactory('ERC721ReceiverMock');
      receiver721 = await ERC721Receiver.deploy();
      await receiver721.deployed();

      await token
        .connect(owner)
        ['safeTransferFrom(address,address,uint256)'](owner.address, receiver721.address, 1);
      expect(await token.ownerOf(1)).to.equal(receiver721.address);
    });
  });

  describe('Resource storage', async function () {
    it('can add resource', async function () {
      const id = 10;

      await expect(token.addResourceEntry(id, metaURIDefault, customDefault))
        .to.emit(token, 'ResourceSet')
        .withArgs(id);
    });

    it('cannot get non existing resource', async function () {
      const id = 10;
      await expect(token.getResource(id)).to.be.revertedWith('RMRK: No resource matching Id');
    });

    it('cannot add resource entry if not issuer', async function () {
      const id = 10;
      await expect(
        token.connect(addrs[1]).addResourceEntry(id, metaURIDefault, customDefault),
      ).to.be.revertedWith('RMRK: Only issuer');
    });

    it('can set and get issuer', async function () {
      const newIssuerAddr = addrs[1].address;
      expect(await token.getIssuer()).to.equal(owner.address);

      await token.setIssuer(newIssuerAddr);
      expect(await token.getIssuer()).to.equal(newIssuerAddr);
    });

    it('cannot set issuer if not issuer', async function () {
      const newIssuer = addrs[1];
      await expect(token.connect(newIssuer).setIssuer(newIssuer.address)).to.be.revertedWith(
        'RMRK: Only issuer',
      );
    });

    it('cannot overwrite resource', async function () {
      const id = 10;

      await token.addResourceEntry(id, metaURIDefault, customDefault);
      await expect(token.addResourceEntry(id, metaURIDefault, customDefault)).to.be.revertedWith(
        'RMRK: resource already exists',
      );
    });

    it('cannot add resource with id 0', async function () {
      const id = ethers.utils.hexZeroPad('0x0', 8);

      await expect(token.addResourceEntry(id, metaURIDefault, customDefault)).to.be.revertedWith(
        'RMRK: Write to zero',
      );
    });

    it('cannot add same resource twice', async function () {
      const id = 10;

      await expect(token.addResourceEntry(id, metaURIDefault, customDefault))
        .to.emit(token, 'ResourceSet')
        .withArgs(id);

      await expect(token.addResourceEntry(id, metaURIDefault, customDefault)).to.be.revertedWith(
        'RMRK: resource already exists',
      );
    });

    it('can add and remove custom data for resource', async function () {
      const resId = 1;
      const customDataTypeKey = 3;
      await token.addResourceEntry(resId, metaURIDefault, customDefault);

      await expect(token.addCustomDataToResource(resId, customDataTypeKey))
        .to.emit(token, 'ResourceCustomDataAdded')
        .withArgs(resId, customDataTypeKey);
      let resource = await token.getResource(resId);
      expect(resource.custom).to.eql([ethers.BigNumber.from(customDataTypeKey)]);

      await expect(token.removeCustomDataFromResource(resId, 0))
        .to.emit(token, 'ResourceCustomDataRemoved')
        .withArgs(resId, customDataTypeKey);
      resource = await token.getResource(resId);
      expect(resource.custom).to.eql([]);
    });
  });

  describe('Adding resources', async function () {
    it('can add resource to token', async function () {
      const resId = 1;
      const resId2 = 2;
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId, resId2]);
      await expect(token.addResourceToToken(tokenId, resId, 0)).to.emit(
        token,
        'ResourceAddedToToken',
      );
      await expect(token.addResourceToToken(tokenId, resId2, 0)).to.emit(
        token,
        'ResourceAddedToToken',
      );

      const pending = await token.getFullPendingResources(tokenId);
      expect(pending).to.be.eql([
        [ethers.BigNumber.from(resId), metaURIDefault, customDefault],
        [ethers.BigNumber.from(resId2), metaURIDefault, customDefault],
      ]);

      expect(await token.getPendingResObjectByIndex(tokenId, 0)).to.eql([
        ethers.BigNumber.from(resId),
        metaURIDefault,
        customDefault,
      ]);
    });

    it('cannot add non existing resource to token', async function () {
      const resId = 1;
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await expect(token.addResourceToToken(tokenId, resId, 0)).to.be.revertedWith(
        'RMRK: No resource matching Id',
      );
    });

    it('cannot add resource to non existing token', async function () {
      const resId = 1;
      const tokenId = 1;

      await addResources([resId]);
      await expect(token.addResourceToToken(tokenId, resId, 0)).to.be.revertedWith(
        'ERC721: owner query for nonexistent token',
      );
    });

    it('cannot add resource twice to the same token', async function () {
      const resId = 1;
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, 0);
      await expect(
        token.addResourceToToken(tokenId, ethers.BigNumber.from(resId), 0),
      ).to.be.revertedWith('MultiResource: Resource already exists on token');
    });

    it('cannot add too many resources to the same token', async function () {
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      for (let i = 1; i <= 128; i++) {
        await addResources([i]);
        await token.addResourceToToken(tokenId, i, 0);
      }

      // Now it's full, next should fail
      const resId = 129;
      await addResources([resId]);
      await expect(token.addResourceToToken(tokenId, resId, 0)).to.be.revertedWith(
        'MultiResource: Max pending resources reached',
      );
    });

    it('can add same resource to 2 different tokens', async function () {
      const resId = 1;
      const tokenId1 = 1;
      const tokenId2 = 2;

      await token.mint(owner.address, tokenId1);
      await token.mint(owner.address, tokenId2);
      await addResources([resId]);
      await token.addResourceToToken(tokenId1, resId, 0);
      await token.addResourceToToken(tokenId2, resId, 0);
    });
  });

  describe('Accepting resources', async function () {
    it('can accept resource if owner', async function () {
      const { tokenOwner, tokenId } = await mintSampleToken();
      const approved = tokenOwner;

      await checkAcceptFromAddress(approved, tokenId);
    });

    it('can accept resource if approved for resources', async function () {
      const { tokenId } = await mintSampleToken();
      const approved = addrs[1];

      await token.approveForResources(approved.address, tokenId);
      await checkAcceptFromAddress(approved, tokenId);
    });

    it('can accept resource if approved for resources for all', async function () {
      const { tokenId } = await mintSampleToken();
      const approved = addrs[2];

      await token.setApprovalForAllForResources(approved.address, true);
      await checkAcceptFromAddress(approved, tokenId);
    });

    it('can accept multiple resources', async function () {
      const resId = 1;
      const resId2 = 2;
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId, resId2]);
      await token.addResourceToToken(tokenId, resId, 0);
      await token.addResourceToToken(tokenId, resId2, 0);
      await expect(token.acceptResource(tokenId, 1)) // Accepting resId2
        .to.emit(token, 'ResourceAccepted')
        .withArgs(tokenId, resId2);
      await expect(token.acceptResource(tokenId, 0))
        .to.emit(token, 'ResourceAccepted')
        .withArgs(tokenId, resId);

      const pending = await token.getFullPendingResources(tokenId);
      expect(pending).to.be.eql([]);

      const accepted = await token.getFullResources(tokenId);
      expect(accepted).to.eql([
        [ethers.BigNumber.from(resId2), metaURIDefault, customDefault],
        [ethers.BigNumber.from(resId), metaURIDefault, customDefault],
      ]);
    });

    it('cannot accept resource twice', async function () {
      const resId = 1;
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, 0);
      await token.acceptResource(tokenId, 0);

      await expect(token.acceptResource(tokenId, 0)).to.be.revertedWith(
        'MultiResource: index out of bounds',
      );
    });

    it('cannot accept resource if not owner', async function () {
      const resId = 1;
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, 0);
      await expect(token.connect(addrs[1]).acceptResource(tokenId, 0)).to.be.revertedWith(
        'MultiResource: not owner',
      );
    });

    it('cannot accept non existing resource', async function () {
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await expect(token.acceptResource(tokenId, 0)).to.be.revertedWith(
        'MultiResource: index out of bounds',
      );
    });
  });

  describe('Overwriting resources', async function () {
    it('can add resource to token overwritting an existing one', async function () {
      const resId = 1;
      const resId2 = 2;
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId, resId2]);
      await token.addResourceToToken(tokenId, resId, 0);
      await token.acceptResource(tokenId, 0);

      // Add new resource to overwrite the first, and accept
      const activeResources = await token.getActiveResources(tokenId);
      await expect(token.addResourceToToken(tokenId, resId2, activeResources[0])).to.emit(
        token,
        'ResourceOverwriteProposed',
      );
      const pendingResources = await token.getPendingResources(tokenId);

      expect(await token.getResourceOverwrites(tokenId, pendingResources[0])).to.eql(
        activeResources[0],
      );
      await expect(token.acceptResource(tokenId, 0)).to.emit(token, 'ResourceOverwritten');

      expect(await token.getFullResources(tokenId)).to.be.eql([
        [ethers.BigNumber.from(resId2), metaURIDefault, customDefault],
      ]);
      // Overwrite should be gone
      expect(await token.getResourceOverwrites(tokenId, pendingResources[0])).to.eql(
        ethers.BigNumber.from(0),
      );
    });

    it('can overwrite non existing resource to token, it could have been deleted', async function () {
      const resId = 1;
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, ethers.utils.hexZeroPad('0x1', 8));
      await token.acceptResource(tokenId, 0);

      expect(await token.getFullResources(tokenId)).to.be.eql([
        [ethers.BigNumber.from(resId), metaURIDefault, customDefault],
      ]);
    });
  });

  describe('Rejecting resources', async function () {
    it('can reject resource if owner', async function () {
      const { tokenOwner, tokenId } = await mintSampleToken();
      const approved = tokenOwner;

      await checkRejectFromAddress(approved, tokenId);
    });

    it('can reject resource if approved for resources', async function () {
      const { tokenId } = await mintSampleToken();
      const approved = addrs[1];

      await token.approveForResources(approved.address, tokenId);
      await checkRejectFromAddress(approved, tokenId);
    });

    it('can reject resource if approved for resources for all', async function () {
      const { tokenId } = await mintSampleToken();
      const approved = addrs[2];

      await token.setApprovalForAllForResources(approved.address, true);
      await checkRejectFromAddress(approved, tokenId);
    });

    it('can reject all resources if owner', async function () {
      const { tokenOwner, tokenId } = await mintSampleToken();
      const approved = tokenOwner;

      await checkRejectAllFromAddress(approved, tokenId);
    });

    it('can reject all resources if approved for resources', async function () {
      const { tokenId } = await mintSampleToken();
      const approved = addrs[1];

      await token.approveForResources(approved.address, tokenId);
      await checkRejectAllFromAddress(approved, tokenId);
    });

    it('can reject all resources if approved for resources for all', async function () {
      const { tokenId } = await mintSampleToken();
      const approved = addrs[2];

      await token.setApprovalForAllForResources(approved.address, true);
      await checkRejectAllFromAddress(approved, tokenId);
    });

    it('can reject resource and overwrites are cleared', async function () {
      const resId = 1;
      const resId2 = 2;
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId, resId2]);
      await token.addResourceToToken(tokenId, resId, 0);
      await token.acceptResource(tokenId, 0);

      // Will try to overwrite but we reject it
      await token.addResourceToToken(tokenId, resId2, resId);
      await token.rejectResource(tokenId, 0);

      expect(await token.getResourceOverwrites(tokenId, resId2)).to.eql(ethers.BigNumber.from(0));
    });

    it('can reject all resources and overwrites are cleared', async function () {
      const resId = 1;
      const resId2 = 2;
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId, resId2]);
      await token.addResourceToToken(tokenId, resId, 0);
      await token.acceptResource(tokenId, 0);

      // Will try to overwrite but we reject all
      await token.addResourceToToken(tokenId, resId2, resId);
      await token.rejectAllResources(tokenId);

      expect(await token.getResourceOverwrites(tokenId, resId2)).to.eql(ethers.BigNumber.from(0));
    });

    it('can reject all pending resources at max capacity', async function () {
      const tokenId = 1;
      const resArr = [];

      for (let i = 1; i < 128; i++) {
        resArr.push(i);
      }

      await token.mint(owner.address, tokenId);
      await addResources(resArr);

      for (let i = 1; i < 128; i++) {
        await token.addResourceToToken(tokenId, i, 1);
      }
      await token.rejectAllResources(tokenId);

      expect(await token.getResourceOverwrites(1, 2)).to.eql(ethers.BigNumber.from(0));
    });

    it('cannot reject resource twice', async function () {
      const resId = 1;
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, 0);
      await token.rejectResource(tokenId, 0);

      await expect(token.rejectResource(tokenId, 0)).to.be.revertedWith(
        'MultiResource: index out of bounds',
      );
    });

    it('cannot reject resource nor reject all if not owner', async function () {
      const resId = 1;
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, 0);

      await expect(token.connect(addrs[1]).rejectResource(tokenId, 0)).to.be.revertedWith(
        'MultiResource: not owner',
      );
      await expect(token.connect(addrs[1]).rejectAllResources(tokenId)).to.be.revertedWith(
        'MultiResource: not owner',
      );
    });

    it('cannot reject non existing resource', async function () {
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await expect(token.rejectResource(tokenId, 0)).to.be.revertedWith(
        'MultiResource: index out of bounds',
      );
    });
  });

  describe('Priorities', async function () {
    it('can set and get priorities', async function () {
      const tokenId = 1;
      await addResourcesToToken(tokenId);

      expect(await token.getActiveResourcePriorities(tokenId)).to.be.eql([0, 0]);
      await expect(token.setPriority(tokenId, [2, 1]))
        .to.emit(token, 'ResourcePrioritySet')
        .withArgs(tokenId);
      expect(await token.getActiveResourcePriorities(tokenId)).to.be.eql([2, 1]);
    });

    it('cannot set priorities for non owned token', async function () {
      const tokenId = 1;
      await addResourcesToToken(tokenId);
      await expect(token.connect(addrs[1]).setPriority(tokenId, [2, 1])).to.be.revertedWith(
        'MultiResource: not owner',
      );
    });

    it('cannot set different number of priorities', async function () {
      const tokenId = 1;
      await addResourcesToToken(tokenId);
      await expect(token.connect(addrs[1]).setPriority(tokenId, [1])).to.be.revertedWith(
        'Bad priority list length',
      );
      await expect(token.connect(addrs[1]).setPriority(tokenId, [2, 1, 3])).to.be.revertedWith(
        'Bad priority list length',
      );
    });

    it('cannot set priorities for non existing token', async function () {
      const tokenId = 1;
      await expect(token.connect(addrs[1]).setPriority(tokenId, [])).to.be.revertedWith(
        'MultiResource: approved query for nonexistent token',
      );
    });
  });

  describe('Token URI', async function () {
    it('can set fallback URI', async function () {
      await token.setFallbackURI('TestURI');
      expect(await token.getFallbackURI()).to.be.eql('TestURI');
    });

    it('gets fallback URI if no active resources on token', async function () {
      const tokenId = 1;
      const fallBackUri = 'fallback404';
      await token.mint(owner.address, tokenId);
      await token.setFallbackURI(fallBackUri);
      expect(await token.tokenURI(tokenId)).to.eql(fallBackUri);
    });

    it('can get token URI when resource is not enumerated', async function () {
      const tokenId = 1;
      await addResourcesToToken(tokenId);
      expect(await token.tokenURI(tokenId)).to.eql(metaURIDefault);
    });

    it('can get token URI when resource is enumerated', async function () {
      const tokenId = 1;
      const resId = 1;
      await addResourcesToToken(tokenId);
      await token.setTokenEnumeratedResource(resId, true);
      expect(await token.isTokenEnumeratedResource(resId)).to.eql(true);
      expect(await token.tokenURI(tokenId)).to.eql(`${metaURIDefault}${tokenId}`);
    });

    it('can get token URI at specific index', async function () {
      const tokenId = 1;
      const resId = 1;
      const resId2 = 2;

      await token.mint(owner.address, tokenId);
      await token.addResourceEntry(resId, 'UriA', customDefault);
      await token.addResourceEntry(resId2, 'UriB', customDefault);
      await token.addResourceToToken(tokenId, resId, 0);
      await token.addResourceToToken(tokenId, resId2, 0);
      await token.acceptResource(tokenId, 0);
      await token.acceptResource(tokenId, 0);

      expect(await token.tokenURIAtIndex(tokenId, 1)).to.eql('UriB');
    });

    it('can get token URI by specific custom value', async function () {
      const tokenId = 1;
      const resId = 1;
      const resId2 = 2;
      // We define some custom types and values which mean something to the issuer.
      // Resource 1 has Width, Height and Type. Resource 2 has Area and Type.
      const customDataWidthKey = 1;
      const customDataWidthValue = ethers.utils.hexZeroPad('0x1111', 16);
      const customDataHeightKey = 2;
      const customDataHeightValue = ethers.utils.hexZeroPad('0x1111', 16);
      const customDataTypeKey = 3;
      const customDataTypeValueA = ethers.utils.hexZeroPad('0xAAAA', 16);
      const customDataTypeValueB = ethers.utils.hexZeroPad('0xBBBB', 16);
      const customDataAreaKey = 4;
      const customDataAreaValue = ethers.utils.hexZeroPad('0x00FF', 16);

      await token.mint(owner.address, tokenId);
      await token.addResourceEntry(resId, 'UriA', [
        customDataWidthKey,
        customDataHeightKey,
        customDataTypeKey,
      ]);
      await token.addResourceEntry(resId2, 'UriB', [customDataTypeKey, customDataAreaKey]);
      await expect(token.setCustomResourceData(resId, customDataWidthKey, customDataWidthValue))
        .to.emit(token, 'ResourceCustomDataSet')
        .withArgs(resId, customDataWidthKey);
      await token.setCustomResourceData(resId, customDataHeightKey, customDataHeightValue);
      await token.setCustomResourceData(resId, customDataTypeKey, customDataTypeValueA);
      await token.setCustomResourceData(resId2, customDataAreaKey, customDataAreaValue);
      await token.setCustomResourceData(resId2, customDataTypeKey, customDataTypeValueB);

      await token.addResourceToToken(tokenId, resId, 0);
      await token.addResourceToToken(tokenId, resId2, 0);
      await token.acceptResource(tokenId, 0);
      await token.acceptResource(tokenId, 0);

      // Finally, user can get the right resource filtering by custom data.
      // In this case, we filter by type being equal to 0xAAAA. (Whatever that means for the issuer)
      expect(
        await token.tokenURIForCustomValue(tokenId, customDataTypeKey, customDataTypeValueB),
      ).to.eql('UriB');
    });
  });

  it('gets fall back if matching value is not find on custom data', async function () {
    const tokenId = 1;
    const resId = 1;
    const resId2 = 2;
    // We define a custom data for 'type'.
    const customDataTypeKey = 1;
    const customDataTypeValueA = ethers.utils.hexZeroPad('0xAAAA', 16);
    const customDataTypeValueB = ethers.utils.hexZeroPad('0xBBBB', 16);
    const customDataTypeValueC = ethers.utils.hexZeroPad('0xCCCC', 16);
    const customDataOtherKey = 2;

    await token.mint(owner.address, tokenId);
    await token.addResourceEntry(resId, 'UriA', [customDataTypeKey]);
    await token.addResourceEntry(resId2, 'UriB', [customDataTypeKey]);
    await token.setCustomResourceData(resId, customDataTypeKey, customDataTypeValueA);
    await token.setCustomResourceData(resId2, customDataTypeKey, customDataTypeValueB);

    await token.addResourceToToken(tokenId, resId, 0);
    await token.addResourceToToken(tokenId, resId2, 0);
    await token.acceptResource(tokenId, 0);
    await token.acceptResource(tokenId, 0);

    await token.setFallbackURI('fallback404');

    // No resource has this custom value for type:
    expect(
      await token.tokenURIForCustomValue(tokenId, customDataTypeKey, customDataTypeValueC),
    ).to.eql('fallback404');
    // No resource has this custom key:
    expect(
      await token.tokenURIForCustomValue(tokenId, customDataOtherKey, customDataTypeValueA),
    ).to.eql('fallback404');
  });

  describe('Approval Cleaning', async function () {
    it('cleans token and resources approvals on transfer', async function () {
      const tokenId = 1;
      const tokenOwner = addrs[1];
      const newOwner = addrs[2];
      const approved = addrs[3];
      await token.mint(tokenOwner.address, tokenId);
      await token.connect(tokenOwner).approve(approved.address, tokenId);
      await token.connect(tokenOwner).approveForResources(approved.address, tokenId);

      expect(await token.getApproved(tokenId)).to.eql(approved.address);
      expect(await token.getApprovedForResources(tokenId)).to.eql(approved.address);

      await token.connect(tokenOwner).transfer(newOwner.address, tokenId);

      expect(await token.getApproved(tokenId)).to.eql(ethers.constants.AddressZero);
      expect(await token.getApprovedForResources(tokenId)).to.eql(ethers.constants.AddressZero);
    });

    it('cleans token and resources approvals on burn', async function () {
      const tokenId = 1;
      const tokenOwner = addrs[1];
      const approved = addrs[3];
      await token.mint(tokenOwner.address, tokenId);
      await token.connect(tokenOwner).approve(approved.address, tokenId);
      await token.connect(tokenOwner).approveForResources(approved.address, tokenId);

      expect(await token.getApproved(tokenId)).to.eql(approved.address);
      expect(await token.getApprovedForResources(tokenId)).to.eql(approved.address);

      await token.connect(tokenOwner).burn(tokenId);

      await expect(token.getApproved(tokenId)).to.be.revertedWith(
        'MultiResource: approved query for nonexistent token',
      );
      await expect(token.getApprovedForResources(tokenId)).to.be.revertedWith(
        'MultiResource: approved query for nonexistent token',
      );
    });
  });

  async function mintSampleToken(): Promise<{ tokenOwner: SignerWithAddress; tokenId: number }> {
    const tokenOwner = owner;
    const tokenId = 1;
    await token.mint(tokenOwner.address, tokenId);

    return { tokenOwner, tokenId };
  }

  async function addResources(ids: number[]): Promise<void> {
    ids.forEach(async (resId) => {
      await token.addResourceEntry(resId, metaURIDefault, customDefault);
    });
  }

  async function addResourcesToToken(tokenId: number): Promise<void> {
    const resId = 1;
    const resId2 = 2;
    await token.mint(owner.address, tokenId);
    await addResources([resId, resId2]);
    await token.addResourceToToken(tokenId, resId, 0);
    await token.addResourceToToken(tokenId, resId2, 0);
    await token.acceptResource(tokenId, 0);
    await token.acceptResource(tokenId, 0);
  }

  async function checkAcceptFromAddress(
    accepter: SignerWithAddress,
    tokenId: number,
  ): Promise<void> {
    const resId = 1;

    await addResources([resId]);
    await token.addResourceToToken(tokenId, resId, 0);
    await expect(token.connect(accepter).acceptResource(tokenId, 0))
      .to.emit(token, 'ResourceAccepted')
      .withArgs(tokenId, resId);

    const pending = await token.getFullPendingResources(tokenId);
    expect(pending).to.be.eql([]);

    const accepted = await token.getFullResources(tokenId);
    expect(accepted).to.eql([[ethers.BigNumber.from(resId), metaURIDefault, customDefault]]);

    expect(await token.getResObjectByIndex(tokenId, 0)).to.eql([
      ethers.BigNumber.from(resId),
      metaURIDefault,
      customDefault,
    ]);
  }

  async function checkRejectFromAddress(
    rejecter: SignerWithAddress,
    tokenId: number,
  ): Promise<void> {
    const resId = 1;

    await addResources([resId]);
    await token.addResourceToToken(tokenId, resId, 0);

    await expect(token.connect(rejecter).rejectResource(tokenId, 0)).to.emit(
      token,
      'ResourceRejected',
    );

    const pending = await token.getFullPendingResources(tokenId);
    expect(pending).to.be.eql([]);
    const accepted = await token.getFullResources(tokenId);
    expect(accepted).to.be.eql([]);
  }

  async function checkRejectAllFromAddress(
    rejecter: SignerWithAddress,
    tokenId: number,
  ): Promise<void> {
    const resId = 1;
    const resId2 = 2;

    await addResources([resId, resId2]);
    await token.addResourceToToken(tokenId, resId, 0);
    await token.addResourceToToken(tokenId, resId2, 0);

    await expect(token.connect(rejecter).rejectAllResources(tokenId)).to.emit(
      token,
      'ResourceRejected',
    );

    const pending = await token.getFullPendingResources(tokenId);
    expect(pending).to.be.eql([]);
    const accepted = await token.getFullResources(tokenId);
    expect(accepted).to.be.eql([]);
  }
});
