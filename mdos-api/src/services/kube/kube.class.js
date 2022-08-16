const { NotFound, GeneralError, BadRequest, Conflict, Unavailable } = require('@feathersjs/errors')

/* eslint-disable no-unused-vars */
exports.Kube = class Kube {
    constructor(options, app) {
        this.options = options || {}
        this.app = app
    }

    async find(params) {
        switch (params.query.target) {
            case 'namespaces':
                return await this.app.get('kube').getNamespaces()
        }
    }

    async get(id, params) {
        return {
            id,
            text: `A new message with ID: ${id}!`,
        }
    }

    async create(data, params) {
        if (data.type == 'secret') {
            if (await this.app.get('kube').hasSecret(data.namespace, data.name)) {
                await this.app.get('kube').replaceSecret(data.namespace, data.name, data.data)
            } else {
                await this.app.get('kube').createSecret(data.namespace, data.name, data.data)
            }
        }

        if (data.type == 'tenantNamespace') {
            if (!(await this.app.get('kube').hasNamespace(data.namespace))) {
                await this.app.get('kube').createNamespace(data)
            } else {
                throw new Conflict('Namespace already exists')
            }
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
