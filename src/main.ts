import * as core from '@actions/core'
import * as github from '@actions/github'
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const ssmPath = core.getInput('ssm-path')
    const awsRegion = core.getInput('region')
    core.warning(`SSM Path: ${ssmPath}`)

    const client = new SSMClient({ region: `${awsRegion}` })

    const command = new GetParameterCommand({
      Name: ssmPath,
      WithDecryption: true
    })

    const result = await client.send(command)
    core.warning(`SSM Parameter Value: ${result.Parameter?.Value}`)

    core.setOutput('value', `${result.Parameter?.Value}`)

    // Get the current time and set it as an output variable
    //const time = new Date().toTimeString();
    //core.setOutput("time", time);

    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    core.warning(`The event payload: ${payload}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
