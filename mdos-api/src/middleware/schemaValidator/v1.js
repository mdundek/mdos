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
    constructor(frameworkOnlyMode) {
        this.frameworkOnlyMode = frameworkOnlyMode
        this.validator = new Validator()

        // Application schema
        this.applicationSchema = {
            id: '/MdosApplication',
            type: 'object',
            properties: {
                schemaVersion: { type: 'string', enum: ['v1', 'v1-framework'] },
                tenantName: {
                    type: 'string',
                    pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
                },
                appName: {
                    type: 'string',
                    pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
                },
                uuid: {
                    type: 'string',
                    pattern: /^[a-zA-Z0-9]+[a-zA-Z0-9\-]{2,20}$/,
                },
                components: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
                            },
                            uuid: {
                                type: 'string',
                                pattern: /^[a-zA-Z0-9]+[a-zA-Z0-9\-]{2,20}$/,
                            },
                            image: { type: 'string' },
                            tag: { type: 'string' },
                            registry: { type: 'string' },
                            publicRegistry: { type: 'boolean' },
                            imagePullPolicy: { type: 'string', enum: ['Always', 'IfNotPresent', 'Never'] },
                            imagePullSecrets: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                        },
                                    },
                                    required: ['name'],
                                    additionalProperties: false,
                                },
                            },
                            securityContext: { type: 'object' },
                            command: {
                                type: 'array',
                            },
                            commandArgs: {
                                type: 'array',
                            },
                            workingDir: {
                                type: 'string',
                            },
                            resources: {
                                type: 'object',
                                properties: {
                                    requests: {
                                        type: 'object',
                                        properties: {
                                            memory: {
                                                type: 'string',
                                            },
                                            cpu: {
                                                type: 'string',
                                            },
                                        },
                                    },
                                    limits: {
                                        type: 'object',
                                        properties: {
                                            memory: {
                                                type: 'string',
                                            },
                                            cpu: {
                                                type: 'string',
                                            },
                                        },
                                    },
                                },
                                required: ['requests', 'limits'],
                                additionalProperties: false,
                            },
                            services: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
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
                            networkPolicy: {
                                type: 'object',
                                properties: {
                                    scope: {
                                        type: 'string',
                                        enum: ['private', 'limited', 'open', 'custom'],
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
                                            additionalProperties: false,
                                        },
                                    },
                                },
                                required: ['scope'],
                                additionalProperties: false,
                            },
                            preBuildCmd: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                            },
                            doNotBuild: { type: 'boolean' },
                            configs: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
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
                                            pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
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
                                                        pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
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
                            dependsOn: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                            },
                            initContainers: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
                                        },
                                        image: { type: 'string' },
                                        tag: { type: 'string' },
                                        registry: { type: 'string' },
                                        publicRegistry: { type: 'boolean' },
                                        imagePullPolicy: { type: 'string', enum: ['Always', 'IfNotPresent', 'Never'] },
                                        env: { type: 'array' },
                                        command: { type: 'array' },
                                        args: { type: 'array' },
                                    },
                                    required: ['name', 'image', 'tag'],
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

        // If MDos full mode
        if (!this.frameworkOnlyMode) {
            this.applicationSchema.properties.components.items.properties.volumes = {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
                        },
                        mountPath: { type: 'string' },
                        hostPath: { type: 'string' },
                        sharedVolumeName: { type: 'string' },
                        syncVolume: { type: 'boolean' },
                        trigger: { type: 'string' },
                        size: { type: 'string' },
                    },
                    required: ['name', 'mountPath'],
                    additionalProperties: false,
                },
            }
            this.applicationSchema.properties.components.items.properties.oidc = {
                type: 'object',
                properties: {
                    provider: {
                        type: 'string',
                        pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
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
            }
            this.applicationSchema.properties.components.items.properties.ingress = {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
                        },
                        matchHost: {
                            type: 'string',
                            format: 'host-name',
                        },
                        targetPort: { type: 'integer' },
                        trafficType: { type: 'string', enum: ['http', 'https'] },
                        subPath: { type: 'string' },
                        tlsSecretName: { type: 'string' },
                    },
                    required: ['name', 'matchHost', 'targetPort'],
                    additionalProperties: false,
                },
            }
        }
        // If MDos framework only mode
        else {
            this.applicationSchema.properties.components.items.properties.volumes = {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
                        },
                        mountPath: { type: 'string' },
                        hostPath: { type: 'string' },
                        sharedVolumeName: { type: 'string' },
                        trigger: { type: 'string' },
                        size: { type: 'string' },
                    },
                    required: ['name', 'mountPath'],
                    additionalProperties: false,
                },
            }
            this.applicationSchema.properties.components.items.properties.ingress = {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            pattern: /^[a-z]+[a-z0-9\-]{2,20}$/,
                        },
                        matchHost: {
                            type: 'string',
                            format: 'host-name',
                        },
                        targetPort: { type: 'integer' },
                        trafficType: { type: 'string', enum: ['HTTP', 'HTTPS_SIMPLE', 'HTTPS_PASSTHROUGH'] },
                        subPath: { type: 'string' },
                        tlsSecretName: { type: 'string' },
                    },
                    required: ['name', 'matchHost', 'targetPort'],
                    additionalProperties: false,
                },
            }
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
                        if ((config.type == 'file' || config.type == 'dir') && !config.mountPath) {
                            errors.push({
                                message: "'mountPath' property is required",
                                instance: config,
                                stack: "'mountPath' property is required",
                            })
                        }
                        if (!config.ref) {
                            if (!config.entries || config.entries.length == 0) {
                                errors.push({
                                    message: "'entries' property is required",
                                    instance: config,
                                    stack: "'entries' property is required",
                                })
                            } else {
                                for (const entry of config.entries) {
                                    if (config.type == 'file' && !entry.filename) {
                                        errors.push({
                                            message: "'filename' property is required",
                                            instance: entry,
                                            stack: "'filename' property is required",
                                        })
                                    } else if ((config.type == 'dir' || config.type == 'env') && entry.filename) {
                                        errors.push({
                                            message: "'filename' property is not compatible with 'dir' or 'env' type",
                                            instance: entry,
                                            stack: "'filename' property is not compatible with 'dir' or 'env' type",
                                        })
                                    }
                                    if ((config.type == 'file' || config.type == 'dir') && entry.name) {
                                        errors.push({
                                            message: "'name' property is not compatible with 'file' type and external config reference",
                                            instance: entry,
                                            stack: "'name' property is not compatible with 'file' type and external config reference",
                                        })
                                    }
                                    if (!entry.key) {
                                        errors.push({
                                            message: "'key' property is missing",
                                            instance: entry,
                                            stack: "'key' property is missing",
                                        })
                                    }
                                }
                            }
                        } else {
                            if ((config.type == 'file' || config.type == 'env') && (!config.entries || config.entries.length == 0)) {
                                errors.push({
                                    message: "'entries' property is required",
                                    instance: config,
                                    stack: "'entries' property is required",
                                })
                            } else if (config.type == 'dir' && config.entries) {
                                errors.push({
                                    message: "'entries' property is not allowed when using type 'dir' that references an existing config",
                                    instance: config,
                                    stack: "'entries' property is not allowed when using type 'dir' that references an existing config",
                                })
                            }
                            if (config.type == 'file' || (config.type == 'env' && config.entries)) {
                                for (const entry of config.entries) {
                                    if (config.type == 'file' && !entry.key) {
                                        errors.push({
                                            message: "'key' property is required",
                                            instance: entry,
                                            stack: "'key' property is required",
                                        })
                                    }
                                    if (config.type == 'file' && !entry.filename) {
                                        errors.push({
                                            message: "'filename' property is required",
                                            instance: entry,
                                            stack: "'filename' property is required",
                                        })
                                    }
                                }
                            }
                        }
                    }
                }
                if (component.secrets) {
                    for (const secret of component.secrets) {
                        if ((secret.type == 'file' || secret.type == 'dir') && !secret.mountPath) {
                            errors.push({
                                message: "'mountPath' property is required",
                                instance: secret,
                                stack: "'mountPath' property is required",
                            })
                        }
                        if (!secret.ref) {
                            if (!secret.entries || secret.entries.length == 0) {
                                errors.push({
                                    message: "'entries' property is required",
                                    instance: secret,
                                    stack: "'entries' property is required",
                                })
                            } else {
                                for (const entry of secret.entries) {
                                    if (secret.type == 'file' && !entry.filename) {
                                        errors.push({
                                            message: "'filename' property is required",
                                            instance: entry,
                                            stack: "'filename' property is required",
                                        })
                                    } else if ((secret.type == 'dir' || secret.type == 'env') && entry.filename) {
                                        errors.push({
                                            message: "'filename' property is not compatible with 'dir' or 'env' type",
                                            instance: entry,
                                            stack: "'filename' property is not compatible with 'dir' or 'env' type",
                                        })
                                    }
                                    if ((secret.type == 'file' || secret.type == 'dir') && entry.name) {
                                        errors.push({
                                            message: "'name' property is not compatible with 'file' type and external secret reference",
                                            instance: entry,
                                            stack: "'name' property is not compatible with 'file' type and external secret reference",
                                        })
                                    }
                                    if (!entry.key) {
                                        errors.push({
                                            message: "'key' property is missing",
                                            instance: entry,
                                            stack: "'key' property is missing",
                                        })
                                    }
                                }
                            }
                        } else {
                            if ((secret.type == 'file' || secret.type == 'env') && (!secret.entries || secret.entries.length == 0)) {
                                errors.push({
                                    message: "'entries' property is required",
                                    instance: secret,
                                    stack: "'entries' property is required",
                                })
                            } else if (secret.type == 'dir' && secret.entries) {
                                errors.push({
                                    message: "'entries' property is not allowed when using type 'dir' that references an existing secret",
                                    instance: secret,
                                    stack: "'entries' property is not allowed when using type 'dir' that references an existing secret",
                                })
                            }
                            if (secret.type == 'file' || (secret.type == 'env' && secret.entries)) {
                                for (const entry of secret.entries) {
                                    if (secret.type == 'file' && !entry.key) {
                                        errors.push({
                                            message: "'key' property is required",
                                            instance: entry,
                                            stack: "'key' property is required",
                                        })
                                    }
                                    if (secret.type == 'file' && !entry.filename) {
                                        errors.push({
                                            message: "'filename' property is required",
                                            instance: entry,
                                            stack: "'filename' property is required",
                                        })
                                    }
                                }
                            }
                        }
                    }
                }

                // Volumes
                if (component.volumes) {
                    for (const volume of component.volumes) {
                        if (volume.hostPath && volume.syncVolume) {
                            errors.push({
                                message: "'syncVolume' property is not compatible when using hostpaths",
                                instance: volume,
                                stack: "'syncVolume' property is not compatible when using hostpaths",
                            })
                        }
                        if (!this.frameworkOnlyMode && volume.syncVolume) {
                            if (!volume.trigger || !['initial', 'always'].includes(volume.trigger)) {
                                errors.push({
                                    message: "'syncVolume' is set, but volume has missing property 'trigger', needs to be 'initial' or 'always'",
                                    instance: volume,
                                    stack: "'syncVolume' is set, but volume has missing property 'trigger', needs to be 'initial' or 'always'",
                                })
                            }
                        }
                        if (volume.hostPath && volume.sharedVolumeName) {
                            errors.push({
                                message: "'hostPath' property is not compatible when using sharedVolumeName",
                                instance: volume,
                                stack: "'hostPath' property is not compatible when using sharedVolumeName",
                            })
                        }
                        if (!volume.hostPath && !volume.size) {
                            errors.push({
                                message: "'size' property is mandatory when not using hostPath or sharedVolumeName property",
                                instance: volume,
                                stack: "'size' property is mandatory when not using hostPath or sharedVolumeName property",
                            })
                        }
                    }
                }

                // NetworkPolicy
                if (component.networkPolicy) {
                    if (component.networkPolicy.scope == 'custom' && (!component.networkPolicy.allow || component.networkPolicy.allow.length == 0)) {
                        errors.push({
                            message: "'networkPolicy.allow' property is empty or missing",
                            instance: component.networkPolicy,
                            stack: "'networkPolicy.allow' property is empty or missing",
                        })
                    }
                }
            }
        }
        return errors
    }
}

module.exports = SchemaV1
