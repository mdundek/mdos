const axios = require("axios");
const https = require("https");
const YAML = require('yaml');
const fs = require("fs");
const { terminalCommand } = require("../libs/terminal");

let caCrt;
if(process.env.RUN_TARGET == "pod") {
    caCrt = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/ca.crt');
} else {
    caCrt = fs.readFileSync(process.env.K3S_ROOT_CA_PATH);
}
axios.defaults.httpsAgent = new https.Agent({
    ca: caCrt
});

class KubeBase {

    /**
     * constructor
     * @param {*} app 
     */
     constructor(app) {
        this.app = app;
        if(process.env.RUN_TARGET == "pod") {
            this.K3S_TOKEN = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8').toString();
            this.K3S_API_SERVER = "kubernetes.default.svc";
            this.K3S_ROOT_CA_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt';
        } else {
            this.K3S_TOKEN = process.env.K3S_TOKEN;
            this.K3S_API_SERVER = process.env.K3S_API_SERVER;
            this.K3S_ROOT_CA_PATH = process.env.K3S_ROOT_CA_PATH;
        }

        this.HELM_BASE_CMD = `helm --kube-apiserver "https://${this.K3S_API_SERVER}" --kube-ca-file ${this.K3S_ROOT_CA_PATH} --kube-token "${this.K3S_TOKEN}"`
        
        this.k8sAxiosHeader = {
            headers: { 'Authorization': `Bearer ${this.K3S_TOKEN}` }
        };
        this.k8sAxiosPatchHeader = {
            headers: { 'Authorization': `Bearer ${this.K3S_TOKEN}`, 'Content-Type': 'application/strategic-merge-patch+json' }
        };

        this.genericHelmChartPath = process.env.GEN_HELM_PATH_PATH;
        this.istiodChartPath = process.env.ISTIO_CHART_PATH;
        this.rootDomain = process.env.ROOT_DOMAIN;
        this.regUser = process.env.REG_USER;
        this.regPass = process.env.REG_PASS;
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
            await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets/${secretName}`, this.k8sAxiosHeader);
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
     * deleteSecret
     * @param {*} name 
     * @param {*} secretName 
     */
     async deleteSecret(namespaceName, secretName) {
        const secretExists = await this.hasSecret(namespaceName, secretName);
        if(secretExists)
            await axios.delete(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets/${secretName}`, this.k8sAxiosHeader);
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

        // Create namespace
        await axios.post(`https://${this.K3S_API_SERVER}/api/v1/namespaces`, nsJson, this.k8sAxiosHeader);
        
        // Create private registry credentials secret
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
    async helmUninstall(namespace, chartName) {
        await terminalCommand(`${this.HELM_BASE_CMD} delete ${chartName} -n ${namespace}`);
    }

    /**
     * mdosGenericHelmInstall
     * @param {*} namespace 
     * @param {*} values 
     */
    async mdosGenericHelmInstall(namespace, values) {
        let nsCreated = await this.hasNamespace(namespace);
        let doCreateNs = false;
        if(!nsCreated) {
            await this.createNamespace({name: namespace, skipSidecar: true});
            doCreateNs = true;
        }

        try {
            fs.writeFileSync('./values.yaml', YAML.stringify(values));
            await terminalCommand(`${this.HELM_BASE_CMD} upgrade --install -n ${namespace} --values ./values.yaml ${values.appName} ${this.genericHelmChartPath} --atomic`);
        } catch(err) {
            if(doCreateNs) {
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