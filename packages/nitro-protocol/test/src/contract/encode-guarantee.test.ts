import {encodeGuaranteeData, decodeGuaranteeData} from '../../../src/contract/outcome';

const destination = '0x14bcc435f49d130d189737f9762feb25c44ef5b886bef833e31a702af6be4748';

const description0 = 'Encodes and decodes guarantee';

describe('outcome', () => {
  describe('encoding and decoding', () => {
    it.each`
      description     | encodeFunction         | decodeFunction         | data
      ${description0} | ${encodeGuaranteeData} | ${decodeGuaranteeData} | ${[destination]}
    `('$description', ({encodeFunction, decodeFunction, data}) => {
      const encodedData = encodeFunction(data);
      const decodedData = decodeFunction(encodedData);
      expect(decodedData).toEqual(data);
    });
  });
});
