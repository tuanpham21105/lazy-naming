import * as assert from 'node:assert';

suite('Integration harness', () => {
  test('runs inside a VSCode test host', () => {
    assert.strictEqual(1 + 1, 2);
  });
});