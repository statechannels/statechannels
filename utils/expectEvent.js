const defaultMatcher = function (event) { return true };
module.exports = {
    expectEvent: function (contract, filter) {
        const emitterWitness = jest.fn();
        const eventPromise = new Promise((resolve, reject) => {
            contract.on(filter, function () {
                const event = arguments[arguments.length - 1];
                emitterWitness();
                resolve(event);
            });
    
            // After 10s, we throw a timeout error
            setTimeout(() => {
                reject(new Error('timeout while waiting for event'));
            }, 10000);
        });
    
        return { emitterWitness, eventPromise };
      }
}