import {expect, test} from '@oclif/test'

describe('add-ingress', () => {
  test
  .stdout()
  .command(['add-ingress'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['add-ingress', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
