// ***************************************************************************
// The main file of our test app.

// Import some types from our sibling files.
import Waiter, {RejectFunc, ResolveFunc} from './Waiter';

// Create a Jasmine test suite.  This tests that the @types/jasmine
// declarations cna be found and loaded by the TypeScript compiler when run
// via typescript-brunch.
describe('test', () =>
{
  it('wait', async () =>
  {
    const waiter = new Waiter();
    const wait = waiter.wait();
    setTimeout(() => { waiter.done('Yaay!'); }, 2000);
    const result = await wait;
    expect(result).toEqual('Yaay!');
    return Promise.resolve();
  });
});

// ***************************************************************************
