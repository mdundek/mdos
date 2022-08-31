var Validator = require('jsonschema').Validator;

class SchemaV1 {

    /**
     * constructor
     */
    constructor() {
        this.validator = new Validator();

        // Application schema
        this.applicationSchema = {
            "id": "/MdosApplication",
            "type": "object",
            "properties": {
                "schemaVersion": {"type": "string", "enum": ["v1"]},
                "tenantName": {
                    "type": "string", 
                    "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                },
                "appName": {
                    "type": "string", 
                    "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                },
                "uuid": {
                    "type": "string", 
                    "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                },
                "components": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string", 
                                "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                            },
                            "image": {"type": "string"},
                            "tag": {"type": "string"},
                            "uuid": {
                                "type": "string", 
                                "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                            },
                            "publicRegistry": {"type": "boolean"},
                            "services": {
                                "type": "array",
                                "items": { 
                                    "type": "object",
                                    "properties": {
                                        "name": {
                                            "type": "string", 
                                            "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                                        },
                                        "ports": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "properties": {
                                                    "port": {
                                                        "type": "integer",
                                                        "minimum": 80,
                                                        "maximum": 35000,
                                                    }
                                                },
                                                "required": ["port"],
                                                "additionalProperties": false
                                            }
                                        }
                                    },
                                    "required": ["name", "ports"],
                                    "additionalProperties": false
                                }
                            },
                            "ingress": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {
                                            "type": "string", 
                                            "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                                        },
                                        "matchHost": {
                                            "type": "string",
                                            "format": "host-name"
                                        },
                                        "targetPort": {"type": "integer"},
                                        "trafficType": {"type": "string", "enum": ["http", "https"]},
                                        "subPath": {"type": "string"},
                                        "tlsKeyPath": {"type": "string"},
                                        "tlsCrtPath": {"type": "string"},
                                        "oidcProvider": {"type": "string"},
                                        "tldMountPath": {"type": "string"}
                                    },
                                    "required": ["name", "matchHost", "targetPort"],
                                    "additionalProperties": false
                                }
                            },
                            "volumes": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {
                                            "type": "string", 
                                            "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                                        },
                                        "mountPath": {"type": "string"},
                                        "hostPath": {"type": "string"},
                                        "syncVolume": {"type": "boolean"}
                                    },
                                    "required": ["name", "mountPath"],
                                    "additionalProperties": false
                                }
                            },
                            "oidc": {
                                "type": "object",
                                "properties": {
                                    "provider": {
                                        "type": "string", 
                                        "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                                    },
                                    "host": {
                                        "type": "string",
                                        "format": "host-name"
                                    }
                                },
                                "required": ["provider", "host"],
                                "additionalProperties": false
                            },
                            "preBuildCmd": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                }
                            },
                            "configs": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {
                                            "type": "string", 
                                            "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                                        },
                                        "type": {"type": "string", "enum": ["env", "file"]},
                                        "mountPath": {"type": "string"},
                                        "entries": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "properties": {
                                                    "name": {
                                                        "type": "string", 
                                                        "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                                                    },
                                                    "fileName": {
                                                        "type": "string"
                                                    },
                                                    "key": {
                                                        "type": "string"
                                                    },
                                                    "value": {
                                                        "type": "string"
                                                    }
                                                },
                                                "required": ["value"],
                                                "additionalProperties": false
                                            }
                                        }
                                    },
                                    "required": ["name", "type", "entries"],
                                    "additionalProperties": false
                                }
                            },
                            "secrets": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {
                                            "type": "string", 
                                            "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                                        },
                                        "type": {"type": "string", "enum": ["env", "file"]},
                                        "mountPath": {"type": "string"},
                                        "entries": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "properties": {
                                                    "name": {
                                                        "type": "string", 
                                                        "pattern": /^[a-zA-Z]+[a-zA-Z0-9\-]{2,20}$/
                                                    },
                                                    "fileName": {
                                                        "type": "string"
                                                    },
                                                    "key": {
                                                        "type": "string"
                                                    },
                                                    "value": {
                                                        "type": "string"
                                                    }
                                                },
                                                "required": ["value"],
                                                "additionalProperties": false
                                            }
                                        }
                                    },
                                    "required": ["name", "type", "entries"],
                                    "additionalProperties": false
                                }
                            },
                        },
                        "required": ["name", "image", "tag", "uuid"],
                        "additionalProperties": false
                    }
                }
            },
            "required": ["schemaVersion", "tenantName", "appName", "uuid", "components"],
            "additionalProperties": false
        };
    }

    /**
     * validate
     * @param {*} jsonData 
     */
    validate(jsonData) {
        const result = this.validator.validate(jsonData, this.applicationSchema);
        return result.errors.map(error => {
            return {
                path: error.property,
                message: error.message,
                instance: error.instance,
                stack: error.stack
            }
        });
    }
}

module.exports = SchemaV1