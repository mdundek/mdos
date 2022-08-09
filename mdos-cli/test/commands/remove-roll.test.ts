import {expect, test} from '@oclif/test'

describe('remove-roll', () => {
  test
  .stdout()
  .command(['remove-roll'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['remove-roll', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
