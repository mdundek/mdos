var shell = require('shelljs');

/**
 * terminalCommand
 * @param {*} command 
 * @returns 
 */
const terminalCommand = async (command, jsonResponse) => {
    return new Promise((resolve, reject) => {
        try {
            shell.exec(command, { silent: true }, function(code, stdout, stderr) {
                if(code == 0){
                    if(jsonResponse) {
                        resolve(JSON.parse(stdout.split("\n").filter(o => o.length > 0)));
                    } else {
                        resolve(stdout.split("\n").filter(o => o.length > 0));
                    }
                } else {                       
                    reject(new Error(stderr && stderr.trim().length > 0 ? stderr : "An error occured"));
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    terminalCommand
}