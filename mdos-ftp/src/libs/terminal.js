var shell = require('shelljs')

/**
 * terminalCommand
 * @param {*} command
 * @returns
 */
const terminalCommand = async (command, jsonResponse) => {
    return new Promise((resolve, reject) => {
        try {
            shell.exec(command, { silent: true }, function (code, stdout, stderr) {
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

/**
 * terminalCommandAsync
 * @param {*} command
 * @param {*} onMessage
 * @param {*} onError
 * @param {*} done
 * @returns
 */
const terminalCommandAsync = (command, onMessage, onError, done) => {
    const child = shell.exec(command, { silent: true, async: true })

    child.on('close', () => {
        done()
    })

    child.stdout.on('data', function (data) {
        onMessage(data)
    })
    child.stderr.on('data', function (data) {
        onError(data)
    })

    return child
}

module.exports = {
    terminalCommand,
    terminalCommandAsync,
}
