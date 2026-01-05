import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  SSMClient,
  GetParametersByPathCommand,
  ParameterStringFilter
} from '@aws-sdk/client-ssm'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Imputs from action's call
    const awsRegion = core.getInput('region')
    const ssmPath = core.getInput('ssm-path')
    const withDecryption = core.getInput('withDecryption') === 'true'
    const rawParameterFilters = core.getInput('parameterFilters')
    const debug = core.getInput('debug') === 'true'

    let parameterFilters: ParameterStringFilter[] | undefined

    if (rawParameterFilters) {
      try {
        const parsed = JSON.parse(rawParameterFilters)

        if (!Array.isArray(parsed)) {
          throw new Error('parameterFilters must be a JSON array')
        }

        parameterFilters = parsed as ParameterStringFilter[]
      } catch (err) {
        core.setFailed(
          `Invalid parameteFilters JSON: ${(err as Error).message}`
        )
        process.exit(1)
      }
    }

    const input = {
      Path: ssmPath,
      WithDecryption: withDecryption,
      Recursive: true,
      ...(parameterFilters && { ParameterFilters: parameterFilters })
    }

    const client = new SSMClient({ region: awsRegion })

    let nextToken: string | undefined
    const allParameters = []

    do {
      const commandInput = {
        ...input,
        NextToken: nextToken
      }

      const command = new GetParametersByPathCommand(commandInput)
      const result = await client.send(command)

      if (result.Parameters) {
        allParameters.push(...result.Parameters)
      }

      nextToken = result.NextToken
    } while (nextToken)

    core.info(`Fetched ${allParameters.length} parameters`)

    core.info(`Values: ${allParameters}`)

    // Example: output all values as JSON
    core.setOutput('values', JSON.stringify(allParameters))

    if (debug) {
      // Get the JSON webhook payload for the event that triggered the workflow
      const payload = JSON.stringify(github.context.payload, undefined, 2)
      core.info(`The event payload: ${payload}`)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
