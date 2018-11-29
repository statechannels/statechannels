// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/test/helpers/assertRevert.js
export default async (promise, pattern?: string | RegExp) => {
  try {
    await promise;
    throw new Error('Expected revert not received');
  } catch (error) {
    const revertFound = error.message.search('revert') >= 0;
    if (!revertFound) {
      throw new Error('Revert not found');
    }

    const messageMatch = error.message.search(pattern) >= 0;
    if (!messageMatch) {
      throw new Error(`Pattern not found in revert reason. Expected Pattern = ${pattern}; Reason Given = ${error.message}`);
    }

    // If we've reached this point, both expectations should pass.
    // Including these expectations means that someone calling expectRevert does
    // actually include an expectation.
    // It also means that if the caller mistakenly catches one of the errors thrown
    // above, the test will still fail.
    expect(revertFound).toBeTruthy();
    expect(messageMatch).toBeTruthy();
  }
};
