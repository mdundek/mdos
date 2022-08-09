import {expect, test} from '@oclif/test'

describe('protect-app', () => {
  test
  .stdout()
  .command(['protect-app'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['protect-app', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
