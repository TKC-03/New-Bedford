// test dependenices -----------------------------------------------
const expect = require('chai').expect;
import Wallet from '../../src/blocks/Wallet';
// -----------------------------------------------------------------
// web3 dependencies -----------------------------------------------
require('dotenv-safe').config();

const ganache = require('ganache-cli');
const Web3 = require('web3');

import { ProviderFor } from '../../src/blocks/Providers';
// -----------------------------------------------------------------
// math dependencies -----------------------------------------------
import Big from 'big.js';
Big.DP = 40;
Big.RM = 0;

const Web3Utils = require('web3-utils');
// -----------------------------------------------------------------

describe('Wallet Test', () => {
  let mainnetProvider: any;
  let ganacheProvider: any;
  let wallet: Wallet;

  before(() => {
    mainnetProvider = ProviderFor('mainnet', {
      type: 'IPC',
      envKeyPath: 'PROVIDER_IPC_PATH',
    });
    ganacheProvider = new Web3(
      ganache.provider({
        fork: mainnetProvider,
        accounts: [
          {
            balance: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
            secretKey: '0x' + process.env.ACCOUNT_SECRET_TEST,
          },
          { balance: '0x0' },
          { balance: '0x0' },
          { balance: '0x0' },
        ],
      }),
    );
    wallet = new Wallet(ganacheProvider, 'ACCOUNT_ADDRESS_TEST', 'ACCOUNT_SECRET_TEST');
  });

  after(() => {
    ganacheProvider.eth.clearSubscriptions();
    mainnetProvider.eth.clearSubscriptions();
    try {
      mainnetProvider.currentProvider.connection.close();
    } catch {
      try {
        mainnetProvider.currentProvider.connection.destroy();
      } catch {
        console.log("Cannot close HTTP provider's connection");
      }
    }
  });

  it('should retrieve lowest unconfirmed nonce', async () => {
    const nonce = await wallet.getLowestLiquidNonce();
    expect(typeof nonce).to.equal('number');
    expect(Number.isInteger(nonce)).to.be.true;
  });

  it('should sign transactions', () => {
    const tx = {
      nonce: Web3Utils.toHex('0'),
      gasPrice: Web3Utils.toHex('35000000000'),
      gasLimit: Web3Utils.toHex('21000'),
      to: '0x0123456789012345678901234567890123456789',
      value: Web3Utils.toHex('0'),
      data: undefined,
    };

    expect(typeof wallet['sign'](tx)).to.equal('string');
    tx.data = Web3Utils.toHex('Hello World');
    expect(typeof wallet['sign'](tx)).to.equal('string');
    tx.value = undefined;
    expect(typeof wallet['sign'](tx)).to.equal('string');
  });

  it('should initialize chain opts', async () => {
    await wallet.init();
    expect(wallet['opts']).to.not.be.undefined;
  });

  it('should send a transaction', async () => {
    const nonce = await wallet.getLowestLiquidNonce();
    const tx = wallet.emptyTx;
    tx.gasPrice = Big(await ganacheProvider.eth.getGasPrice());
    const sentTx = wallet.signAndSend(tx, nonce);

    const receipt = Object(await sentTx);

    expect(receipt.status).to.be.true;
    expect(receipt.to).to.equal(wallet.address.toLowerCase());
    expect(receipt.to).to.equal(receipt.from);
    expect(receipt.gasUsed).to.equal(21000);
  });
});