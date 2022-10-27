const YAML = require('yaml')
const { BadRequest, GeneralError } = require('@feathersjs/errors')
const MdosCore = require('./mdos.class.core')

/* eslint-disable no-unused-vars */
exports.Mdos = class Mdos extends MdosCore {
    /**
     * Creates an instance of Mdos.
     * @param {*} options
     * @param {*} app
     */
    constructor(options, app) {
        super(app)
        this.options = options || {}
        this.app = app
    }

    /**
     * Get
     *
     * @param {*} id
     * @param {*} params
     * @return {*}
     */
    async get(id, params) {
        if (id == 'user-info') {
            return await this.computeUserInfo(params.headers, params.query)
        } else {
            throw new BadRequest('ERROR: Malformed API request')
        }
    }

    /**
     * Create
     *
     * @param {*} data
     * @param {*} params
     * @return {*}
     */
    async create(data, params) {
        if (data.type == 'deploy') {
            // Parse values file
            let valuesYaml = YAML.parse(Buffer.from(data.values, 'base64').toString('ascii'))

            // Ensure namespace is ready
            await this.validateNamespaceForDeployment(valuesYaml)

            // Make sure we have at least one component
            if (!valuesYaml.components || valuesYaml.components.length == 0) {
                throw new BadRequest('ERROR: Application has no components')
            }

            // Validate app schema
            if (!valuesYaml.schemaVersion || typeof valuesYaml.schemaVersion != 'string') {
                throw new BadRequest('ERROR: Missing schema version in your manifest (expected property: schemaVersion)')
            }
            const validationErrors = this.app.get('schemaValidator')[valuesYaml.schemaVersion].instance.validate(valuesYaml)
            if (validationErrors.length > 0) {
                throw new BadRequest(validationErrors.map((e) => e.stack).join('\n'))
            }
console.log("HERE 9")
            // Enrich values data
            valuesYaml = await this.enrichValuesForDeployment(valuesYaml)

            // If we need to make sure that the pod gets restarted if already deployed because of a volume sync change
            if (data.restart) {
                valuesYaml.forceUpdate = true
            }

            // Deploy
            try {
                await this.app.get('kube').mdosGenericHelmInstall(valuesYaml.tenantName, valuesYaml, data.processId)
            } catch (helmError) {
                if (Array.isArray(helmError)) throw new GeneralError('ERROR: ' + helmError.join('\n'))
                else throw helmError
            }
        } else {
            throw new BadRequest('ERROR: Malformed API request')
        }
        return data
    }
}
