const axios = require('axios')
const https = require('https')
const YAML = require('yaml')
const fs = require('fs')
const jwt_decode = require('jwt-decode')
var jwt = require('jwt-simple')
const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors')
const { terminalCommand } = require('../libs/terminal')

axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false,
})

/**
 * Gateways specific functions
 *
 * @class Gateways
 */
class Gateways {
    
    /**
     * Creates an instance of Gateways.
     * 
     * @param {*} app
     * @memberof Gateways
     */
    constructor(app) {
        this.app = app
    }

    /**
     * findMatchingGateway
     * 
     * @param {*} gateways 
     * @param {*} domain 
     */
    findMatchingGateway(gateways, domain) {
        const domainIsWildcard = domain.startsWith("*.") || domain.startsWith(".")
        let rootDomain = null

        // *.domain.com
        if(domainIsWildcard) {
            rootDomain = domain.substring(domain.indexOf(".") + 1)
        } 

        for(const gtw of gateways) {
            for(let gwHost of gtw.spec.servers.hosts) {
                gwHost = gwHost.toLowerCase()
                // Domain is wildcard
                if(domainIsWildcard) {
                    // *.domain.com, foo.domain.com, foo.bar.mydomain.com
                    if(gwHost.endsWith(`.${rootDomain.toLowerCase()}`)) {
                        return gtw
                    }
                }
                // Domain is not a wildcard
                else {
                    const gwDomainIsWildcard = gwHost.startsWith("*.") || gwHost.startsWith(".")
                    if(gwDomainIsWildcard) {
                        if(gwHost.endsWith(domain.toLowerCase())) {
                            return gtw
                        }
                    } else {
                        if(gwHost == domain.toLowerCase()) {
                            return gtw
                        }
                    }
                }
            }
        }
        return null
    }
}

module.exports = Gateways
