const axios = require("axios");
const https = require("https");
const YAML = require('yaml');
const fs = require("fs");
const { terminalCommand } = require("../libs/terminal");

axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

class KubeBase {

    /**
     * constructor
     * @param {*} app 
     */
     constructor(app) {
        this.app = app;
        this.K3S_TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6IkxmeE9YQU5feTFHZC1UclRxQ1N6bG1nOHNVdE04d0dCcS1HUzhiY2g5ZVkifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJtZG9zLXNvbHV0aW9uIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6ImRlZmF1bHQtdG9rZW4iLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiZGVmYXVsdCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6IjA1ZWI2OWM2LTQyZTktNDJlYS05NDk0LTIwN2QzYmNiNTY3YiIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDptZG9zLXNvbHV0aW9uOmRlZmF1bHQifQ.m0MXDDs_HZf0HuXopVE6oHIwDXFcBi4jp1eS9nhBlvuaPilQPFbkuBzoMcodGhmJqdwG3JqzbEN2Q400xzqAM11aUa-T-MG0wmq5FG0hTKcAmnKVLW3OhcisaX8fpdKgKWYd3vB6Mm15jXJ4dBjYIKibnKzFInMPetEFSSNc43Waqfl2r379AIs1uzOgYYkREMBnpDYvQNJ5640JrFuB5Wxi7wxbuajiqnKSrsp4J6F90-ZXZ6Sv8whmkIQAFo9_pbDXDR7Xh5TVG-_crLoMILdzNJM8SskM_uUPd53LkHCJIdsJlJPHjsxKIX-0UFrVCd7Sd_ZzE6gzyTL-1aRx7g";
        this.K3S_API_SERVER="127.0.0.1:6443";
        this.K3S_ROOT_CA_PATH="/var/lib/rancher/k3s/server/tls/server-ca.crt";
        this.HELM_BASE_CMD = `sudo helm --kube-apiserver "https://${this.K3S_API_SERVER}" --kube-ca-file ${this.K3S_ROOT_CA_PATH} --kube-token "${this.K3S_TOKEN}"`
        
        this.k8sAxiosHeader = {
            headers: { 'Authorization': `Bearer ${this.K3S_TOKEN}` }
        };
        this.k8sAxiosPatchHeader = {
            headers: { 'Authorization': `Bearer ${this.K3S_TOKEN}`, 'Content-Type': 'application/strategic-merge-patch+json' }
        };

        this.genericHelmChartPath = "/home/mdundek/workspaces/mdos/setup/dep/generic-helm-chart";
        this.istiodChartPath = "/home/mdundek/workspaces/mdos/setup/dep/istio_helm/istio-control/istio-discovery";
        
        this.rootDomain = "mdundek.network";
        this.regUser = "mdundek";
        this.regPass = "li14ebe14";
    }

