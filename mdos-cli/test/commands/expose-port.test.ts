import {expect, test} from '@oclif/test'

describe('expose-port', () => {
  test
  .stdout()
  .command(['expose-port'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['expose-port', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
