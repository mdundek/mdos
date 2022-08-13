import {expect, test} from '@oclif/test'

describe('declare-port', () => {
  test
  .stdout()
  .command(['declare-port'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['declare-port', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
