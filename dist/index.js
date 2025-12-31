'use strict';

var core = require('@actions/core');
var github = require('@actions/github');
var clientSsm = require('@aws-sdk/client-ssm');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var core__namespace = /*#__PURE__*/_interopNamespaceDefault(core);
var github__namespace = /*#__PURE__*/_interopNamespaceDefault(github);

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
async function run() {
    try {
        const ssmPath = core__namespace.getInput('ssm-path');
        const awsRegion = core__namespace.getInput('region');
        core__namespace.info(`SSM Path: ${ssmPath}`);
        const client = new clientSsm.SSMClient({ region: `${awsRegion}` });
        const command = new clientSsm.GetParameterCommand({
            Name: ssmPath,
            WithDecryption: true
        });
        const result = await client.send(command);
        core__namespace.info(`SSM Parameter Value: ${result.Parameter?.Value}`);
        // Get the current time and set it as an output variable
        //const time = new Date().toTimeString();
        //core.setOutput("time", time);
        // Get the JSON webhook payload for the event that triggered the workflow
        const payload = JSON.stringify(github__namespace.context.payload, undefined, 2);
        core__namespace.info(`The event payload: ${payload}`);
    }
    catch (error) {
        // Fail the workflow run if an error occurs
        if (error instanceof Error)
            core__namespace.setFailed(error.message);
    }
}

/**
 * The entrypoint for the action. This file simply imports and runs the action's
 * main logic.
 */
/* istanbul ignore next */
run();
//# sourceMappingURL=index.js.map
