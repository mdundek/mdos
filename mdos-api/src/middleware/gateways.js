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
     * findMatchingGateways
     * 
     * @param {*} gateways 
     * @param {*} domain 
     */
    findMatchingGateways(gateways, domain) {
        const domainIsWildcard = domain.startsWith("*.") || domain.startsWith(".")
        let rootDomain = null

        // *.domain.com
        if(domainIsWildcard) {
            rootDomain = domain.substring(domain.indexOf(".") + 1)
        } 

        const gtwMatches = []
        for(let gtw of gateways) {
            gtw.spec.serverMatch = gtw.spec.servers.find(server => {
                for(let gwHost of server.hosts) {
                    gwHost = gwHost.toLowerCase()
                    // Domain is wildcard
                    if(domainIsWildcard) {
                        // *.domain.com, foo.domain.com, foo.bar.mydomain.com
                        if(gwHost.endsWith(`.${rootDomain.toLowerCase()}`)) {
                            return true
                        }
                    }
                    // Domain is not a wildcard
                    else {
                        const gwDomainIsWildcard = gwHost.startsWith("*.") || gwHost.startsWith(".")
                        if(gwDomainIsWildcard) {
                            if(gwHost.endsWith(domain.toLowerCase())) {
                                return true
                            }
                        } else {
                            if(gwHost == domain.toLowerCase()) {
                                return true
                            }
                        }
                    }
                }
                return false
            })
            if(gtw.spec.serverMatch) {
                gtwMatches.push(gtw)
            }
        }
        return gtwMatches
    }
}

module.exports = Gateways
