const { NotFound, Conflict, Unavailable, Forbidden } = require('@feathersjs/errors')
const jwt_decode = require('jwt-decode')
const axios = require('axios')

class CommonCore {

    /**
     * constructor
     * @param {*} app
     */
     constructor(app) {
        this.app = app
    }

    /**
     * keycloakInstallCheck
     */
     async keycloakInstallCheck() {
        const keycloakAvailable = await this.app.get("keycloak").isKeycloakDeployed();
        if (!keycloakAvailable) {
            throw new Error("Keycloak is not installed");
        }
    }

   /**
    * realmCheck
    * @param {*} realm 
    */
    async realmCheck(realm) {
        // Make sure realm exists
        const response = await this.app.get("keycloak").getRealms();
        if(!response.find(o => o.realm.toLowerCase() == realm.toLowerCase())) {
            throw new Unavailable("Keycloak realm does not exists");
        }
    }

    /**
    * clientIdCheck
    * @param {*} realm 
    */
     async clientIdCheck(realm, clientId) {
        // Make sure client ID exists
        const response = await this.app.get("keycloak").getClients(realm);
        if(!response.find(o => o.clientId.toLowerCase() == clientId.toLowerCase())) {
            throw new Unavailable("Keycloak client does not exists");
        }
    }

    /**
    * clientUuidCheck
    * @param {*} realm 
    */
     async clientUuidCheck(realm, clientUuid) {
        // Make sure client ID exists
        const response = await this.app.get("keycloak").getClients(realm);
        if(!response.find(o => o.id == clientUuid)) {
            throw new Unavailable("Keycloak client does not exists");
        }
    }
}

module.exports = CommonCore