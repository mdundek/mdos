import {expect, test} from '@oclif/test'

describe('use-secret', () => {
  test
  .stdout()
  .command(['use-secret'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['use-secret', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
