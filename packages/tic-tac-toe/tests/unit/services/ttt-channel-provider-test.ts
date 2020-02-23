import {module, test} from 'qunit';
import {setupTest} from 'ember-qunit';

module('Unit | Service | ttt-channel-provider', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    const service = this.owner.lookup('service:ttt-channel-provider');
    assert.ok(service);
  });
});
