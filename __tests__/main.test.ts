import { jest } from '@jest/globals'
import * as github from '@actions/github'

// Mock the ESM module
await jest.unstable_mockModule('@actions/core', () => ({
  getInput: jest.fn(),
  info: jest.fn(),
  setFailed: jest.fn()
}))

// Import BOTH the mocked module and the function
const core = await import('@actions/core')
const { run } = await import('../src/main')

interface TestGitHubPayload {
  action: string
  issue: { number: number }
}

describe('run()', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    const ctx = github.context as unknown as { payload: TestGitHubPayload }
    ctx.payload = {
      action: 'opened',
      issue: { number: 123 }
    }
  })

  it('logs the SSM path and event payload', async () => {
    core.getInput.mockReturnValue('/my/ssm/path')
    core.info.mockImplementation(() => {})

    await run()

    expect(core.getInput).toHaveBeenCalledWith('ssm-path')
    expect(core.info).toHaveBeenCalledWith('SSM Path: /my/ssm/path')
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('The event payload:')
    )
  })

  it('calls setFailed when an error occurs', async () => {
    core.getInput.mockImplementation(() => {
      throw new Error('Boom')
    })
    core.setFailed.mockImplementation(() => {})

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Boom')
  })
})
