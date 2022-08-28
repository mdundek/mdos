const axios = require("axios");
const https = require("https");
const YAML = require('yaml');
const fs = require("fs");
const { terminalCommand, terminalCommandAsync } = require("../libs/terminal");

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
     * getApplicationPods
     * @param {*} namespaceName 
     * @param {*} appUuid 
     * @returns 
     */
    async getApplicationPods(namespaceName, appUuid) {
        const myUrlWithParams = new URL(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/pods`);
        myUrlWithParams.searchParams.append("appUuid", appUuid);

        const res = await axios.get(myUrlWithParams.href, this.k8sAxiosHeader);
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
    }


    /**
     * createRegistrySecret
     * @param {*} namespaceName 
     * @param {*} secretName 
     * @param {*} user 
     * @param {*} pass 
     */
    async createRegistrySecret(namespaceName, secretName, user, pass) {
        // Create private registry credentials secret
        let secretDataString = `{"auths":{"registry.${this.rootDomain}":{"username":"${user}","password":"${pass}","auth":"${Buffer.from(`${user}:${pass}`, 'utf-8').toString('base64')}"}}}`
        await axios.post(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets`, {
            "apiVersion": "v1",
            "data": {
                ".dockerconfigjson": Buffer.from(secretDataString, 'utf-8').toString('base64')
            },
            "kind": "Secret",
            "metadata": {
                "name": secretName,
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
    async mdosGenericHelmInstall(namespace, values, processId) {
        let nsCreated = await this.hasNamespace(namespace);
        let doCreateNs = false;
        if(!nsCreated) {
            await this.createNamespace({name: namespace, skipSidecar: true});
            doCreateNs = true;
        }

        fs.writeFileSync('./values.yaml', YAML.stringify(values));

        try {
            await this._asyncChildHelmDeploy(
                `${this.HELM_BASE_CMD} upgrade --install -n ${namespace} --values ./values.yaml ${values.appName} ${this.genericHelmChartPath} --atomic`, 
                processId, 
                values.tenantName,
                values.uuid
            );
        } catch (error) {
            if(doCreateNs) {
                try { await this.deleteNamespace(namespace); } catch (_e) { }
            }
            throw error;
        } finally {
            if (fs.existsSync("./values.yaml")) {
                fs.unlinkSync("./values.yaml");
            }
        }
    }

    /**
     * _asyncChildHelmDeploy
     * @param {*} cmd 
     * @param {*} processId 
     * @param {*} namespace 
     * @param {*} appUuid
     * @returns 
     */
    _asyncChildHelmDeploy(cmd, processId, namespace, appUuid) {
        return new Promise((resolve, reject) => {
            let hasErrors = false;
            const errArray = [];

            let checkClientAvailInterval = null;
            let grabStatusInterval = null;

            const deployedAtDate = new Date().getTime() - 1000;

            // Start async deployment
            const helmChild = terminalCommandAsync(
                cmd,
                // On STDOUT
                function(_processId, msg) {
                    this.app.get("socketManager").emit(_processId, {
                        raw: true,
                        stdout: msg
                    });
                }.bind(this, processId),
                // On STDERR
                function(_processId, errMsg) {
                    this.app.get("socketManager").emit(_processId, {
                        raw: true,
                        stderr: errMsg
                    });
                    errArray.push(errMsg);
                    hasErrors = true;
                }.bind(this, processId),
                // On DONE
                function(_processId) {
                    if(checkClientAvailInterval)
                        clearInterval(checkClientAvailInterval);
                    if(grabStatusInterval)
                        clearInterval(grabStatusInterval);
                    if(hasErrors) {
                        reject(errArray)
                    } else {
                        resolve();
                    }
                }.bind(this, processId)
            );

            // Make sure client CLI still alive before deployment done, 
            // otherwise terminate & rollback deployment
            checkClientAvailInterval = setInterval(function(_processId) {
                if(!this.app.get("socketManager").isClientAlive(_processId)) {
                    reject(["Client cancelled"]);
                    clearInterval(checkClientAvailInterval);
                    clearInterval(grabStatusInterval);
                    helmChild.kill();
                }
            }.bind(this, processId), 2000);

            const podsCurrentStatus = {};

            // Retrieve all pod status list and send back to
            // client CLI in case of any changes in statuses
            grabStatusInterval = setInterval(function(_processId) {
                // Get all pods for the application Uuid in this namespace
                this.getApplicationPods(namespace, appUuid).then(function(_processId, podsResponse) {
                    // Filter out pods to keep only the new once we are trying to deploy
                    const cPods = podsResponse.items.filter(pod => {
                        return pod.metadata.creationTimestamp ? (new Date(pod.metadata.creationTimestamp).getTime() >= deployedAtDate) : false;
                    })

                    let changed = false;

                    // Now iterate over those pods to get detailes status information
                    for(const podResponse of cPods) {
                        if(podResponse.status) {
                            const podLiveStatus = {
                                name: podResponse.metadata.labels.app,
                                phase: podResponse.status.phase ? podResponse.status.phase : "n/a",
                                initContainerStatuses: [],
                                containerStatuses: [],
                            }

                            if(podResponse.status.initContainerStatuses) {
                                for(const containerStatus of podResponse.status.initContainerStatuses.filter(p => p.name != "istio-init")) {
                                    if(containerStatus.state) {
                                        const stateKeys = Object.keys(containerStatus.state);
                                        if(stateKeys.length == 1) {
                                            const stateName = stateKeys[0];
                                            podLiveStatus.initContainerStatuses.push({
                                                name: containerStatus.name,
                                                state: stateName,
                                                reason: containerStatus.state[stateName].reason ? containerStatus.state[stateName].reason : null,
                                                message: containerStatus.state[stateName].message ? containerStatus.state[stateName].message : null
                                            });
                                        }
                                    }
                                }
                            }

                            if(podResponse.status.containerStatuses) {
                                for(const containerStatus of podResponse.status.containerStatuses.filter(p => p.name != "istio-proxy")) {
                                    if(containerStatus.state) {
                                        const stateKeys = Object.keys(containerStatus.state);
                                        if(stateKeys.length == 1) {
                                            const stateName = stateKeys[0];
                                            podLiveStatus.containerStatuses.push({
                                                name: containerStatus.name,
                                                state: stateName,
                                                reason: containerStatus.state[stateName].reason ? containerStatus.state[stateName].reason : null,
                                                message: containerStatus.state[stateName].message ? containerStatus.state[stateName].message : null,
                                                started: containerStatus.started
                                            });
                                        }
                                    }
                                }
                            }

                            if(!podsCurrentStatus[podResponse.metadata.name]) {
                                podsCurrentStatus[podResponse.metadata.name] = podLiveStatus;
                                changed = true;
                            } else if(JSON.stringify(podsCurrentStatus[podResponse.metadata.name]) != JSON.stringify(podLiveStatus)) {
                                podsCurrentStatus[podResponse.metadata.name] = podLiveStatus;
                                changed = true;
                            }
                        }
                    }

                    if(changed) {
                        if(this.app.get("socketManager").isClientAlive(_processId)) {
                            this.app.get("socketManager").emit(_processId, {
                                raw: true,
                                deployStatus: podsCurrentStatus
                            });
                        }
                    }
                }.bind(this, processId)).catch(function(processId, err) {
                    console.log("PODS list & status lookup error:", err);
                }.bind(this, processId))
            }.bind(this, processId), 2000);
        });
    }
}

module.exports = KubeBase;