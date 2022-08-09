import {expect, test} from '@oclif/test'

describe('list-roles', () => {
  test
  .stdout()
  .command(['list-roles'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['list-roles', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
