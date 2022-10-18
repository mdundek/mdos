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
     * findMatchingCertificateSecretName
     * 
     * @param {*} certificates 
     * @param {*} domain 
     */
    findMatchingCertificateSecretName(certificates, domain) {
        const domainIsWildcard = domain.startsWith("*.") || domain.startsWith(".")
        let rootDomain = null

        // *.domain.com
        if(domainIsWildcard) {
            rootDomain = domain.substring(domain.indexOf(".") + 1)
        } 

        for(const certObj of certificates) {
            for(let certHost of certObj.spec.dnsNames) {
                certHost = certHost.toLowerCase()
                // Domain is wildcard
                if(domainIsWildcard) {
                    // *.domain.com, foo.domain.com, foo.bar.mydomain.com
                    if(certHost.endsWith(`.${rootDomain.toLowerCase()}`)) {
                        return certObj
                    }
                }
                // Domain is not a wildcard
                else {
                    const gwDomainIsWildcard = certHost.startsWith("*.") || certHost.startsWith(".")
                    if(gwDomainIsWildcard) {
                        if(certHost.endsWith(domain.toLowerCase())) {
                            return certObj
                        }
                    } else {
                        if(certHost == domain.toLowerCase()) {
                            return certObj
                        }
                    }
                }
            }
        }
        return null
    }
}

module.exports = Certificates
