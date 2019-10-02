export async function expectRevert(fn, pattern?: string | RegExp) {
  await expect(fn()).rejects.toThrowError(pattern);
}
