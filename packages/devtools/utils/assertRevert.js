const chai = require('chai');
module.exports = {
    expectRevert: (promise, pattern) => {
        let revertFound, messageMatch;
        promise.then(() => {
            chai.assert.fail('Expected revert not received');
        }).catch((error) => {
            revertFound = error.message.search('revert') >= 0;
            chai.assert(revertFound, `Revert not found. ${error}`);

            messageMatch = error.message.search(pattern) >= 0;
            chai.assert(messageMatch,`Pattern not found in revert reason. Expected Pattern = ${pattern}; Reason Given = ${error.message}`);
        });
    }
}