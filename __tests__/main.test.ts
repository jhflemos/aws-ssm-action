import { jest } from '@jest/globals'

let core: typeof import('@actions/core')
let github: typeof import('@actions/github')
let fs: typeof import('fs')
let run: () => Promise<void>

beforeAll(async () => {
  // ---- @actions/core ----
  await jest.unstable_mockModule('@actions/core', () => ({
    getInput: jest.fn(),
    info: jest.fn(),
    setFailed: jest.fn(),
    exportVariable: jest.fn(),
    setSecret: jest.fn()
  }))

  // ---- @actions/github ----
  await jest.unstable_mockModule('@actions/github', () => ({
    context: {
      payload: {}
    }
  }))

  // ---- fs (ESM-safe mock) ----
  await jest.unstable_mockModule('fs', () => ({
    writeFileSync: jest.fn()
  }))

  // ---- AWS SDK ----
  await jest.unstable_mockModule('@aws-sdk/client-ssm', () => {
    const sendMock = jest.fn()

    const MockSSMClient = jest.fn().mockImplementation(() => ({
      send: sendMock
    }))

    return {
      SSMClient: MockSSMClient,
      GetParametersByPathCommand: jest.fn(),
      __sendMock: sendMock
    }
  })

  core = await import('@actions/core')
  github = await import('@actions/github')
  fs = await import('fs')

  const mod = await import('../src/main')
  run = mod.run
})

beforeEach(() => {
  jest.clearAllMocks()
  github.context.payload = { event: 'test' }
})

function mockInputs(values: Record<string, string>) {
  core.getInput.mockImplementation((name: string) => values[name] ?? '')
}

describe('run()', () => {
  it('exports env vars and masks SecureString values', async () => {
    const { __sendMock } = await import('@aws-sdk/client-ssm')

    __sendMock.mockResolvedValueOnce({
      Parameters: [
        { Name: '/app/FOO', Value: 'bar', Type: 'String' },
        { Name: '/app/SECRET', Value: 'shh', Type: 'SecureString' }
      ]
    })

    mockInputs({
      region: 'us-east-1',
      'ssm-path': '/app',
      exportToEnv: 'true'
    })

    await run()

    expect(core.exportVariable).toHaveBeenCalledWith('FOO', 'bar')
    expect(core.setSecret).toHaveBeenCalledWith('shh')
    expect(core.exportVariable).toHaveBeenCalledWith('SECRET', 'shh')
  })

  it('logs GitHub payload when debug=true', async () => {
    const { __sendMock } = await import('@aws-sdk/client-ssm')
    __sendMock.mockResolvedValueOnce({ Parameters: [] })

    mockInputs({
      region: 'us-east-1',
      'ssm-path': '/app',
      debug: 'true'
    })

    await run()

    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('The event payload')
    )
  })

  it('handles paginated SSM results', async () => {
    const { __sendMock } = await import('@aws-sdk/client-ssm')

    __sendMock
      .mockResolvedValueOnce({
        Parameters: [{ Name: '/p/A', Value: '1', Type: 'String' }],
        NextToken: 'token'
      })
      .mockResolvedValueOnce({
        Parameters: [{ Name: '/p/B', Value: '2', Type: 'String' }],
        NextToken: undefined
      })

    mockInputs({
      region: 'us-east-1',
      'ssm-path': '/p'
    })

    await run()

    expect(__sendMock).toHaveBeenCalledTimes(2)
  })

  it('writes JSON output file', async () => {
    const { __sendMock } = await import('@aws-sdk/client-ssm')
    __sendMock.mockResolvedValueOnce({
      Parameters: [{ Name: '/p/X', Value: 'y', Type: 'String' }]
    })

    mockInputs({
      region: 'us-east-1',
      'ssm-path': '/p',
      output: 'json',
      fileName: 'params'
    })

    await run()

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('params.json'),
      expect.any(String),
      { encoding: 'utf-8' }
    )
  })

  it('writes YAML output file', async () => {
    const { __sendMock } = await import('@aws-sdk/client-ssm')
    __sendMock.mockResolvedValueOnce({
      Parameters: [{ Name: '/p/X', Value: 'y', Type: 'String' }]
    })

    mockInputs({
      region: 'us-east-1',
      'ssm-path': '/p',
      output: 'yaml',
      fileName: 'params'
    })

    await run()

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('params.yaml'),
      expect.any(String),
      { encoding: 'utf-8' }
    )
  })

  it('logs message for unknown output type', async () => {
    const { __sendMock } = await import('@aws-sdk/client-ssm')
    __sendMock.mockResolvedValueOnce({ Parameters: [] })

    mockInputs({
      region: 'us-east-1',
      'ssm-path': '/p',
      output: 'xml'
    })

    await run()

    expect(core.info).toHaveBeenCalledWith('No output file was generated!')
  })

  it('fails when parameterFilters is invalid JSON', async () => {
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as never)

    mockInputs({
      region: 'us-east-1',
      'ssm-path': '/p',
      parameterFilters: '{ bad json'
    })

    await run()

    expect(core.setFailed).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalledWith(1)

    exitSpy.mockRestore()
  })

  it('fails when parameterFilters is valid JSON but not an array (covers lines 87–91)', async () => {
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as never)

    mockInputs({
      region: 'us-east-1',
      'ssm-path': '/p',
      parameterFilters: '{}'
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('parameterFilters must be a JSON array')
    )
    expect(exitSpy).toHaveBeenCalledWith(1)

    exitSpy.mockRestore()
  })

  it('calls setFailed when an unexpected error is thrown', async () => {
    core.getInput.mockImplementation(() => {
      throw new Error('Boom')
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Boom')
  })
})
