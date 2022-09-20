var shell = require('shelljs')

/**
 * Execute a shell command
 *
 * @param {*} command
 * @param {*} jsonResponse
 * @param {*} cwdPath
 * @return {*} 
 */
const terminalCommand = async (command, jsonResponse, cwdPath) => {
    return new Promise((resolve, reject) => {
        try {
            shell.exec(command, { silent: true, cwd: cwdPath ? cwdPath : process.cwd() }, function (code, stdout, stderr) {
                if (code == 0) {
                    if (jsonResponse) {
                        resolve(JSON.parse(stdout.split('\n').filter((o) => o.length > 0)))
                    } else {
                        resolve(stdout.split('\n').filter((o) => o.length > 0))
                    }
                } else {
                    reject(new Error(stderr && stderr.trim().length > 0 ? stderr : 'An error occured'))
                }
            })
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    terminalCommand
}
