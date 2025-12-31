import { jest } from '@jest/globals'
import * as github from '@actions/github'

// Mock ESM modules
await jest.unstable_mockModule('@actions/core', () => ({
  getInput: jest.fn(),
  info: jest.fn(),
  setFailed: jest.fn()
}))

await jest.unstable_mockModule('@aws-sdk/client-ssm', () => {
  const sendMock = jest
    .fn()
    .mockResolvedValue({ Parameter: { Value: 'mock-value' } })

  const MockSSMClient = jest.fn().mockImplementation(() => ({
    send: sendMock
  }))

  return { SSMClient: MockSSMClient, GetParameterCommand: jest.fn() }
})

// Import mocked modules and the function
const core = await import('@actions/core')
const { run } = await import('../src/main')

interface TestGitHubPayload {
  action: string
  issue: { number: number }
}

describe('run() with ssm-path and region inputs', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock GitHub context payload
    const ctx = github.context as unknown as { payload: TestGitHubPayload }
    ctx.payload = {
      action: 'opened',
      issue: { number: 123 }
    }
  })

  it('fetches SSM parameter and logs all info', async () => {
    // Mock core inputs
    core.getInput.mockImplementation((name: string) => {
      if (name === 'ssm-path') return '/my/ssm/path'
      if (name === 'region') return 'us-east-1'
      return ''
    })

    core.info.mockImplementation(() => {})

    await run()

    // Verify core inputs called
    expect(core.getInput).toHaveBeenCalledWith('ssm-path')
    expect(core.getInput).toHaveBeenCalledWith('region')
  })

  it('calls setFailed when getInput throws', async () => {
    core.getInput.mockImplementation(() => {
      throw new Error('Boom')
    })
    core.setFailed.mockImplementation(() => {})

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Boom')
  })
})
