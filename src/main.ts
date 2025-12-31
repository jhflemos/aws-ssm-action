import * as core from "@actions/core";
import * as github from "@actions/github";

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const ssmPath = core.getInput("ssm-path");
    core.info(`SSM Path: ${ssmPath}`);

    // Get the current time and set it as an output variable
    //const time = new Date().toTimeString();
    //core.setOutput("time", time);

    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2);
    core.info(`The event payload: ${payload}`);
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}