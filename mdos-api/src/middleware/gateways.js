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
            let wildcardMatch = false
            let wildcardMatchWasCrossed = false
            
            gtw.spec.serverMatch = gtw.spec.servers.find(server => {
                for(let gwHost of server.hosts) {
                    gwHost = gwHost.toLowerCase()
                    // Domain is wildcard
                    if(domainIsWildcard) {
                        // *.domain.com, foo.domain.com, foo.bar.mydomain.com
                        if(gwHost.endsWith(`.${rootDomain.toLowerCase()}`)) {
                            const gwDomainIsWildcard = gwHost.startsWith("*.") || gwHost.startsWith(".")

                            let crossWildcardmatch = false

                            if(!gwDomainIsWildcard) {
                                // Lets make sure there are no gateways that directly configured this wildcard domain as well
                                
                                for(let gtwWildcardCross of gateways) {
                                    gtwWildcardCross.spec.servers.forEach(crossServer => {
                                        for(let crossGwHost of crossServer.hosts) {
                                            const crossGwDomainIsWildcard = crossGwHost.startsWith("*.") || crossGwHost.startsWith(".")
                                            if(crossGwDomainIsWildcard) {
                                                const crossGwHostRootDomain = crossGwHost.substring(crossGwHost.indexOf(".") + 1)
                                                if(crossGwHostRootDomain.toLowerCase() == rootDomain.toLowerCase()) {
                                                    crossWildcardmatch = true
                                                    wildcardMatchWasCrossed = true
                                                }
                                            }

                                        }
                                    })
                                }
                            }
                            if(!crossWildcardmatch)
                                return true
                        }
                    }
                    // Domain is not a wildcard
                    else {
                        const gwDomainIsWildcard = gwHost.startsWith("*.") || gwHost.startsWith(".")
                        if(gwDomainIsWildcard) {
                            const gwHostRootDomain = gwHost.substring(gwHost.indexOf(".") + 1)
                            if(domain.toLowerCase().endsWith(`.${gwHostRootDomain.toLowerCase()}`)) {
                                wildcardMatch = true
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
                gtw.spec.wildcardMatch = wildcardMatch ? true : wildcardMatchWasCrossed
                gtwMatches.push(gtw)
            }
        }
        return gtwMatches
    }
}

module.exports = Gateways
