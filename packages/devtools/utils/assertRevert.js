const chai = require('chai');
module.exports = {
    assertRevert: async (promise, pattern) => {
        let revertFound, messageMatch;
        promise.then((val) => {
            chai.assert.fail('Expected revert not received');
        }).catch((error) => {
            revertFound = error.message.search('revert') >= 0;
            chai.assert(revertFound, `Revert not found. ${error}`);

            if (typeof pattern === "string") {
                messageMatch = error.message.indexOf(pattern) >= 0;
            } else {
                messageMatch = error.message.search(pattern) >= 0;
            }
            chai.assert(messageMatch,`Pattern not found in revert reason. Expected Pattern = ${pattern}; Reason Given = ${error.message}`);
        })
    }
}