// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/assertRevert.js
export default async promise => {
  try {
    await promise;
    throw new Error('Expected revert not received');
  } catch (error) {
    const revertFound = error.message.search('revert') >= 0;
    expect(revertFound).toBe(true);
    throw new Error(`Expected "revert", got ${error} instead`);
  }
};
