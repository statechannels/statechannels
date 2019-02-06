module.exports = {
    expectRevert: async (fn, pattern) => {
        await expect(fn()).rejects.toThrowError(pattern);
    }
}