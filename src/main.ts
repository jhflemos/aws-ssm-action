import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as path from 'path'
import { SimpleParameter } from './types'
import { GetParametersByPathInput } from './types'

import {
  SSMClient,
  GetParametersByPathCommand,
  ParameterStringFilter
} from '@aws-sdk/client-ssm'

let awsRegion = ''

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Imputs from action's call
    awsRegion = core.getInput('region')
    const ssmPath = core.getInput('ssm-path')
    const withDecryption = core.getInput('withDecryption') === 'true'
    const output = core.getInput('output')
    const fileName = core.getInput('fileName')
    const debug = core.getInput('debug') === 'true'

    const parameterFilters = parseParameterFilter(
      core.getInput('parameterFilters')
    )

    const input: GetParametersByPathInput = {
      Path: ssmPath,
      WithDecryption: withDecryption,
      Recursive: true,
      ...(parameterFilters && { ParameterFilters: parameterFilters })
    }

    const allParameters = await getAllParameters(input)

    // Write SSM parameter file
    if (output !== '') {
      generateSSMParamatersFile(output, fileName, allParameters)
    }

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

function parseParameterFilter(rawParameterFilters: string) {
  let parameterFilters: ParameterStringFilter[] | undefined

  if (rawParameterFilters) {
    try {
      const parsed = JSON.parse(rawParameterFilters)

      if (!Array.isArray(parsed)) {
        throw new Error('parameterFilters must be a JSON array')
      }

      parameterFilters = parsed as ParameterStringFilter[]
    } catch (err) {
      core.setFailed(`Invalid parameteFilters JSON: ${(err as Error).message}`)
      process.exit(1)
    }
  }

  return parameterFilters
}

async function getAllParameters(
  input: GetParametersByPathInput
): Promise<SimpleParameter[]> {
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

  const simpleParameters: SimpleParameter[] = allParameters.map((param) => ({
    Name: param.Name ?? '',
    Value: param.Value ?? ''
  }))

  return simpleParameters
}

function generateSSMParamatersFile(
  output: string,
  fileName: string,
  allParameters: SimpleParameter[]
) {
  switch (output) {
    case 'json': {
      const filePath = path.join(process.cwd(), `${fileName}.json`)
      fs.writeFileSync(filePath, JSON.stringify(allParameters, null, 2), {
        encoding: 'utf-8'
      })
      break
    }
    default: {
      core.info(`No output file was generated!`)
      break
    }
  }
}
