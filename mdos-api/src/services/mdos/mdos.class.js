const YAML = require('yaml')
const { NotFound, GeneralError, BadRequest, Conflict, Unavailable, Forbidden } = require('@feathersjs/errors')
const jwt_decode = require('jwt-decode')

/* eslint-disable no-unused-vars */
exports.Mdos = class Mdos {
    constructor(options, app) {
        this.options = options || {}
        this.app = app
    }

    async find(params) {
        return []
    }

    async get(id, params) {
        if(id == "user-info") {
            if(process.env.NO_ADMIN_AUTH == "true") {
                return {
                    accessKey: process.env.MINIO_ACCESS_KEY,
                    secretKey: process.env.MINIO_SECRET_KEY,
                    minioUri: process.env.MINIO_HOST,
                    registry: `registry.${process.env.ROOT_DOMAIN}`,
                    registryUser: process.env.REG_USER,
                    registryPassword: process.env.REG_PASS,
                    roles: [`mdostnt-name-${params.query.tenantName}`, 'mdostnt-volume-sync']
                }
            } else {
                if (!params.headers['x-auth-request-access-token']) {
                    throw new Forbidden('You are not authenticated');
                }
                let jwtToken = jwt_decode(params.headers['x-auth-request-access-token'])
                if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles) {
                    return {
                        accessKey: process.env.MINIO_ACCESS_KEY,
                        secretKey: process.env.MINIO_SECRET_KEY,
                        minioUri: process.env.MINIO_HOST,
                        registry: `registry.${process.env.ROOT_DOMAIN}`,
                        registryUser: process.env.REG_USER,
                        registryPassword: process.env.REG_PASS,
                        roles: jwtToken.resource_access.mdos.roles
                    }
                } else {
                    throw new Forbidden('You are not authorized to access this resource');
                }    
            }
        }
        else {
            throw new NotFound("Param not found");
        }
    }

    async create(data, params) {
        if (data.type == 'deploy') {
            const valuesYaml = YAML.parse(Buffer.from(data.values, 'base64').toString('ascii'));

            // Create namespace if not exist
            const nsFound = await this.app.get('kube').hasNamespace(valuesYaml.tenantName);
            if (!nsFound) {
                await this.app.get('kube').createNamespace({ name: valuesYaml.tenantName })
            }
            // If namespace exist, make sure it has the required mdos secrets
            else {
                // If at least one component does not have an imagePullSecret, we need our private reg pull secret in this namespace
                if(valuesYaml.components.find(component => !component.imagePullSecrets && !component.registry)) {
                    const regCredsFound = await this.app.get('kube').hasSecret(valuesYaml.tenantName, "regcred-local");
                    if (!regCredsFound) {
                        throw new Conflict("The target namespace seems to be missing the secret named 'regcred-local'");
                    }
                }

                // If sync volues , make sure we have a minio secret
                if(valuesYaml.components.find(component => component.volumes.find(v => v.syncVolume))) {
                    const minioCredsFound = await this.app.get('kube').hasSecret(valuesYaml.tenantName, "mdos-minio-creds")
                    if (!minioCredsFound) {
                        throw new Conflict("The target namespace seems to be missing the secret named 'mdos-minio-creds'");
                    }
                }
            }

            // Make sure all components have an image pull secret
            valuesYaml.registry = `registry.${process.env.ROOT_DOMAIN}`;
            valuesYaml.components = valuesYaml.components.map(component => {
                if(!component.imagePullSecrets && !component.registry) { // Skip images from public registries or with specific secrets
                    component.imagePullSecrets = [{
                        name: "regcred-local"
                    }]
                }
                return component;
            });

            await this.app.get('kube').mdosGenericHelmInstall(valuesYaml.tenantName, valuesYaml)
        }
        return data
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
