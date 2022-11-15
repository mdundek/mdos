const KubeBaseConstants = require('./kubeBaseConstants')
const axios = require('axios')
const https = require('https')
const YAML = require('yaml')
const fs = require('fs')
let _ = require('lodash')
const { terminalCommand, terminalCommandAsync } = require('../libs/terminal')
const { isBuffer } = require('lodash')

let caCrt
if (process.env.RUN_TARGET == 'pod') {
    caCrt = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/ca.crt')
} else {
    caCrt = fs.readFileSync(process.env.K3S_ROOT_CA_PATH)
}
axios.defaults.httpsAgent = new https.Agent({
    ca: caCrt,
})

/**
 * Low level core kube functions
 *
 * @class KubeBase
 */
class KubeBase extends KubeBaseConstants {
    /**
     * Creates an instance of KubeBase.
     * @param {*} app
     * @memberof KubeBase
     */
    constructor(app) {
        super()

        this.app = app
        if (process.env.RUN_TARGET == 'pod') {
            this.K3S_TOKEN = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8').toString()
            this.K3S_API_SERVER = 'kubernetes.default.svc'
            this.K3S_ROOT_CA_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt'
        } else {
            this.K3S_TOKEN = process.env.K3S_TOKEN
            this.K3S_API_SERVER = process.env.K3S_API_SERVER
            this.K3S_ROOT_CA_PATH = process.env.K3S_ROOT_CA_PATH
        }

        this.HELM_BASE_CMD = `helm --kube-apiserver "https://${this.K3S_API_SERVER}" --kube-ca-file ${this.K3S_ROOT_CA_PATH} --kube-token "${this.K3S_TOKEN}"`

        this.k8sAxiosHeader = {
            headers: { Authorization: `Bearer ${this.K3S_TOKEN}` },
        }
        this.k8sAxiosPatchHeader = {
            headers: { Authorization: `Bearer ${this.K3S_TOKEN}`, 'Content-Type': 'application/strategic-merge-patch+json' },
        }

        this.genericHelmChartPath = process.env.GEN_HELM_PATH_PATH
        this.istiodChartPath = process.env.ISTIO_CHART_PATH
        this.rootDomain = process.env.ROOT_DOMAIN
        this.regUser = process.env.REG_USER
        this.regPass = process.env.REG_PASS
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} cmName
     * @return {*}
     * @memberof KubeBase
     */
    async getConfigMap(namespaceName, cmName) {
        const res = await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/configmaps/${cmName}`, this.k8sAxiosHeader)
        return res.data
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} cmName
     * @param {*} body
     * @memberof KubeBase
     */
    async replaceConfigMap(namespaceName, cmName, body) {
        await axios.put(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/configmaps/${cmName}`, body, this.k8sAxiosHeader)
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} secretName
     * @return {*}
     * @memberof KubeBase
     */
    async getSecret(namespaceName, secretName) {
        const res = await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets/${secretName}`, this.k8sAxiosHeader)
        for (let param of Object.keys(res.data.data)) {
            res.data.data[param] = Buffer.from(res.data.data[param], 'base64').toString('utf-8')
        }
        return res.data.data
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} secretName
     * @return {*}
     * @memberof KubeBase
     */
     async getTlsSecrets(namespaceName, secretName) {
        const res = await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets`, this.k8sAxiosHeader)
        if(secretName) {
            const target = res.data.items.filter(secret => secret.type == "kubernetes.io/tls").find(secret => secret.metadata.name == secretName)
            return target ? [target] : []
        } else {
            return res.data.items.filter(secret => secret.type == "kubernetes.io/tls")
        }
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} secretName
     * @return {*}
     * @memberof KubeBase
     */
    async hasSecret(namespaceName, secretName) {
        try {
            await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets/${secretName}`, this.k8sAxiosHeader)
            return true
        } catch (error) {
            return false
        }
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} secretName
     * @param {*} data
     * @memberof KubeBase
     */
    async createSecret(namespaceName, secretName, data) {
        for (let param of Object.keys(data)) {
            data[param] = Buffer.from(data[param], 'utf-8').toString('base64')
        }
        await axios.post(
            `https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets`,
            {
                apiVersion: 'v1',
                data: data,
                kind: 'Secret',
                metadata: {
                    name: secretName,
                },
                type: 'Opaque',
            },
            this.k8sAxiosHeader
        )
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} secretName
     * @param {*} data
     * @memberof KubeBase
     */
    async replaceSecret(namespaceName, secretName, data) {
        for (let param of Object.keys(data)) {
            data[param] = Buffer.from(data[param], 'utf-8').toString('base64')
        }
        await axios.put(
            `https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets/${secretName}`,
            {
                apiVersion: 'v1',
                data: data,
                kind: 'Secret',
                metadata: {
                    name: secretName,
                },
                type: 'Opaque',
            },
            this.k8sAxiosHeader
        )
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} secretName
     * @memberof KubeBase
     */
    async deleteSecret(namespaceName, secretName) {
        const secretExists = await this.hasSecret(namespaceName, secretName)
        if (secretExists) await axios.delete(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets/${secretName}`, this.k8sAxiosHeader)
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @return {*}
     * @memberof KubeBase
     */
    async getPods(namespaceName) {
        const res = await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/pods`, this.k8sAxiosHeader)
        return res.data
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} podName
     * @param {*} containerName
     * @return {*}
     * @memberof KubeBase
     */
    async getPodLogs(namespaceName, podName, containerName) {
        const myUrlWithParams = new URL(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/pods/${podName}/log`)
        myUrlWithParams.searchParams.append('container', containerName)
        const res = await axios.get(myUrlWithParams.href, this.k8sAxiosHeader)
        return res.data
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} appUuid
     * @return {*}
     * @memberof KubeBase
     */
    async getApplicationPods(namespaceName, appUuid) {
        const myUrlWithParams = new URL(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/pods`)
        myUrlWithParams.searchParams.append('labelSelector', `appUuid=${appUuid}`)
        const res = await axios.get(myUrlWithParams.href, this.k8sAxiosHeader)
        return res.data
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} appUuid
     * @return {*}
     * @memberof KubeBase
     */
    async getApplicationDeployment(namespaceName, appUuid) {
        const myUrlWithParams = new URL(`https://${this.K3S_API_SERVER}/apis/apps/v1/namespaces/${namespaceName}/deployments`)
        myUrlWithParams.searchParams.append('labelSelector', `appUuid=${appUuid}`)
        const res = await axios.get(myUrlWithParams.href, this.k8sAxiosHeader)
        return res.data
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @return {*}
     * @memberof KubeBase
     */
    async getApplicationDeployments(namespaceName) {
        const myUrlWithParams = new URL(`https://${this.K3S_API_SERVER}/apis/apps/v1/namespaces/${namespaceName}/deployments`)
        const res = await axios.get(myUrlWithParams.href, this.k8sAxiosHeader)
        return res.data
    }

    /**
     * getCertManagerCertificates
     * 
     * @param {*} namespaceName 
     * @param {*} certName 
     * @returns 
     */
    async getCertManagerCertificates(namespaceName, certName) {
        const myUrlWithParams = new URL(`https://${this.K3S_API_SERVER}/apis/cert-manager.io/v1/namespaces/${namespaceName}/certificates`)
        const res = await axios.get(myUrlWithParams.href, this.k8sAxiosHeader)

        let certList
        if(certName) {
            const targetObj = res.data.items.find(crt => crt.metadata.name == certName)
            if(targetObj) certList = [targetObj]
            else certList = []
        } else {
            certList = res.data.items
        }
        
        return certList
    }

    /**
     * 
     * @param {*} namespaceName 
     * @param {*} certName 
     * @param {*} hostsArray 
     * @param {*} issuerName 
     * @param {*} isClusterIssuer 
     */
    async createCertManagerCertificate(namespaceName, certName, hostsArray, issuerName, isClusterIssuer) {
        await axios.post(`https://${this.K3S_API_SERVER}/apis/cert-manager.io/v1/namespaces/${namespaceName}/certificates`, {
            apiVersion: "cert-manager.io/v1",
            kind: "Certificate",
            metadata: {
                name: certName,
                namespace: namespaceName
            },
            spec: {
                secretName: certName,
                duration: "2160h",
                renewBefore: "360h",
                dnsNames: hostsArray,
                issuerRef: {
                    name: issuerName,
                    kind: isClusterIssuer ? "ClusterIssuer" : "Issuer"
                }
            }
        }, this.k8sAxiosHeader)
    }

    /**
     * 
     * @param {*} namespaceName 
     * @param {*} certName 
     */
     async deleteCertManagerCertificate(namespaceName, certName) {
        await axios.delete(`https://${this.K3S_API_SERVER}/apis/cert-manager.io/v1/namespaces/${namespaceName}/certificates/${certName}`, this.k8sAxiosHeader)
     }

    /**
     * getCertManagerIssuers
     * 
     * @param {*} namespaceName 
     * @param {*} issuerName 
     * @returns 
     */
     async getCertManagerIssuers(namespaceName, issuerName) {
        const myUrlWithParams = new URL(`https://${this.K3S_API_SERVER}/apis/cert-manager.io/v1/namespaces/${namespaceName}/issuers`)
        const resIssuers = await axios.get(myUrlWithParams.href, this.k8sAxiosHeader)
        resIssuers.data.items = resIssuers.data.items.filter(issuer => issuer.metadata.namespace != "cert-manager")
        if(issuerName) {
            const namedIssuer = resIssuers.data.items.find(crt => crt.metadata.name == issuerName)
            if(namedIssuer) return [namedIssuer]
            else return []
        } else {
            return resIssuers.data.items
        }
    }

    /**
     * deleteCertManagerIssuer
     * @param {*} namespaceName 
     * @param {*} issuerName 
     */
    async deleteCertManagerIssuer(namespaceName, issuerName) {
        await axios.delete(`https://${this.K3S_API_SERVER}/apis/cert-manager.io/v1/namespaces/${namespaceName}/issuers/${issuerName}`, this.k8sAxiosHeader)
    }

    /**
     * getCertManagerClusterIssuers
     * 
     * @param {*} issuerName 
     * @returns 
     */
    async getCertManagerClusterIssuers(issuerName) {
        const myUrlWithParams = new URL(`https://${this.K3S_API_SERVER}/apis/cert-manager.io/v1/clusterissuers`)
        const resClusterIssuers = await axios.get(myUrlWithParams.href, this.k8sAxiosHeader)

        if(issuerName) {
            const allIssuers = []
            const namedClusterIssuer = resClusterIssuers.data.items.find(crt => crt.metadata.name == issuerName)
            if(namedClusterIssuer) allIssuers.push(namedClusterIssuer)
            return allIssuers
        } else {
            return resClusterIssuers.data.items
        }
    }

    /**
     * deleteCertManagerClusterIssuer
     * @param {*} issuerName 
     */
     async deleteCertManagerClusterIssuer(issuerName) {
        await axios.delete(`https://${this.K3S_API_SERVER}/apis/cert-manager.io/v1/clusterissuers/${issuerName}`, this.k8sAxiosHeader)
    }

    /**
     * getIstioGateways
     * 
     * @param {*} namespaceName 
     * @param {*} gatewayName 
     * @returns 
     */
    async getIstioGateways(namespaceName, gatewayName) {
        const myUrlWithParams = new URL(`https://${this.K3S_API_SERVER}/apis/networking.istio.io/v1beta1/namespaces/${namespaceName}/gateways`)
        const res = await axios.get(myUrlWithParams.href, this.k8sAxiosHeader)
        if(gatewayName) {
            const allGateways = []
            const namedGateway = res.data.items.find(gtw => gtw.metadata.name == gatewayName)
            if(namedGateway) allGateways.push(namedGateway)
            return allGateways
        } else {
            return res.data.items
        }
    }

    /**
     * createIstioGateway
     * 
     * @param {*} namespaceName 
     * @param {*} gatewayName 
     * @param {*} gatewayServers 
     */
     async createIstioGateway(namespaceName, gatewayName, gatewayServers) {
        await axios.post(
            `https://${this.K3S_API_SERVER}/apis/networking.istio.io/v1beta1/namespaces/${namespaceName}/gateways`,
            {
                apiVersion: 'networking.istio.io/v1beta1',
                kind: 'Gateway',
                metadata: {
                    name: gatewayName,
                },
                spec: {
                    selector: {
                        istio: "ingressgateway"
                    },
                    servers: gatewayServers
                }
            },
            this.k8sAxiosHeader
        )
    }

    /**
     * updateIstioGateway
     * 
     * @param {*} namespaceName 
     * @param {*} gatewayName 
     * @param {*} gatewayServers 
     */
    async updateIstioGateway(namespaceName, gatewayName, resourceVersion, gatewayServers) {
        await axios.put(
            `https://${this.K3S_API_SERVER}/apis/networking.istio.io/v1beta1/namespaces/${namespaceName}/gateways/${gatewayName}`,
            {
                apiVersion: 'networking.istio.io/v1beta1',
                kind: 'Gateway',
                metadata: {
                    name: gatewayName,
                    resourceVersion: resourceVersion
                },
                spec: {
                    selector: {
                        istio: "ingressgateway"
                    },
                    servers: gatewayServers
                }
            },
            this.k8sAxiosHeader
        )
    }

    /**
     * deleteIstioGateway
     * 
     * @param {*} namespaceName 
     * @param {*} gatewayName 
     */
    async deleteIstioGateway(namespaceName, gatewayName) {
        await axios.delete(`https://${this.K3S_API_SERVER}/apis/networking.istio.io/v1beta1/namespaces/${namespaceName}/gateways/${gatewayName}`, this.k8sAxiosHeader)
    }

    /**
     * createWriteManyPvc
     * 
     * @param {*} namespace 
     * @param {*} name 
     * @param {*} size 
     */
    async createWriteManyPvc(namespace, name, size) {
        await axios.post(
            `https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespace}/persistentvolumeclaims`,
            {
                apiVersion: "v1",
                kind: "PersistentVolumeClaim",
                metadata: {
                    name: name
                },
                spec: {
                    accessModes: ["ReadWriteMany"],
                    storageClassName: "longhorn",
                    resources: {
                        requests: {
                            storage: size
                        }
                    }
                }
            },
            this.k8sAxiosHeader
        )
    }

    /**
     * deleteWriteManyPvc
     * 
     * @param {*} namespace 
     * @param {*} name 
     */
    async deleteWriteManyPvc(namespace, name) {
        await axios.delete(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespace}/persistentvolumeclaims/${name}`, this.k8sAxiosHeader)
    }

    /**
     * getWriteManyPvcs
     * 
     * @param {*} namespace 
     */
    async getWriteManyPvcs(namespace, pvcName) {
        const pvcList = await this.getPvcs(namespace, pvcName)
        return pvcList.filter(pvc => pvc.spec.accessModes.includes('ReadWriteMany'))
    }

    /**
     * getPvcs
     * 
     * @param {*} namespace 
     * @param {*} pvcName 
     * @returns 
     */
    async getPvcs(namespace, pvcName) {
        const res = await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespace}/persistentvolumeclaims`, this.k8sAxiosHeader)
        let pvcList
        if(pvcName) {
            const targetObj = res.data.items.find(pvc => pvc.metadata.name == pvcName)
            if(targetObj) pvcList = [targetObj]
            else pvcList = []
        } else {
            pvcList = res.data.items
        }
        
        return pvcList
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} deploymentName
     * @memberof KubeBase
     */
    async deleteDeployment(namespaceName, deploymentName) {
        await axios.delete(`https://${this.K3S_API_SERVER}/apis/apps/v1/namespaces/${namespaceName}/deployments/${deploymentName}`, this.k8sAxiosHeader)
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} appUuid
     * @return {*}
     * @memberof KubeBase
     */
    async getApplicationStatefulSet(namespaceName, appUuid) {
        const myUrlWithParams = new URL(`https://${this.K3S_API_SERVER}/apis/apps/v1/namespaces/${namespaceName}/statefulsets`)
        myUrlWithParams.searchParams.append('labelSelector', `appUuid=${appUuid}`)
        const res = await axios.get(myUrlWithParams.href, this.k8sAxiosHeader)
        return res.data
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @return {*}
     * @memberof KubeBase
     */
    async getApplicationStatefulSets(namespaceName) {
        const myUrlWithParams = new URL(`https://${this.K3S_API_SERVER}/apis/apps/v1/namespaces/${namespaceName}/statefulsets`)
        const res = await axios.get(myUrlWithParams.href, this.k8sAxiosHeader)
        return res.data
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} statefullsetName
     * @memberof KubeBase
     */
    async deleteStatefulSet(namespaceName, statefullsetName) {
        await axios.delete(`https://${this.K3S_API_SERVER}/apis/apps/v1/namespaces/${namespaceName}/statefulsets/${statefullsetName}`, this.k8sAxiosHeader)
    }

    /**
     *
     *
     * @return {*}
     * @memberof KubeBase
     */
    async getNamespaces() {
        const res = await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces`, this.k8sAxiosHeader)
        return res.data.items
    }

    /**
     *
     *
     * @param {*} name
     * @return {*}
     * @memberof KubeBase
     */
    async hasNamespace(name) {
        const res = await this.getNamespaces()
        return res.find((n) => n.metadata.name == name) ? true : false
    }

    /**
     *
     *
     * @param {*} data
     * @memberof KubeBase
     */
    async createNamespace(data) {
        const res = await axios.get(`https://${this.K3S_API_SERVER}/api/v1/namespaces`, this.k8sAxiosHeader)
        let namespaceName = data.name.trim().toLowerCase().replaceAll(' ', '_')
        if (res.data.items.find((ns) => ns.metadata.name.trim().toLowerCase() == namespaceName)) {
            throw new Error(`ERROR: The namespace "${data.name}" already exists`)
        }

        const nsJson = {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
                name: namespaceName,
                labels: {},
            },
        }
        if (!data.skipSidecar) {
            nsJson.metadata.labels['istio-injection'] = 'enabled'
        }

        // Create namespace
        await axios.post(`https://${this.K3S_API_SERVER}/api/v1/namespaces`, nsJson, this.k8sAxiosHeader)

        // Create Roles for admin & non admin user profiles in namespace
        await axios.post(`https://${this.K3S_API_SERVER}/apis/rbac.authorization.k8s.io/v1/namespaces/${namespaceName}/roles`, this.buildTmplNSAdminRoles(namespaceName), this.k8sAxiosHeader)
        await axios.post(`https://${this.K3S_API_SERVER}/apis/rbac.authorization.k8s.io/v1/namespaces/${namespaceName}/roles`, this.buildTmplNSUserRoles(namespaceName), this.k8sAxiosHeader)
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} secretName
     * @param {*} user
     * @param {*} pass
     * @memberof KubeBase
     */
    async createRegistrySecret(namespaceName, secretName, user, pass) {
        // Create private registry credentials secret
        let secretDataString = `{"auths":{"registry.${this.rootDomain}":{"username":"${user}","password":"${pass}","auth":"${Buffer.from(`${user}:${pass}`, 'utf-8').toString('base64')}"}}}`
        await axios.post(
            `https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/secrets`,
            {
                apiVersion: 'v1',
                data: {
                    '.dockerconfigjson': Buffer.from(secretDataString, 'utf-8').toString('base64'),
                },
                kind: 'Secret',
                metadata: {
                    name: secretName,
                },
                type: 'kubernetes.io/dockerconfigjson',
            },
            this.k8sAxiosHeader
        )
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @memberof KubeBase
     */
    async deleteNamespace(namespaceName) {
        await axios.delete(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}`, this.k8sAxiosHeader)
    }

    /**
     *
     *
     * @param {*} namespaceName
     * @param {*} podName
     * @memberof KubeBase
     */
    async deletePod(namespaceName, podName) {
        await axios.delete(`https://${this.K3S_API_SERVER}/api/v1/namespaces/${namespaceName}/pods/${podName}`, this.k8sAxiosHeader)
    }

    /**
     *
     *
     * @param {*} namespace
     * @param {*} chartName
     * @param {*} values
     * @param {*} chart
     * @param {*} version
     * @memberof KubeBase
     */
    async helmInstall(namespace, chartName, values, chart, version) {
        try {
            fs.writeFileSync('./values.yaml', YAML.stringify(values))
            await terminalCommand(`${this.HELM_BASE_CMD} upgrade --install -n ${namespace} ${version ? `--version ${version}` : ''} --values ./values.yaml  ${chartName} ${chart} --atomic`)
        } finally {
            if (fs.existsSync('./values.yaml')) {
                fs.rmSync('./values.yaml', { force: true })
            }
        }
    }

    /**
     * 
     * 
     * @param {*} namespace 
     * @param {*} yamlData 
     */
    async kubectlApply(namespace, yamlData) {
        try {
            fs.writeFileSync('./values.yaml', yamlData)
            if(namespace)
                await terminalCommand(`kubectl apply -n ${namespace} -f ./values.yaml`)
            else
                await terminalCommand(`kubectl apply -f ./values.yaml`)
        } finally {
            if (fs.existsSync('./values.yaml')) {
                fs.rmSync('./values.yaml', { force: true })
            }
        }
    }

    /**
     * 
     * 
     * @param {*} namespace 
     * @param {*} yamlData 
     */
     async kubectlDelete(namespace, yamlData) {
        try {
            fs.writeFileSync('./values.yaml', YAML.stringify(yamlData))
            if(namespace)
                await terminalCommand(`kubectl delete -n ${namespace} -f ./values.yaml`)
            else
                await terminalCommand(`kubectl delete -f ./values.yaml`)
        } finally {
            if (fs.existsSync('./values.yaml')) {
                fs.rmSync('./values.yaml', { force: true })
            }
        }
    }

    /**
     *
     *
     * @param {*} namespace
     * @param {*} chartName
     * @return {*}
     * @memberof KubeBase
     */
    async getHelmChartValues(namespace, chartName) {
        const result = await terminalCommand(`${this.HELM_BASE_CMD} get values ${chartName} ${namespace == "*" ? "-A" : "-n " + namespace}`)
        return result[1] == "null" ? "" : YAML.parse(result.join('\n'))
    }

    /**
     *
     *
     * @param {*} namespace
     * @param {*} chartName
     * @memberof KubeBase
     */
    async helmUninstall(namespace, chartName) {
        await terminalCommand(`${this.HELM_BASE_CMD} delete ${chartName} -n ${namespace} --wait`)
    }

    /**
     *
     *
     * @param {*} namespace
     * @param {*} values
     * @param {*} processId
     * @memberof KubeBase
     */
    async mdosGenericHelmInstall(namespace, values, processId) {
        let nsCreated = await this.hasNamespace(namespace)
        let doCreateNs = false
        if (!nsCreated) {
            await this.createNamespace({ name: namespace, skipSidecar: true })
            doCreateNs = true
        }

        fs.writeFileSync('./values.yaml', YAML.stringify(values))

        try {
            await this._asyncChildHelmDeploy(
                `${this.HELM_BASE_CMD} upgrade --install -n ${namespace} --values ./values.yaml ${values.appName} ${this.genericHelmChartPath} --timeout 10m0s --atomic`,
                processId,
                values.tenantName,
                values.uuid,
                values.appName
            )
        } catch (error) {
            if (doCreateNs) {
                try {
                    await this.deleteNamespace(namespace)
                } catch (_e) {}
            }
            throw error
        } finally {
            if (fs.existsSync('./values.yaml')) {
                fs.rmSync('./values.yaml', { force: true })
            }
        }
    }

    /**
     *
     *
     * @param {*} cmd
     * @param {*} processId
     * @param {*} namespace
     * @param {*} appUuid
     * @param {*} appName
     * @return {*}
     * @memberof KubeBase
     */
    _asyncChildHelmDeploy(cmd, processId, namespace, appUuid, appName) {
        return new Promise((resolve, reject) => {
            let hasErrors = false
            let wasCanceled = false
            let checkClientAvailInterval = null
            let grabStatusInterval = null
            const errArray = []

            const deployedAtDate = new Date().getTime() - 1000

            // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
            // Start async deployment and monitor outputs
            // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

            const helmChild = terminalCommandAsync(
                cmd,
                // On STDOUT
                function (_processId, msg) {
                    this.app.get('socketManager').emit(_processId, {
                        raw: true,
                        stdout: msg,
                    })
                }.bind(this, processId),
                // On STDERR
                function (_processId, errMsg) {
                    this.app.get('socketManager').emit(_processId, {
                        raw: true,
                        stderr: errMsg,
                    })
                    errArray.push(errMsg)
                    hasErrors = true
                }.bind(this, processId),
                // On DONE
                function (_processId, _namespace, _appUuid, _appName, _deployedAtDate) {
                    if (checkClientAvailInterval) clearInterval(checkClientAvailInterval)
                    if (grabStatusInterval) clearInterval(grabStatusInterval)
                    if (hasErrors) {
                        reject(errArray)
                    } else if (wasCanceled) {
                        reject(['Deployment canceled by client'])
                    } else {
                        // Success, we get the pod logs and send them over to client for final display
                        this._getAppLogs(null, _namespace, _appUuid, _appName, _deployedAtDate)
                            .then(
                                function (__processId, allAppLogs) {
                                    this._broadcastToClient(__processId, {
                                        raw: true,
                                        appLogs: allAppLogs,
                                    })
                                    resolve()
                                }.bind(this, _processId)
                            )
                            .catch(function (err) {
                                console.log('ERROR', err)
                                resolve()
                            })
                    }
                }.bind(this, processId, namespace, appUuid, appName, deployedAtDate)
            )

            // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
            // Make sure client CLI still alive before deployment
            // done, otherwise terminate & rollback deployment
            // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

            checkClientAvailInterval = setInterval(
                function (_processId, _namespace, _appUuid, _appName, _deployedAtDate, _helmChild) {
                    if (!this.app.get('socketManager').isClientAlive(_processId)) {
                        wasCanceled = true
                        clearInterval(checkClientAvailInterval)
                        clearInterval(grabStatusInterval)
                        _helmChild.kill('SIGINT')

                        // In case of crash loop backoff errors, killing the HELM process is sometimes not enougth.
                        // We also need to delete the deployments / statefullsets. Therefore, we wait 3 seconds,
                        // get deployments associated to this appUuid and delete it manually if still hannging around
                        setTimeout(
                            function (__namespace, __appUuid, __appName, __deployedAtDate) {
                                // Make sure deployments get deleted
                                this.getApplicationDeployment(__namespace, __appUuid)
                                    .then(
                                        function (___namespace, deploymentResult) {
                                            // Make sure we dont target existing previous deployments
                                            const fDeployments = deploymentResult.items.filter((dep) => {
                                                return dep.metadata.creationTimestamp ? new Date(dep.metadata.creationTimestamp).getTime() >= __deployedAtDate : false
                                            })
                                            // Now delete if any left
                                            for (const deployment of fDeployments) {
                                                this.deleteDeployment(___namespace, deployment.metadata.name)
                                                    .then(() => {})
                                                    .catch((_e) => {})
                                            }
                                        }.bind(this, __namespace)
                                    )
                                    .catch((_e) => {})
                                // Make sure statefullsets get deleted
                                this.getApplicationStatefulSet(__namespace, __appUuid)
                                    .then(
                                        function (___namespace, statefulSetsResult) {
                                            // Make sure we dont target existing previous deployments
                                            const fStatefulSets = statefulSetsResult.items.filter((sts) => {
                                                return sts.metadata.creationTimestamp ? new Date(sts.metadata.creationTimestamp).getTime() >= __deployedAtDate : false
                                            })
                                            // Now delete if any left
                                            for (const statefullset of fStatefulSets) {
                                                this.deleteStatefulSet(___namespace, statefullset.metadata.name)
                                                    .then(() => {})
                                                    .catch((_e) => {})
                                            }
                                        }.bind(this, __namespace)
                                    )
                                    .catch((_e) => {})
                            }.bind(this, _namespace, _appUuid, _appName, _deployedAtDate),
                            3000
                        )
                    }
                }.bind(this, processId, namespace, appUuid, appName, deployedAtDate, helmChild),
                1000
            )

            // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
            // Retrieve all pod status list and send back to
            // client CLI in case of any changes in statuses
            // Also collect latest pod logs to return to user
            // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

            const podsCurrentStatus = {}
            grabStatusInterval = setInterval(
                function (_processId, _namespace, _appUuid, _appName, _deployedAtDate) {
                    // Get all pods for the application Uuid in this namespace
                    this.getApplicationPods(_namespace, _appUuid)
                        .then(
                            function (__processId, __namespace, __appUuid, __appName, __deployedAtDate, podsResponse) {
                                // Filter out pods to keep only the new once we are trying to deploy
                                const cPods = podsResponse.items.filter((pod) => {
                                    return pod.metadata.creationTimestamp ? new Date(pod.metadata.creationTimestamp).getTime() >= __deployedAtDate : false
                                })

                                let changed = false

                                // Now iterate over those pods to get detailes status information
                                for (const podResponse of cPods) {
                                    // Process Pod status
                                    if (podResponse.status) {
                                        const podLiveStatus = {
                                            name: podResponse.metadata.labels.app,
                                            phase: podResponse.status.phase ? podResponse.status.phase : 'n/a',
                                            initContainerStatuses: [],
                                            containerStatuses: [],
                                        }

                                        // First, init containers if any
                                        if (podResponse.status.initContainerStatuses) {
                                            // Ignore istio-init container
                                            for (const containerStatus of podResponse.status.initContainerStatuses.filter((p) => p.name != 'istio-init')) {
                                                if (containerStatus.state) {
                                                    const stateKeys = Object.keys(containerStatus.state)
                                                    if (stateKeys.length == 1) {
                                                        const stateName = stateKeys[0]
                                                        podLiveStatus.initContainerStatuses.push({
                                                            name: containerStatus.name,
                                                            state: stateName,
                                                            reason: containerStatus.state[stateName].reason ? containerStatus.state[stateName].reason : null,
                                                            message: containerStatus.state[stateName].message ? containerStatus.state[stateName].message : null,
                                                            ready: containerStatus.ready,
                                                        })
                                                    }
                                                }
                                            }
                                        }

                                        // Now all other containers
                                        if (podResponse.status.containerStatuses) {
                                            // Ignore istio-proxy container
                                            for (const containerStatus of podResponse.status.containerStatuses.filter((p) => p.name != 'istio-proxy')) {
                                                if (containerStatus.state) {
                                                    const stateKeys = Object.keys(containerStatus.state)
                                                    if (stateKeys.length == 1) {
                                                        const stateName = stateKeys[0]
                                                        podLiveStatus.containerStatuses.push({
                                                            name: containerStatus.name,
                                                            state: stateName,
                                                            reason: containerStatus.state[stateName].reason ? containerStatus.state[stateName].reason : null,
                                                            message: containerStatus.state[stateName].message ? containerStatus.state[stateName].message : null,
                                                            ready: containerStatus.ready,
                                                            started: containerStatus.started ? containerStatus.started : false,
                                                        })
                                                    }
                                                }
                                            }
                                        }

                                        // Save current status data in memory for later comparison
                                        if (!podsCurrentStatus[podResponse.metadata.name]) {
                                            podsCurrentStatus[podResponse.metadata.name] = podLiveStatus
                                            changed = true
                                        } else if (JSON.stringify(podsCurrentStatus[podResponse.metadata.name]) != JSON.stringify(podLiveStatus)) {
                                            podsCurrentStatus[podResponse.metadata.name] = podLiveStatus
                                            changed = true
                                        }
                                    }
                                }

                                // Collect logs
                                this._getAppLogs(cPods, __namespace, __appUuid, __appName, __deployedAtDate)
                                    .then(
                                        function (___processId, allAppLogs) {
                                            this._broadcastToClient(___processId, {
                                                raw: true,
                                                appLogs: allAppLogs,
                                            })
                                        }.bind(this, __processId)
                                    )
                                    .catch(function (err) {
                                        console.log('ERROR', err)
                                    })

                                // Status has changed, broadcast to CLI
                                if (changed) {
                                    this._broadcastToClient(__processId, {
                                        raw: true,
                                        deployStatus: podsCurrentStatus,
                                    })
                                }
                            }.bind(this, _processId, _namespace, _appUuid, _appName, _deployedAtDate)
                        )
                        .catch(
                            function (processId, err) {
                                console.log('PODS list & status lookup error:', err)
                            }.bind(this, _processId)
                        )
                }.bind(this, processId, namespace, appUuid, appName, deployedAtDate),
                2000
            )
        })
    }

    /**
     *
     *
     * @param {*} processId
     * @param {*} data
     * @memberof KubeBase
     */
    _broadcastToClient(processId, data) {
        if (this.app.get('socketManager').isClientAlive(processId)) {
            this.app.get('socketManager').emit(processId, data)
        }
    }

    /**
     *
     *
     * @param {*} cPods
     * @param {*} namespace
     * @param {*} appUuid
     * @param {*} appName
     * @param {*} deployedAtDate
     * @return {*}
     * @memberof KubeBase
     */
    async _getAppLogs(cPods, namespace, appUuid, appName, deployedAtDate) {
        let appLogs = {}
        if (!cPods) {
            const appPodResponse = await this.getApplicationPods(namespace, appUuid)

            // Filter out pods to keep only the new once we are trying to deploy
            cPods = appPodResponse.items.filter((pod) => {
                return pod.metadata.creationTimestamp ? new Date(pod.metadata.creationTimestamp).getTime() >= deployedAtDate : false
            })
        }

        if (cPods.length == 0) return appLogs

        for (const podResponse of cPods) {
            // Now get pod logs
            const logObjects = await this._getAppPodLogs(namespace, appName, podResponse)
            appLogs = { ...appLogs, ...logObjects }
        }
        return appLogs
    }

    /**
     *
     *
     * @param {*} namespace
     * @param {*} appUuid
     * @param {*} appName
     * @param {*} podResponse
     * @return {*}
     * @memberof KubeBase
     */
    async _getAppPodLogs(namespace, appName, podResponse) {
        const podLogs = {}
        if (podResponse.status.phase != 'Pending') {
            const initContainerNames = podResponse.spec.initContainers.map((c) => c.name).filter((n) => n != 'istio-init')
            const containerNames = podResponse.spec.containers.map((c) => c.name).filter((n) => n != 'istio-proxy')

            for (let icname of initContainerNames) {
                const logs = await this.getPodLogs(namespace, podResponse.metadata.name, icname)
                podLogs[`${appName}::${podResponse.metadata.labels.app}::${icname}`] = logs
            }

            for (let cname of containerNames) {
                const logs = await this.getPodLogs(namespace, podResponse.metadata.name, cname)
                podLogs[`${appName}::${podResponse.metadata.labels.app}::${cname}`] = logs
            }
        }
        return podLogs
    }

    /**
     * buildTmplNSAdminRoles
     * @param {*} namespaceName
     */
    buildTmplNSAdminRoles(namespaceName) {
        let adminReadRules = this.getAdminReadRolesRBAC()
        let adminWriteRules = this.getAdminWriteRolesRBAC()
        if(adminReadRules.length > 0) {
            adminReadRules = adminReadRules.map((rule) => {
                rule.verbs = ['get', 'list', 'watch']
                return rule
            })
        }
        if(adminWriteRules.length > 0) {
            adminWriteRules = adminWriteRules.map((rule) => {
                rule.verbs = ['create', 'update', 'patch', 'delete']
                return rule
            })
        }
        return {
            kind: 'Role',
            apiVersion: 'rbac.authorization.k8s.io/v1',
            metadata: {
                namespace: namespaceName,
                name: 'ns-admin',
            },
            rules: [...adminReadRules, ...adminWriteRules],
        }
    }

    /**
     * buildTmplNSUserRoles
     * @param {*} namespaceName
     */
    buildTmplNSUserRoles(namespaceName) {
        let userReadRules = this.getUserReadRolesRBAC()
        let userWriteRules = this.getUserWriteRolesRBAC()
        if(userReadRules.length > 0) {
            userReadRules = userReadRules.map((rule) => {
                rule.verbs = ['get', 'list', 'watch']
                return rule
            })
        }
        if(userWriteRules.length > 0) {
            userWriteRules = userWriteRules.map((rule) => {
                rule.verbs = ['create', 'update', 'patch', 'delete']
                return rule
            })
        }
        return {
            kind: 'Role',
            apiVersion: 'rbac.authorization.k8s.io/v1',
            metadata: {
                namespace: namespaceName,
                name: 'ns-user',
            },
            rules: [...userReadRules, ...userWriteRules],
        }
    }

    /**
     * buildTmplNSAdminRoleBindings
     * @param {*} namespaceName
     * @param {*} userEmails
     */
    buildTmplNSAdminRoleBindings(namespaceName, userEmails) {
        return {
            kind: 'RoleBinding',
            apiVersion: 'rbac.authorization.k8s.io/v1',
            metadata: {
                name: 'ns-admin',
                namespace: namespaceName,
            },
            subjects: userEmails.map((ue) => {
                return {
                    kind: 'User',
                    name: ue,
                    apiGroup: 'rbac.authorization.k8s.io',
                }
            }),
            roleRef: {
                name: 'ns-admin',
                kind: 'Role',
                apiGroup: 'rbac.authorization.k8s.io',
            },
        }
    }

    /**
     * buildTmplNSUserRoleBindings
     * @param {*} namespaceName
     * @param {*} userEmails
     */
    buildTmplNSUserRoleBindings(namespaceName, userEmails) {
        return {
            kind: 'RoleBinding',
            apiVersion: 'rbac.authorization.k8s.io/v1',
            metadata: {
                name: 'ns-user',
                namespace: namespaceName,
            },
            subjects: userEmails.map((ue) => {
                return {
                    kind: 'User',
                    name: ue,
                    apiGroup: 'rbac.authorization.k8s.io',
                }
            }),
            roleRef: {
                name: 'ns-user',
                kind: 'Role',
                apiGroup: 'rbac.authorization.k8s.io',
            },
        }
    }

    /**
     * applyNamespaceAdminRoleBindings
     * @param {*} namespace
     * @param {*} users
     */
    async applyNamespaceAdminRoleBindings(namespace, users) {
        const existingRoleBindings = await axios.get(`https://${this.K3S_API_SERVER}/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings`, this.k8sAxiosHeader)
        if (existingRoleBindings.data.items.find((rb) => rb.metadata.name == 'ns-admin')) {
            await axios.put(
                `https://${this.K3S_API_SERVER}/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/ns-admin`,
                this.buildTmplNSAdminRoleBindings(namespace, users),
                this.k8sAxiosHeader
            )
        } else {
            await axios.post(
                `https://${this.K3S_API_SERVER}/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings`,
                this.buildTmplNSAdminRoleBindings(namespace, users),
                this.k8sAxiosHeader
            )
        }
    }

    /**
     * applyNamespaceUserRoleBindings
     * @param {*} namespace
     * @param {*} users
     */
    async applyNamespaceUserRoleBindings(namespace, users) {
        const existingRoleBindings = await axios.get(`https://${this.K3S_API_SERVER}/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings`, this.k8sAxiosHeader)
        if (existingRoleBindings.data.items.find((rb) => rb.metadata.name == 'ns-user')) {
            await axios.put(
                `https://${this.K3S_API_SERVER}/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/ns-user`,
                this.buildTmplNSUserRoleBindings(namespace, users),
                this.k8sAxiosHeader
            )
        } else {
            await axios.post(
                `https://${this.K3S_API_SERVER}/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings`,
                this.buildTmplNSUserRoleBindings(namespace, users),
                this.k8sAxiosHeader
            )
        }
    }
}

module.exports = KubeBase
