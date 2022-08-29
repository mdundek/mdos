const YAML = require('yaml')
const { BadRequest } = require('@feathersjs/errors')
const MdosCore = require('./mdos.class.core')

/* eslint-disable no-unused-vars */
exports.Mdos = class Mdos extends MdosCore {
    constructor(options, app) {
        super(app);
        this.options = options || {}
        this.app = app
    }

    async find(params) {
        return []
    }

    /**
     * get
     * @param {*} id
     * @param {*} params
     * @returns
     */
    async get(id, params) {
        if (id == 'user-info') {
            return await this.computeUserInfo(params.headers, params.query);
        } else {
            throw new BadRequest("Malformed API request");
        }
    }

    /**
     * create
     * @param {*} data
     * @param {*} params
     * @returns
     */
    async create(data, params) {
        if (data.type == 'deploy') {
            // Parse values file
            let valuesYaml = YAML.parse(Buffer.from(data.values, 'base64').toString('ascii'))

            // Ensure namespace is ready
            await this.prepareNamespaceForDeployment(valuesYaml);

            // Make sure we have at least one component
            if(!valuesYaml.components || valuesYaml.components.length == 0) {
                throw new BadRequest("Application has no components");
            }

            // Enrich values data
            valuesYaml = await this.enrichValuesForDeployment(valuesYaml);

            // If we need to make sure that the pod gets restarted if already deployed because of a volume sync change
            if (data.restart) {
                valuesYaml.forceUpdate = true;
            }

            // Deploy
            await this.app.get('kube').mdosGenericHelmInstall(valuesYaml.tenantName, valuesYaml, data.processId);
        } else {
            throw new BadRequest("Malformed API request");
        }
        return data;
    }

    async update(id, data, params) {
        return data;
    }

    async patch(id, data, params) {
        return data
    }

    async remove(id, params) {
        return { id }
    }
}
