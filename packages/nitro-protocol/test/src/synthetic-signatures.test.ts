import {BigNumber, ethers} from 'ethers';
import {ec} from 'elliptic';

// Create and initialize EC context
// (better do it once and reuse it)
const curve = new ec('secp256k1');

// ansazt 0
function createSyntheticSignatureType0(channelId: string) {
  // this naive approach won't always work, since r and s must be elements of the field Z/pZ
  // i.e. no greater than p
  // the chance of exceeding p is extremely small, however
  // https://docs.ethers.io/v5/api/utils/bytes/#Signature
  return {r: channelId, s: channelId, v: 27};
}

// ansazt 1
function createSyntheticSignatureType1(channelId: string) {
  const p = BigNumber.from('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
  return {
    r: ethers.BigNumber.from(channelId).mod(p).toHexString(),
    s: ethers.BigNumber.from(channelId).mod(p).toHexString(),
    v: 27,
  };
}

// ansazt 2
function createSyntheticSignatureType2(channelId: string) {
  const p = BigNumber.from('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
  return {
    r: ethers.BigNumber.from('0x' + channelId.slice(20))
      .mod(p)
      .toHexString(),
    // The Homestead hardfork invalidates signatures with r larger than a certain value
    // eips.ethereum.org/EIPS/eip-2
    // One way to construct a valid one is to just set s to 0
    s: '0x0',
    v: 27, // this is only going to be right about 50% of the time
  };
}

// ansazt 3
function createSyntheticSignatureType3(channelId: string) {
  const p = BigNumber.from('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
  const r = ethers.BigNumber.from(channelId).mod(p).toHexString();
  const s = '0x1ee1c6261f6dc02274587193398a0575c82608edc75665e458a45290016e0494';
  let v = 27;
  // try with
  try {
    computeSyntheticAddress({r, s, v});
  } catch (error) {
    v = 28;
  }
  return {r, s, v};
}

// ansazt 4
function createSyntheticSignatureType4(channelId: string) {
  // const p = BigNumber.from('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
  const r = ethers.BigNumber.from(channelId.slice(0, 20)).toHexString();
  const s = ethers.BigNumber.from('0x' + channelId.slice(20)).toHexString();
  const v = 27;
  // try with
  // try {
  //   computeSyntheticAddress({r, s, v});
  // } catch (error) {
  //   s = BigNumber.from(s).add(1).toHexString();
  // }
  return {r, s, v};
}

function computeDigest(invokerAddress: string) {
  return ethers.utils.keccak256(
    '0x' +
      '03' +
      '000000000000000000000000' +
      invokerAddress.slice(2) +
      '00000000000000000000000000000000'
  );
}

function computeSyntheticAddress(signature) {
  return curve.recoverPubKey(
    digest,
    {r: signature.r.slice(2), s: signature.s.slice(2)},
    signature.v == 27 ? 0 : 1
  );
}

function validSignature(signature) {
  try {
    computeSyntheticAddress(signature);
    return true;
  } catch (error) {
    return false;
  }
}

const invokerAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
const digest = computeDigest(invokerAddress); // a valid ethereum address

const randomChannelIds = [
  '0x4fe3e35437197d331ab44a90afd24052540e02c129b7e2083344b8e4684c2153',
  '0xf94612c92c252b13eae87e896d210bdf7629efb385bc165f7e2c838a3c47ce97',
  '0x108e7a1cf5e88772b1bf71fa90fb1748d38c8c3139478dee40919c61de3ab8e6',
  '0x6f4384c49a125d2b3ad2b4bfef3299e9e034cd9bc8142da939c33e0b7f93b5e8',
  '0xfe8a3c500a127d1065228d5cc905eca5b07141dbf7bd8ee379aed2aef69abaf7',
  '0xabdd98f5ef9266d2548f0ff403ea297d48db1410244778baf4886a224bba85d9',
  '0x1e62678fe85ed13eb9ab030c17e7397cac73777014273b1172e9757282dcb847',
  '0x934353a682684d797dd72398750cc9ffd4f761bd2d002a56a9c5686ea5ef1eb9',
  '0x1c60514fc844c9a14583a56af4085ae641e78f7fd1b3b4ad664cb95d90d8990e',
  '0x5d61916e3da4da896e55317e0ca9b56f6a02f0bc2f8ef25191a7ffa874888629',
  '0x649b070ed0661bc2987b2c9217c594e83013deb56a0fbbf74d1a9ab4d7f134c9',
  '0xe7a3e32ed7fd005069fe0a634a456605a5b0751f69e28ec45a04adc25880dae7',
  '0xb3f955a68c954d5c14d86092b5ed966f34b095c5365dbc7cf6bd4d1f6d080196',
  '0xb636f48296591c40c17ea7c1ea4c92cdd92483d3aef1f17a7c5242ca77e14cc4',
  '0xd7a5fbf91c4fbf9d58bfef9d93bddad37d509f0721fb07164cd746fb3a4070c9',
  '0x6d7167ce997e2994f577d673a0c1d01436e9d5d3ce8c481e4ca42d40375688e1',
  '0x1ee1c6261f6dc02274587193398a0575c82608edc75665e458a45290016e0494',
  '0x47499f4450ca998a0d36335dde4fc46b94848f0b695b35b1faaae9553d0ea825',
  '0xd6ddb58bf269cb84f40c1b85f52161862a29aac30e9736c8ace2c121e5bf7799',
  '0x9933c1e6a0ffb6d8f54732cb79a2e1ed3deda6011c2d617499b3b9717978177a',
  '0xd208569be237a983a72cfd758387a432069ec6a7c1f475571327a4eb415fbc32',
  '0xccdb1b5a0b1c2986020bae8a7ad413c52197d0a8c7d15e26cf322853c1ee2828',
  '0x4efbdbfa72dc36a324c740985cf24276f630eb93c7cf1723059f0471c60b9458',
  '0x81df56462f59031b13d04c973c88abbf27c480b715ecd1035266e4cdbc4e5ffc',
  '0x2905f4dd4f356a7455580f1d600361e4cc69ee41760b8728ddd44bcd380fd40c',
  '0x1ee76ffbfc0489ee3eff8ca62bee6bc571457d454e2b372b4640c25fd1954595',
  '0x2e7bb8f94f97eb0df81d1fed4cb0d2abe1efd16d0c8db0a161efb3dad82dc0e7',
  '0xededa9fb1ef8ab4cf52fb1bff3ec5f8dbd8a5c9e6725eb7a4b403f9f3c50bba3',
  '0x72102cc6cf3869a9c92433a1b76a15a98997bad80412568420cfb31931413a73',
  '0x00e916708c068b7d448d27800da933bb3ca01f0d471d4f963acb5c082f3c195e',
  '0x406f3e06830e34afba82c4bacd063190e8d2bb6f08d3b9c3f63cc62d81974426',
  '0x067329311023818a76fa39d27b9254a9ae47db712a3aab9b3e141a72796f45d5',
  '0x950ca1959165d48767eb1cf3c3e4044cc99c12e8da2b9fb433980bf58fcef35f',
  '0x6b3eea6fb21f73586cac6c473eea6c918755f59b24357c0ddce9afe8be199ec3',
  '0x2da8e4d23aa0cdbaf52618592f22b1d0106dfe7400396715db55a8f25eb8b09b',
  '0xdc6f14d1676e79b32259392619f9d44ba887dc02268ded9bf6a0940990c68f34',
  '0xbb4ee707fb341cf2bc4c2f8da5260a6cada1290d6d5e49ab76c2939c5dbc0956',
  '0x425454fd7abf1f0b677e4ab37808d93706676fa6e37e328ab75926166af71c7e',
  '0xfccc7126b9f274916833b1b76a1762fafff9db2515cf8efbaf7049977c245ff2',
  '0x11017fa4a1dee1bd80274ef3f422701f7490bfdeee6f366661dea6fdc33d0cf2',
  '0x2a56c7699e4b93379d04e08147ca2ac5511de3680904fc8fc3a4c69930ae5654',
  '0x570ceb2a61cffc33ca5d8fa9e7ca99551a7727fcbff8ace2ad9465a4844beb54',
  '0xd62d6dd5a8b081e1710585ca310e2531441ca09204d169aa3cef3932e9372c55',
  '0x9ab5a7fabf4b4d18dab8390a1345663d74caed4bf0244944e25b45e279c022ff',
  '0x0efc8504aa89b4be5f011a7cb2e6e65ebe7b34f49db85826810011567acf8b82',
  '0xd3f33fd36e2e6b35b02d6ca7af3d662baa0142700f22f4bdcbb142bc6eda73ff',
  '0xd4fcc9981db274d957612dff4f33d4e1d1464aa810dfe24a710ac4bbe22e9103',
  '0xcc4404ccb5d5fc2796caf843ea89e54ea9992a081111c8725265cc10bfe93a36',
  '0x0e2ddf64ff04f76439fdd3df68afc2a60fb48cc44ce3ca35aac7b482b4db6544',
  '0x974901f86b6f23408bd8556a104474bd2f780647f561708b0ce9f2d48bc424fa',
  '0x4aa2de0abc4f4ed64e844aaef084ebebd68787130bbe533115f05ea091af124f',
  '0x3d63863af634e118fb5939d4fa769b271c1922be7200beb59924a2a4afa14f4c',
  '0x48d7186ec1fd686a75c52127f9189933632eba9d93f6c522cdf0bdc266f8084b',
  '0x44a6ef730ac6fc372b9180a9ff65a751cc3ff7d0ffebaf4b2ad497343b8718a4',
  '0xdbd712da7b34f3230a5766a1dcce4c98d573560b88a4cf03e5d0bcbceba6933e',
  '0x436b068ce1b22c23cba202525fa432f9c545d34aea5898dfb2725e4af63eb8da',
  '0x6426cac7533ee966f39663f04fd5e2d99c6ca54c453329a60ce853e1af191e5f',
  '0x948b4ac5c2ae76fbdde4833a16eb30c022fd42f16c42bdbfaaa76027f84c99a9',
  '0xe63e3ac6cbd50d594e50f4d0be99e3b0f2c9bafa27c018878f1610c589ea88b5',
  '0xd8c32d77fd5883a48ef4ba0e572cd6019cb3612ff6bb57121893e59a6d389407',
  '0x2b99d0b793cebb64de13fddac88c87bd4a87d69dd58c4fc2a884c7dbb073a541',
  '0x5f89b7b867f0fa9d566a60200db35aa8bc85368d95de016df8279cf34868ce96',
  '0x6243a06f0260a9d827c48d9ceca5b15f7a0e8ad71c06e4e7124a188889fdb6ce',
  '0x5347350a3a3b61bd06b2eea86ab391330d5033802ffb0af711a88d718d268731',
  '0x4943d2051af1fc8035abb0872d536e4b1c719e6e2f7b510fbf0e838764766b57',
  '0x8def4a96437c226a5b9529a94212d666503d4213336dd845efe4b8f186a47878',
  '0x3dbb687cd4a52bf9885da8ef35020a1a67cd78bad5c61dca8d1f7c9998f83ff0',
  '0xe1d63d44cc7eab81fa3a14c308823094b7de1a5e867cb1bb3cad2d4e73599a82',
  '0x34036ea4be214f7676d164277f6cc1dd25e099973413b1be937521143b4f3e79',
  '0xce70b5d6f77b0906d020c4c329936c7e2a413145d47601b011cb27ad4532fb0f',
  '0x151fabe0b41125fb32bf4ad8a9af49c6e4bea92604cdd3dcaeb2cf3d5006fe98',
  '0xd9c62847cada2f73b95706e932ce434ccb85d2e6abe2a1ac8863f1bab35772fa',
  '0xa31e669c877ce951750cad8877752ab57f0fe73ecba39983698e9312f6daf6af',
  '0x7d1655443ca8f2b3d51525537ce29a1c35605b6d9661446f802d31a951303e19',
  '0x85d7af80329f58708564f56a622ce23691732f1670b70fcc964b93854e149c81',
  '0x9d004b855cb2e68fd733cb433dbf624d7ce31b4010694eaa2e2f7ff271152f04',
  '0x249d5fae4592d6c59a5fbf9aa856a2c2e809bc2b54803fb5ab41b160421c1744',
  '0x7db87b43cef1d36748fc9417752156af58c2ef84423b6f0f76a61e70a9efa9d3',
  '0x1335d8699117a5c22ff11b83f820e4cb9d9c9954b328ec3cdd3f35877ff3f4f8',
  '0xab53624c0f489cf34ad3ac75a3f5e9052439843f484a3b49c3df084dd9b0bc7e',
  '0x730f75874c10e765f769722a20c9b2459ad321445161c793ad6be1c7482ec1c5',
  '0x0f233b38d767d1019ff903992140305ebe1d5696aefc8030ae15c71ce3de4193',
  '0x456d8dadf4d09cf4e90f8325657b4ce6c689187769848b18bdc3ca6eef64ab45',
  '0xf3cfc6fc75af41cb7ea9e140ffeedec1069a071789efd16298e3b549f27873f7',
  '0xc1593bdbb38fb0b0bbda2a394a12810e2d0c068ec29567f3e42e21a75cb4518f',
  '0x1c936ea67582f93f418eaeab9fc238b2a00aa8e0485239d06df37f645b9af523',
  '0x8021e4a94bd09b6d59dbe6a95b084a631e9387e7fce48f9b0a3461a5c3f77296',
  '0xa03eacd6f9e376a50b554f10797bea6fbae250141dc658e94d374e7f7fbf10b7',
  '0xbae16c1693e401df8fc2300842b45da7a10b060dd3d905386a44c38cb5d72645',
  '0xd40e1c1f2b150df59d3f8f471adfc36b842ade44a1f898ef6ea67d311236eda0',
  '0xb418e786d82b65a57fc9baa0f9959dc312245f6e8f4adf0e1b30716bbaacdff4',
  '0xd4e92e416c4fd3408c922e99981dbefe2c4400982c2dc4430630bf4812048ccc',
  '0x47e4e6ef9da98081e1001d27a52399a8153aa56c87bb11d3f081d6ce8d9ce553',
  '0x15ba3edab7fff8dd1cb288d32b824e30caa9c812ab7273364908b3e777614d0a',
  '0x24f1e1f9ce32bf2c37f1b94c509f504ee666e979d033ae4f9b87d9d399046468',
  '0xfcb55e8259093c56cdf3b9db8cdae9787ba2b58e7f74cf111dd53c0bc050d2aa',
  '0x0e138e6004ba0671b08928aa355f586a0c0ff8acf5412f5e6c2d6eaacc91d240',
  '0xa1d82225831d593e44978d09478f2c826fb23993c04fa8db87bb526604979c89',
  '0x1ded6ddb7b2f0e41b9685d83aaa64b34e0ae726d0bda5034dbe67cceae9c8758',
  '0xd4a42950e9decb7df90bb264000cb7daa4daaeb43074eb9216459ac9370e3ea9',
];

describe('synthetic signatures', () => {
  [
    createSyntheticSignatureType0,
    createSyntheticSignatureType1,
    createSyntheticSignatureType2,
    createSyntheticSignatureType3,
    createSyntheticSignatureType4,
  ].map(fn => {
    it(`generates a signature that will recover to a valid public key / address, using ${fn.name}`, () => {
      const results = randomChannelIds.map(channelId => {
        const signature = fn(channelId);
        return validSignature(signature);
      }); // e.g. [true,false,true,false,...]
      expect(results.filter(x => x)).toHaveLength(randomChannelIds.length); // length represents percentage reliability
    });
  });
});

('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
