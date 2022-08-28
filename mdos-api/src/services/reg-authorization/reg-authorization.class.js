const { Forbidden } = require('@feathersjs/errors')

const userRoleStore = {}

/* eslint-disable no-unused-vars */
exports.RegAuthorization = class RegAuthorization {
    constructor(options, app) {
        this.options = options || {}
		this.app = app;
    }

	/**
	 * find
	 * @param {*} params 
	 * @returns 
	 */
    async find(params) {
		const credsData = Buffer.from(params.query.data, 'base64').toString('utf8')
		const credDataJson = JSON.parse(credsData);
		let userRoles;

		// Get user role mappings
		if (userRoleStore[credDataJson.Account]) {
			// User role is buffered
			userRoles = userRoleStore[credDataJson.Account].roles;
		} else {
			// No user role buffer found, getting it now
			userRoles = await this.app.get('keycloak').getUserRoles('mdos', credDataJson.Account)
			userRoleStore[credDataJson.Account] = {
				roles: userRoles,
				sessionTimeout: setTimeout(function(account) {
					delete userRoleStore[account];
				}.bind(this, credDataJson.Account), 60 * 1000)
			}
		}

		// If request is registry request
		if(credDataJson.Type == "repository") {
			// System admins can do everything
			if(userRoles.clientMappings && userRoles.clientMappings.mdos && userRoles.clientMappings.mdos.mappings.find(role => role.name == "admin")) {
				return "ok";
			}

			const imgPathArray = credDataJson.Name.split("/");
			// if image is a system image (root level image)
			if(imgPathArray.length == 1) {
				// If user is trying to push an update, reject
				if(credDataJson.Actions.includes("push")) {
					throw new Forbidden("Unauthorized");
				}
				// Pulling is ok for root level images
				else {
					return "ok";
				}
			} else {
				// User is part of private image tenant name & no push request
				if(userRoles.clientMappings && userRoles.clientMappings[imgPathArray[0]] && !credDataJson.Actions.includes("push")) {
					return "ok";
				}
				// User is part of private image tenant name & push is request
				else if(userRoles.clientMappings && userRoles.clientMappings[imgPathArray[0]] && userRoles.clientMappings[imgPathArray[0]].mappings.find(role => role.name == "global-registry")) {
					return "ok";
				}
				// User does not belong to this tenant name
				else {
					throw new Forbidden("Unauthorized");
				}
			}
		} else {
			throw new Forbidden("Unauthorized");
		}
    }

    async get(id, params) {
        return {
            id,
            text: `A new message with ID: ${id}!`,
        }
    }

    async create(data, params) {
        console.log(data)
        console.log(params)

        return 'ok'
    }

    async update(id, data, params) {
        return data
    }

    async patch(id, data, params) {
        return data
    }

    async remove(id, params) {
        return { id }
    }
}