    /**
     * getConfigMap
     * @param {*} namespaceName 
     * @param {*} cmName 
     */
    async getConfigMap(namespaceName, cmName) {
        const res = await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/configmaps/${cmName}`, this.k8sAxiosHeader);
        return res.data;
    }

    /**
     * replaceConfigMap
     * @param {*} namespaceName 
     * @param {*} cmName 
     * @param {*} body 
     */
    async replaceConfigMap(namespaceName, cmName, body) {
        await axios.put(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/configmaps/${cmName}`, body, this.k8sAxiosHeader);
    }

    /**
     * getSecret
     * @param {*} namespaceName 
     * @param {*} secretName 
     */
    async getSecret(namespaceName, secretName) {
        const res = await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets/${secretName}`, this.k8sAxiosHeader);
        for(let param of Object.keys(res.data.data)) {
            res.data.data[param] = Buffer.from(res.data.data[param], 'base64').toString('utf-8');
        }
        return res.data.data;
    }

    /**
     * hasSecret
     * @param {*} namespaceName 
     * @param {*} secretName 
     */
    async hasSecret(namespaceName, secretName) {
        try {
            await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets/${secretName}/${secretName}`, this.k8sAxiosHeader);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * createSecret
     * @param {*} namespaceName 
     * @param {*} secretName 
     * @param {*} data 
     */
    async createSecret(namespaceName, secretName, data) {
        for(let param of Object.keys(data)) {
            data[param] = Buffer.from(data[param], 'utf-8').toString('base64');
        }
        await axios.post(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets`, {
            "apiVersion": "v1",
            "data": data,
            "kind": "Secret",
            "metadata": {
                "name": secretName,
            },
            "type": "Opaque"
        }, this.k8sAxiosHeader);
    }

    /**
     * replaceSecret
     * @param {*} namespaceName 
     * @param {*} secretName 
     * @param {*} data 
     */
    async replaceSecret(namespaceName, secretName, data) {
        for(let param of Object.keys(data)) {
            data[param] = Buffer.from(data[param], 'utf-8').toString('base64');
        }
        await axios.put(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets/${secretName}`, {
            "apiVersion": "v1",
            "data": data,
            "kind": "Secret",
            "metadata": {
                "name": secretName,
            },
            "type": "Opaque"
        }, this.k8sAxiosHeader);
    }

    /**
     * getPods
     * @param {*} namespaceName 
     * @returns 
     */
    async getPods(namespaceName) {
        const res = await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/pods`, this.k8sAxiosHeader);
        return res.data;
    }

    /**
     * getNamespaces
     * @returns 
     */
    async getNamespaces() {
        const res = await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces`, this.k8sAxiosHeader);
        return res.data.items;
    }

    /**
     * hasNamespace
     */
    async hasNamespace(name) {
        const res = await this.getNamespaces();
        return res.find(n => n.metadata.name == name) ? true : false;
    }

    /**
     * createNamespace
     * @param {*} data
     */
     async createNamespace(data) {
        const res = await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces`, this.k8sAxiosHeader);
        let namespaceName = data.name.trim().toLowerCase().replaceAll(' ', '_');
        if(res.data.items.find(ns => ns.metadata.name.trim().toLowerCase() == namespaceName)) {
            throw new Error(`The namespace "${data.name}" already exists`);
        }

        const nsJson = {
            "apiVersion": "v1",
            "kind": "Namespace",
            "metadata": {
                "name": namespaceName,
                "labels": {}
            }
        };
        if(!data.skipSidecar) {
            nsJson.metadata.labels["istio-injection"] = "enabled";
        }

        await axios.post(`https://${this.K3S_API_SERVER}/api/v1/namespaces`, nsJson, this.k8sAxiosHeader);
        
        let secretDataString = `{"auths":{"registry.${this.rootDomain}":{"username":"${this.regUser}","password":"${this.regPass}","auth":"${Buffer.from(`${this.regUser}:${this.regPass}`, 'utf-8').toString('base64')}"}}}`
        await axios.post(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets`, {
            "apiVersion": "v1",
            "data": {
                ".dockerconfigjson": Buffer.from(secretDataString, 'utf-8').toString('base64')
            },
            "kind": "Secret",
            "metadata": {
                "name": "regcred-local",
            },
            "type": "kubernetes.io/dockerconfigjson"
        }, this.k8sAxiosHeader);
    }

    /**
     * deleteNamespace
     * @param {*} namespaceName 
     */
    async deleteNamespace(namespaceName) {
        await axios.delete(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}`, this.k8sAxiosHeader);
    }

    /**
     * deletePod
     * @param {*} namespaceName 
     * @param {*} podName 
     */
    async deletePod(namespaceName, podName) {
        await axios.delete(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/pods/${podName}`, this.k8sAxiosHeader);
    }

    /**
     * helmInstall
     * @param {*} namespace 
     * @param {*} chartName 
     * @param {*} values 
     * @param {*} chart 
     * @param {*} version 
     */
    async helmInstall(namespace, chartName, values, chart, version) {
        try {
            fs.writeFileSync('./values.yaml', YAML.stringify(values));
            await terminalCommand(`${this.HELM_BASE_CMD} upgrade --install -n ${namespace} ${version ? `--version ${version}` : ""} --values ./values.yaml  ${chartName} ${chart} --atomic`);
        } finally {
            if (fs.existsSync("./values.yaml")) {
                fs.unlinkSync("./values.yaml");
            }
        }
    }

    /**
     * helmUninstall
     * @param {*} chartName 
     */
    async helmUninstall(chartName) {
        // this.HELM_BASE_CMD
    }

    /**
     * genericHelmInstall
     * @param {*} namespace 
     * @param {*} values 
     */
    async genericHelmInstall(namespace, values) {
        let nsCreated = await this.hasNamespace(namespace);
        if(!nsCreated) {
            await this.createNamespace({name: namespace, skipSidecar: true});
            nsCreated = true;
        }

        try {
            fs.writeFileSync('./values.yaml', YAML.stringify(values));
            await terminalCommand(`${this.HELM_BASE_CMD} upgrade --install -n ${namespace} --values ./values.yaml ${values.appName} ${this.genericHelmChartPath} --atomic`);
        } catch(err) {
            if(nsCreated) {
                try { await this.deleteNamespace(namespace); } catch (error) { }
            }
            throw err;
        } finally {
            if (fs.existsSync("./values.yaml")) {
                fs.unlinkSync("./values.yaml");
            }
        }
    }
}

module.exports = KubeBase;