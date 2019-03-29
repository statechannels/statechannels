const _ = require('lodash');

module.exports = {
    expectEvent: async function (txOrTxResult, expectedEventName, expectedEventArgs={}) {
        // Usage:
        // Pass a transaction result, in which case await is unnecessary
        // expectEvent(txResult, 'EventName', { argName: value })
        // OR
        // pass a transaction object
        // await expectEvent(await someContract.someFunction(), 'EventName', { argName: value })

        let txResult = txOrTxResult
        if (txOrTxResult.wait) {
            // in this case, we were passed the result of `await someContract.someFunction(args)`,
            // which is the transasction got sent off, but hasn't yet been confirmed.
            txResult = await txOrTxResult.wait();
        }
        const events = txResult.events;
        const matchingEvents = events.filter(event => {
            return event.event === expectedEventName &&  _.isMatch(event.args, expectedEventArgs)
        })
        expect(matchingEvents.length).toBeGreaterThan(0);
      }
}