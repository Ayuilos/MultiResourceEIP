import { ethers } from 'hardhat';
import { expect } from 'chai';
import { MultiResourceTokenMock } from '../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('MultiResource', async () => {
  let token: MultiResourceTokenMock;

  let owner: SignerWithAddress;
  let addrs: any[];

  const emptyOverwrite = ethers.utils.hexZeroPad('0x0', 8);
  const name = 'RmrkTest';
  const symbol = 'RMRKTST';

  const srcDefault = 'src';
  const thumbDefault = 'thumb';
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

    // it('Resource Storage Name', async function () {
    //   expect(await token.getResourceName()).to.equal(resourceName);
    // });
  });

  describe('Resource storage', async function () {
    it('can add resource', async function () {
      const id = ethers.utils.hexZeroPad('0x1111', 8);

      await expect(
        token.addResourceEntry(id, srcDefault, thumbDefault, metaURIDefault, customDefault),
      )
        .to.emit(token, 'ResourceStorageSet')
        .withArgs(id);
    });

    it('cannot get non existing resource', async function () {
      const id = ethers.utils.hexZeroPad('0x1111', 8);
      await expect(token.getResource(id)).to.be.revertedWith('RMRK: No resource matching Id');
    });

    it('cannot add resource entry if not issuer', async function () {
      const id = ethers.utils.hexZeroPad('0x1111', 8);
      await expect(
        token
          .connect(addrs[1])
          .addResourceEntry(id, srcDefault, thumbDefault, metaURIDefault, customDefault),
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
      const id = ethers.utils.hexZeroPad('0x1111', 8);

      await token.addResourceEntry(id, 'src', thumbDefault, metaURIDefault, customDefault);
      await expect(
        token.addResourceEntry(id, 'newSrc', thumbDefault, metaURIDefault, customDefault),
      ).to.be.revertedWith('RMRK: resource already exists');
    });

    it('cannot add resource with id 0', async function () {
      const id = ethers.utils.hexZeroPad('0x0', 8);

      await expect(
        token.addResourceEntry(id, srcDefault, thumbDefault, metaURIDefault, customDefault),
      ).to.be.revertedWith('RMRK: Write to zero');
    });
  });

  describe('Adding resources', async function () {
    it('can add resource to token', async function () {
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const resId2 = ethers.utils.hexZeroPad('0x0002', 8);
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId, resId2]);
      await expect(token.addResourceToToken(tokenId, resId, emptyOverwrite)).to.emit(
        token,
        'ResourceAddedToToken',
      );
      await expect(token.addResourceToToken(tokenId, resId2, emptyOverwrite)).to.emit(
        token,
        'ResourceAddedToToken',
      );

      const pending = await token.getFullPendingResources(tokenId);
      expect(pending).to.be.eql([
        [resId, srcDefault, thumbDefault, metaURIDefault, customDefault],
        [resId2, srcDefault, thumbDefault, metaURIDefault, customDefault],
      ]);

      expect(await token.getPendingResObjectByIndex(tokenId, 0)).to.eql([
        resId,
        srcDefault,
        thumbDefault,
        metaURIDefault,
        customDefault,
      ]);
    });

    it('cannot add non existing resource to token', async function () {
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await expect(token.addResourceToToken(tokenId, resId, emptyOverwrite)).to.be.revertedWith(
        'RMRK: No resource matching Id',
      );
    });

    it('cannot add resource to non existing token', async function () {
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const tokenId = 1;

      await addResources([resId]);
      await expect(token.addResourceToToken(tokenId, resId, emptyOverwrite)).to.be.revertedWith(
        'ERC721: owner query for nonexistent token',
      );
    });

    it('cannot add resource twice to the same token', async function () {
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, emptyOverwrite);
      await expect(token.addResourceToToken(tokenId, resId, emptyOverwrite)).to.be.revertedWith(
        'MultiResource: Resource already exists on token',
      );
    });

    it('cannot add too many resources to the same token', async function () {
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      for (let i = 1; i <= 128; i++) {
        const resId = ethers.utils.hexZeroPad(ethers.utils.hexValue(i), 8);
        await addResources([resId]);
        await token.addResourceToToken(tokenId, resId, emptyOverwrite);
      }

      // Now it's full, next should fail
      const resId = ethers.utils.hexZeroPad(ethers.utils.hexValue(129), 8);
      await addResources([resId]);
      await expect(token.addResourceToToken(tokenId, resId, emptyOverwrite)).to.be.revertedWith(
        'MultiResource: Max pending resources reached',
      );
    });

    // it('can add resources from different storages to token', async function () {
    //   const resId = ethers.utils.hexZeroPad('0x0001', 8);
    //   const resId2 = ethers.utils.hexZeroPad('0x0002', 8);
    //   const tokenId = 1;

    //   await token.mint(owner.address, tokenId);
    //   await addResources([resId]);
    //   await addResources([resId2], storage2);
    //   await token.addResourceToToken(tokenId, resId, emptyOverwrite);
    //   await token.addResourceToToken(tokenId, storage2.address, resId2, emptyOverwrite);

    //   const pending = await token.getFullPendingResources(tokenId);
    //   expect(pending).to.be.eql([
    //     [resId, srcDefault, thumbDefault, metaURIDefault, customDefault],
    //     [resId2, srcDefault, thumbDefault, metaURIDefault, customDefault],
    //   ]);
    // });
  });

  describe('Accepting resources', async function () {
    it('can accept resource', async function () {
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, emptyOverwrite);
      await expect(token.acceptResource(tokenId, 0)).to.emit(token, 'ResourceAccepted');

      const pending = await token.getFullPendingResources(tokenId);
      expect(pending).to.be.eql([]);

      expect(await token.getResObjectByIndex(tokenId, 0)).to.eql([
        resId,
        srcDefault,
        thumbDefault,
        metaURIDefault,
        customDefault,
      ]);
    });

    it('cannot accept resource twice', async function () {
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, emptyOverwrite);
      await token.acceptResource(tokenId, 0);

      await expect(token.acceptResource(tokenId, 0)).to.be.revertedWith(
        'MultiResource: index out of bounds',
      );
    });

    it('cannot accept resource if not owner', async function () {
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, emptyOverwrite);
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
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const resId2 = ethers.utils.hexZeroPad('0x0002', 8);
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId, resId2]);
      await token.addResourceToToken(tokenId, resId, emptyOverwrite);
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
        [resId2, srcDefault, thumbDefault, metaURIDefault, customDefault],
      ]);
      // Overwrite should be gone
      expect(await token.getResourceOverwrites(tokenId, pendingResources[0])).to.eql(
        ethers.utils.hexZeroPad('0x0000', 8),
      );
    });

    it('can overwrite non existing resource to token, it could have been deleted', async function () {
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, ethers.utils.hexZeroPad('0x1', 8));
      await token.acceptResource(tokenId, 0);

      expect(await token.getFullResources(tokenId)).to.be.eql([
        [resId, srcDefault, thumbDefault, metaURIDefault, customDefault],
      ]);
    });
  });

  describe('Rejecting resources', async function () {
    it('can reject resource', async function () {
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, emptyOverwrite);

      await expect(token.rejectResource(tokenId, 0)).to.emit(token, 'ResourceRejected');

      const pending = await token.getFullPendingResources(tokenId);
      expect(pending).to.be.eql([]);
      const accepted = await token.getFullResources(tokenId);
      expect(accepted).to.be.eql([]);
    });

    it('can reject all resources', async function () {
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const resId2 = ethers.utils.hexZeroPad('0x0002', 8);
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId, resId2]);
      await token.addResourceToToken(tokenId, resId, emptyOverwrite);
      await token.addResourceToToken(tokenId, resId2, emptyOverwrite);

      await expect(token.rejectAllResources(tokenId)).to.emit(token, 'ResourceRejected');

      const pending = await token.getFullPendingResources(tokenId);
      expect(pending).to.be.eql([]);
      const accepted = await token.getFullResources(tokenId);
      expect(accepted).to.be.eql([]);
    });

    it('cannot reject resource twice', async function () {
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, emptyOverwrite);
      await token.rejectResource(tokenId, 0);

      await expect(token.rejectResource(tokenId, 0)).to.be.revertedWith(
        'MultiResource: index out of bounds',
      );
    });

    it('cannot reject resource if not owner', async function () {
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      const tokenId = 1;

      await token.mint(owner.address, tokenId);
      await addResources([resId]);
      await token.addResourceToToken(tokenId, resId, emptyOverwrite);
      await expect(token.connect(addrs[1]).rejectResource(tokenId, 0)).to.be.revertedWith(
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
        'ERC721: owner query for nonexistent token',
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
      const resId = ethers.utils.hexZeroPad('0x0001', 8);
      await addResourcesToToken(tokenId);
      await token.setTokenEnumeratedResource(resId, true);
      expect(await token.isTokenEnumeratedResource(resId)).to.eql(true);
      expect(await token.tokenURI(tokenId)).to.eql(`${metaURIDefault}${tokenId}`);
    });
  });

  async function addResources(ids: string[]): Promise<void> {
    ids.forEach(async (resId) => {
      await token.addResourceEntry(resId, srcDefault, thumbDefault, metaURIDefault, customDefault);
    });
  }

  async function addResourcesToToken(tokenId: number): Promise<void> {
    const resId = ethers.utils.hexZeroPad('0x0001', 8);
    const resId2 = ethers.utils.hexZeroPad('0x0002', 8);
    await token.mint(owner.address, tokenId);
    await addResources([resId, resId2]);
    await token.addResourceToToken(tokenId, resId, emptyOverwrite);
    await token.addResourceToToken(tokenId, resId2, emptyOverwrite);
    await token.acceptResource(tokenId, 0);
    await token.acceptResource(tokenId, 0);
  }
});
