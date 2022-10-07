var Validator = require('jsonschema').Validator

/**
 * V1 schema validator
 *
 * @class SchemaV1
 */
class SchemaV1 {
    
    /**
     * Creates an instance of SchemaV1.
     * @memberof SchemaV1
     */
    constructor() {
        this.validator = new Validator()

        // Application schema
        this.applicationSchema = {
            id: '/MdosApplication',
            type: 'object',
            properties: {
                schemaVersion: { type: 'string', enum: ['v1'] },
                tenantName: {
                    type: 'string',
                    pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                },
                appName: {
                    type: 'string',
                    pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                },
                uuid: {
                    type: 'string',
                    pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                },
                components: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                            },
                            image: { type: 'string' },
                            tag: { type: 'string' },
                            uuid: {
                                type: 'string',
                                pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                            },
                            publicRegistry: { type: 'boolean' },
                            services: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                                        },
                                        ports: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    port: {
                                                        type: 'integer',
                                                        minimum: 80,
                                                        maximum: 35000,
                                                    },
                                                },
                                                required: ['port'],
                                                additionalProperties: false,
                                            },
                                        },
                                    },
                                    required: ['name', 'ports'],
                                    additionalProperties: false,
                                },
                            },
                            ingress: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                                        },
                                        matchHost: {
                                            type: 'string',
                                            format: 'host-name',
                                        },
                                        targetPort: { type: 'integer' },
                                        trafficType: { type: 'string', enum: ['http', 'https'] },
                                        subPath: { type: 'string' },
                                        tlsKeyPath: { type: 'string' },
                                        tlsCrtPath: { type: 'string' },
                                        tldMountPath: { type: 'string' },
                                    },
                                    required: ['name', 'matchHost', 'targetPort'],
                                    dependencies: {
                                        tlsKeyPath: ['tlsCrtPath', 'tldMountPath'],
                                        tlsCrtPath: ['tlsKeyPath', 'tldMountPath'],
                                        tldMountPath: ['tlsCrtPath', 'tlsKeyPath'],
                                    },
                                    additionalProperties: false,
                                },
                            },
                            volumes: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                                        },
                                        mountPath: { type: 'string' },
                                        hostPath: { type: 'string' },
                                        syncVolume: { type: 'boolean' },
                                        size: { type: 'string' }
                                    },
                                    required: ['name', 'mountPath'],
                                    additionalProperties: false,
                                },
                            },
                            oidc: {
                                type: 'object',
                                properties: {
                                    provider: {
                                        type: 'string',
                                        pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                                    },
                                    hosts: {
                                        type: 'array',
                                        items: {
                                            type: 'string',
                                        },
                                    },
                                    paths: {
                                        type: 'array',
                                        items: {
                                            type: 'string',
                                        },
                                    },
                                    excludePaths: {
                                        type: 'array',
                                        items: {
                                            type: 'string',
                                        },
                                    },
                                },
                                required: ['provider', 'hosts'],
                                additionalProperties: false,
                            },
                            networkPolicy: {
                                type: 'object',
                                properties: {
                                    scope: {
                                        type: 'string',
                                        enum: ['private', 'limited', 'open', 'custom']
                                    },
                                    allow: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                namespace: { type: 'string' },
                                                appUuid: { type: 'string' },
                                                compUuid: { type: 'string' },
                                            },
                                            required: ['namespace', 'appUuid', 'compUuid'],
                                            additionalProperties: false
                                        },
                                    }
                                },
                                required: ['scope'],
                                additionalProperties: false
                            },
                            preBuildCmd: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                            },
                            configs: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                                        },
                                        type: { type: 'string', enum: ['env', 'file', 'dir'] },
                                        mountPath: { type: 'string' },
                                        ref: { type: 'string' },
                                        defaultMode: { type: 'string' },
                                        entries: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: {
                                                        type: 'string',
                                                        pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                                                    },
                                                    filename: {
                                                        type: 'string',
                                                    },
                                                    key: {
                                                        type: 'string',
                                                    },
                                                    value: {
                                                        type: 'string',
                                                    },
                                                },
                                                required: ['value'],
                                                additionalProperties: false,
                                            },
                                        },
                                    },
                                    required: ['name', 'type'],
                                    additionalProperties: false,
                                },
                            },
                            secrets: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                                        },
                                        type: { type: 'string', enum: ['env', 'file', 'dir'] },
                                        mountPath: { type: 'string' },
                                        ref: { type: 'string' },
                                        defaultMode: { type: 'string' },
                                        entries: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: {
                                                        type: 'string',
                                                        pattern: /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/,
                                                    },
                                                    filename: {
                                                        type: 'string',
                                                    },
                                                    key: {
                                                        type: 'string',
                                                    },
                                                    value: {
                                                        type: 'string',
                                                    },
                                                },
                                                required: ['value'],
                                                additionalProperties: false,
                                            },
                                        },
                                    },
                                    required: ['name', 'type'],
                                    additionalProperties: false,
                                },
                            },
                        },
                        required: ['name', 'image', 'tag', 'uuid'],
                        additionalProperties: false,
                    },
                },
            },
            required: ['schemaVersion', 'tenantName', 'appName', 'uuid', 'components'],
            additionalProperties: false,
        }
    }

    /**
     * Validate schema
     *
     * @param {*} jsonData
     * @return {*} 
     * @memberof SchemaV1
     */
    validate(jsonData) {
        // Validate using schema validator
        const result = this.validator.validate(jsonData, this.applicationSchema)
        const errors = result.errors.map((error) => {
            return {
                message: error.message,
                instance: error.instance,
                stack: error.stack,
            }
        })
        if (errors.length == 0) {
            // Extra manual validation for config and secret types
            for (const component of jsonData.components) {
                if (component.configs) {
                    for (const config of component.configs) {
                        if(!config.ref) {
                            for (const entry of config.entries) {
                                if (config.type == 'file' && !entry.filename) {
                                    errors.push({
                                        message: "'filename' property is required",
                                        instance: entry,
                                        stack: "'filename' property is required",
                                    })
                                }

                                if (config.type == 'file' && entry.key) {
                                    errors.push({
                                        message: "'key' property is not compatible with 'file' type config",
                                        instance: entry,
                                        stack: "'key' property is not compatible with 'file' type config",
                                    })
                                }

                                if (config.type == 'env' && entry.filename) {
                                    errors.push({
                                        message: "'filename' property is not compatible with 'env' type config",
                                        instance: entry,
                                        stack: "'filename' property is not compatible with 'env' type config",
                                    })
                                }

                                if (config.type == 'env' && !entry.key) {
                                    errors.push({
                                        message: "'key' property is required with 'env' type config",
                                        instance: entry,
                                        stack: "'key' property is required with 'env' type config",
                                    })
                                }
                            }
                        }
                    }
                }
                if (component.secrets) {
                    for (const secret of component.secrets) {
                        if(!secret.ref) {
                            for (const entry of secret.entries) {
                                if (secret.type == 'file' && !entry.filename) {
                                    errors.push({
                                        message: "'filename' property is required",
                                        instance: entry,
                                        stack: "'filename' property is required",
                                    })
                                }

                                if (secret.type == 'file' && entry.key) {
                                    errors.push({
                                        message: "'key' property is not compatible with 'file' type secret",
                                        instance: entry,
                                        stack: "'key' property is not compatible with 'file' type secret",
                                    })
                                }

                                if (secret.type == 'env' && entry.filename) {
                                    errors.push({
                                        message: "'filename' property is not compatible with 'env' type secret",
                                        instance: entry,
                                        stack: "'filename' property is not compatible with 'env' type secret",
                                    })
                                }

                                if (secret.type == 'env' && !entry.key) {
                                    errors.push({
                                        message: "'key' property is required with 'env' type secret",
                                        instance: entry,
                                        stack: "'key' property is required with 'env' type secret",
                                    })
                                }
                            }
                        }
                    }
                }

                // Volumes
                if (component.volumes) {
                    for (const volume of component.volumes) {
                        if (volume.hostPath && entry.syncVolume) {
                            errors.push({
                                message: "'syncVolume' property is not compatible when using hostpaths",
                                instance: volume,
                                stack: "'syncVolume' property is not compatible when using hostpaths",
                            })
                        }
                    }
                }

                // NetworkPolicy
                if (component.networkPolicy) {
                    if(component.networkPolicy.scope == 'custom' && (!component.networkPolicy.allow || component.networkPolicy.allow.length == 0)) {
                        errors.push({
                            message: "'networkPolicy.allow' property is missing",
                            instance: component.networkPolicy,
                            stack: "'networkPolicy.allow' property is missing",
                        })
                    }
                }
            }
        }
        return errors
    }
}

module.exports = SchemaV1
