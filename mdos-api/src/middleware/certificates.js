const axios = require('axios')
const https = require('https')
const YAML = require('yaml')
const fs = require('fs')
const jwt_decode = require('jwt-decode')
var jwt = require('jwt-simple')
const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors')
const { terminalCommand } = require('../libs/terminal')
const { setFlagsFromString } = require('v8')

axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false,
})

/**
 * Certificates specific functions
 *
 * @class Certificates
 */
class Certificates {
    
    /**
     * Creates an instance of Certificates.
     * 
     * @param {*} app
     * @memberof Certificates
     */
    constructor(app) {
        this.app = app
    }

    /**
     * findMatchingCertificates
     * 
     * @param {*} certificates 
     * @param {*} domain 
     */
    findMatchingCertificates(certificates, domains) {
        const certResults = {}
        for(const domain of domains) {
            const domainIsWildcard = domain.startsWith("*.") || domain.startsWith(".")
            let rootDomain = null

            // *.domain.com
            if(domainIsWildcard) {
                rootDomain = domain.substring(domain.indexOf(".") + 1)
            } 

            certResults[domain] = certificates.filter(certObj => {
                for(let certHost of certObj.spec.dnsNames) {
                    certHost = certHost.toLowerCase()
                    // Domain is wildcard
                    if(domainIsWildcard) {
                        // *.domain.com, foo.domain.com, foo.bar.mydomain.com
                        if(certHost.endsWith(`.${rootDomain.toLowerCase()}`)) {
                            return true
                        }
                    }
                    // Domain is not a wildcard
                    else {
                        const gwDomainIsWildcard = certHost.startsWith("*.") || certHost.startsWith(".")
                        if(gwDomainIsWildcard) {
                            const gwHostRootDomain = domain.substring(domain.indexOf(".") + 1)
                            if(certHost.endsWith(`.${gwHostRootDomain.toLowerCase()}`)) {
                                return true
                            }
                        } else {
                            if(certHost == domain.toLowerCase()) {
                                return true
                            }
                        }
                    }
                }
                return false
            })
        }
        console.log("-----")
        console.log(certResults)
        return certResults
    }
}

module.exports = Certificates
