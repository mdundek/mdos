const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors')

/**
 * SequelizeInit specific functions
 *
 * @class SequelizeInit
 */
class SequelizeInit {
    
    /**
     * Creates an instance of SequelizeInit.
     * @param {*} app
     * @memberof SequelizeInit
     */
    constructor(app) {
        this.app = app
        
    }

    /**
     * start
     */
    async start() {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    const allUsers = await this.app.service('users').find({
                        query: {
                            email: process.env.M2M_USER
                        }
                    })
                    if(allUsers.data.length == 0) {
                        await this.app.service('users').create({
                            email: process.env.M2M_USER,
                            password: process.env.M2M_PASSWORD
                        })
                    }
                    resolve()
                } catch (error) {
                    console.log(error);
                    reject()
                }
            }, 500)
        })
    }
}

module.exports = SequelizeInit
