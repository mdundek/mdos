import { Flags, CliUx } from '@oclif/core'
import Command from '../base'
const { error, success, info } = require('../lib/tools')
const axios = require('axios')
const https = require('https')
const fs = require('fs')
const os = require('os')
const YAML = require('yaml')
const inquirer = require('inquirer')
const urlExists = require('url-exists-deep')

/**
 * Command
 *
 * @export
 * @class InstallFramework
 * @extends {Command}
 */
export default class InstallFramework extends Command {
    static description = 'Install MDos framework to your kubernetes cluster'

    // ******* FLAGS *******
    static flags = {}
    kubeApiUrl: any
    ingressClass!: string
    storageClass!: string
    hostName!: string
    tlsCert!: string
    tlsKey!: string
    // *********************

    // *********************
    // ******* MAIN ********
    // *********************
    public async run(): Promise<void> {
        const { flags } = await this.parse(InstallFramework)

        try {
            // Authenticate axios
            await this.prepAxiosForKubeAuth()

            // Select ingress class
            await this.selectMdosIngressClass()

            // Select storage class
            await this.selectStorageClass()

            // API Domain and cert
            await this.selectApiDomainName()
        } catch (err) {
            error('Could not deploy mdos')
            process.exit(1)
        }

        console.log()
        try {
            CliUx.ux.action.start('Installing MDos API server')

            // 1. Create namespace
            await this.createMdosNamespace()

            // 2. Create cluster role bindings
            await this.createMdosSaAndRoleBindings()

            // 3. Install broker
            await this.createMdosBroker()

            // // 4. Install MDos
            await this.createMdosApi()

            CliUx.ux.action.stop()

        } catch (err) {
            CliUx.ux.action.stop('error')
            error('Could not deploy mdos')
            process.exit(1)
        }

        CliUx.ux.action.start('Waiting for MDos to start')
        let mdosUrl = null
        try {
            // 5. Wait for mdos app to be up and running
            await this.waitForMdosUpAndRunning()

            // Configure CLI
            const httpsMatch = await urlExists(`https://${this.hostName}`)
            
            if (!httpsMatch) {
                const httpMatch = await urlExists(`http://${this.hostName}`)
                if (!httpMatch) {
                    error(`The domain name "${this.hostName}" does not seem to be configured to reach your cluster.`)
                    process.exit(1)
                } else {
                    mdosUrl = `http://${this.hostName}`
                }
            } else {
                mdosUrl = `https://${this.hostName}`
            }
            CliUx.ux.action.stop()
        } catch (error) {
            CliUx.ux.action.stop('Error')
            error('MDos did not manage to start successfully.')
            process.exit(1)
        }

        try {
            CliUx.ux.action.start('Configure your CLI endpoint')
            await this.setApiEndpoint(mdosUrl)
            CliUx.ux.action.stop()
            
            success('MDos was installed successfully')
        } catch (error) {
            CliUx.ux.action.stop('Error')
            this.showError(error)
            process.exit(1)
        }
    }

    /**
     * prepAxiosForKubeAuth
     */
    async prepAxiosForKubeAuth() {
        let kubeConfigPath = null

        // Build kubeconfig file location
        if (os.platform() === 'linux' || os.platform() === 'darwin') {
            kubeConfigPath = `${os.homedir()}/.kube/config`
        } else if (os.platform() === 'win32') {
            kubeConfigPath = `${os.homedir()}\.kube\config`
        } else {
            error('Unsupported platform')
            process.exit(1)
        }

        // Make sure it exists
        if (!fs.existsSync(kubeConfigPath)) {
            error('Kubeconfig file not found. Did you install and configure your kubeconfig file?')
            process.exit(1)
        }

        let kubeConfig: any
        let context: any
        let cluster: any
        let user: any
        try {
            // Load it
            const kubeConfigYaml = fs.readFileSync(kubeConfigPath, 'utf-8')
            kubeConfig = YAML.parse(kubeConfigYaml)

            if (!kubeConfig['current-context'] || kubeConfig['current-context'].length == 0) {
                error('Kubeconfig has no default context set. Configure your kubeconfig file and try again')
                process.exit(1)
            }

            context = kubeConfig.contexts.find((c: any) => c.name == kubeConfig['current-context']).context
            cluster = kubeConfig.clusters.find((c: any) => c.name == context.cluster).cluster
            user = kubeConfig.users.find((u: any) => u.name == context.user).user
        } catch (err) {
            error('Could not parse kubeconfig file')
            process.exit(1)
        }

        // Now call API
        axios.defaults.httpsAgent = new https.Agent({
            rejectUnauthorized: false,
            cert: Buffer.from(user['client-certificate-data'], 'base64').toString('utf-8'),
            key: Buffer.from(user['client-key-data'], 'base64').toString('utf-8'),
        })

        info(`Target cluster URL: ${cluster.server}`)

        const confirmResponse = await inquirer.prompt([
            {
                name: 'confirm',
                message: 'Install MDos onto this cluster?',
                type: 'confirm',
                default: false,
            },
        ])
        if (!confirmResponse.confirm) process.exit()

        this.kubeApiUrl = cluster.server
    }

    /**
     * createMdosNamespace
     */
    async createMdosNamespace() {
        const res = await axios.get(`${this.kubeApiUrl}/api/v1/namespaces`)
        const mdosExists = res.data.items.find((obj: any) => obj.metadata.name == 'mdos')
        if (!mdosExists) {
            await axios.post(`${this.kubeApiUrl}/api/v1/namespaces`, {
                apiVersion: 'v1',
                kind: 'Namespace',
                metadata: {
                    name: 'mdos',
                },
            })
        }
    }

    /**
     * createMdosSaAndRoleBindings
     */
    async createMdosSaAndRoleBindings() {
        try {
            await axios.get(`${this.kubeApiUrl}/api/v1/namespaces/mdos/secrets/default`)
        } catch (error) {
            await axios.post(`${this.kubeApiUrl}/api/v1/namespaces/mdos/secrets`, {
                apiVersion: 'v1',
                kind: 'Secret',
                metadata: {
                    name: 'default',
                    annotations: {
                        'kubernetes.io/service-account.name': 'default',
                    },
                },
                type: 'kubernetes.io/service-account-token',
            })
        }

        try {
            await axios.get(`${this.kubeApiUrl}/apis/rbac.authorization.k8s.io/v1/clusterroles/mdos-admin-role`)
        } catch (error) {
            await axios.post(`${this.kubeApiUrl}/apis/rbac.authorization.k8s.io/v1/clusterroles`, {
                apiVersion: 'rbac.authorization.k8s.io/v1',
                kind: 'ClusterRole',
                metadata: {
                    name: 'mdos-admin-role',
                },
                rules: [
                    {
                        apiGroups: ['*'],
                        resources: ['*'],
                        verbs: ['*'],
                    },
                    {
                        nonResourceURLs: ['*'],
                        verbs: ['*'],
                    },
                ],
            })
        }

        try {
            await axios.get(`${this.kubeApiUrl}/apis/rbac.authorization.k8s.io/v1/clusterrolebindings/scds-admin-role-binding`)
        } catch (error) {
            await axios.post(`${this.kubeApiUrl}/apis/rbac.authorization.k8s.io/v1/clusterrolebindings`, {
                apiVersion: 'rbac.authorization.k8s.io/v1',
                kind: 'ClusterRoleBinding',
                metadata: {
                    name: 'scds-admin-role-binding',
                },
                roleRef: {
                    kind: 'ClusterRole',
                    name: 'mdos-admin-role',
                    apiGroup: 'rbac.authorization.k8s.io',
                },
                subjects: [
                    {
                        kind: 'ServiceAccount',
                        name: 'default',
                        namespace: 'mdos',
                    },
                ],
            })
        }
    }

    /**
     * selectMdosIngressClass
     */
    async selectMdosIngressClass() {
        let ingressClassRes = await axios.get(`${this.kubeApiUrl}/apis/networking.k8s.io/v1/ingressclasses`)
        if (ingressClassRes.data.items.length == 0) {
            error('There are no ingress classes found on your cluster.')
            process.exit(1)
        } else if (ingressClassRes.data.items.length == 1) {
            this.ingressClass = ingressClassRes.data.items[0].metadata.name
        } else {
            const responseIngressSecretName = await inquirer.prompt({
                type: 'list',
                name: 'ingressName',
                message: 'What ingress class do you want to use for MDos?',
                choices: ingressClassRes.data.items.map((ingressClass: any) => {
                    return {
                        name: ingressClass.metadata.name,
                        value: ingressClass.metadata.name,
                    }
                }),
            })
            this.ingressClass = responseIngressSecretName.ingressName
        }
    }

    /**
     * selectApiDomainName
     */
    async selectApiDomainName() {
        // Select hostname ffor the API server ingress
        const responseMdosDomainName = await inquirer.prompt({
            type: 'input',
            name: 'hostName',
            message: 'What domain name should be used to expose your MDos API server through the Ingress controller:',
            validate: (value: string) => {
                if (value.trim().length == 0) return 'Mandatory field'
                return true
            },
        })
        this.hostName = responseMdosDomainName.hostName

        const confirmResponse = await inquirer.prompt([
            {
                name: 'confirm',
                message: 'Configure a TLS (HTTPS) certificate for this domain name?',
                type: 'confirm',
                default: false,
            },
        ])
        if (confirmResponse.confirm) {
            const crtResponses = await inquirer.prompt([
                {
                    name: 'crt',
                    message: 'Enter the path to your certificate "crt" file:',
                    type: 'input',
                    validate: (value: string) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        else if (!fs.existsSync(value)) return 'File not found'
                        return true
                    },
                },
                {
                    name: 'key',
                    message: 'Enter the path to your certificate "key" file:',
                    type: 'input',
                    validate: (value: string) => {
                        if (value.trim().length == 0) return 'Mandatory field'
                        else if (!fs.existsSync(value)) return 'File not found'
                        return true
                    },
                },
            ])

            this.tlsCert = fs.readFileSync(crtResponses.crt, 'utf8')
            this.tlsKey = fs.readFileSync(crtResponses.key, 'utf8')
        }
    }

    /**
     * selectStorageClass
     */
    async selectStorageClass() {
        let storageClassRes = await axios.get(`${this.kubeApiUrl}/apis/storage.k8s.io/v1/storageclasses`)
        if (storageClassRes.data.items.length == 0) {
            error('There are no storage classes found on your cluster.')
            process.exit(1)
        } else if (storageClassRes.data.items.length == 1) {
            this.storageClass = storageClassRes.data.items[0].metadata.name
        } else {
            const responseStorageClassName = await inquirer.prompt({
                type: 'list',
                name: 'storageClassName',
                message: 'What storage class do you want to use for MDos?',
                choices: storageClassRes.data.items.map((storageClass: any) => {
                    return {
                        name: storageClass.metadata.name,
                        value: storageClass.metadata.name,
                    }
                }),
            })
            this.storageClass = responseStorageClassName.storageClassName
        }
    }

    /**
     * createMdosBroker
     */
    async createMdosBroker() {
        // ConfigMap
        try {
            await axios.get(`${this.kubeApiUrl}/api/v1/namespaces/mdos/configmaps/mdos-broker-configs`)
            await axios.delete(`${this.kubeApiUrl}/api/v1/namespaces/mdos/configmaps/mdos-broker-configs`)
        } catch (error) {}
        await axios.post(`${this.kubeApiUrl}/api/v1/namespaces/mdos/configmaps`, {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: {
                name: 'mdos-broker-configs',
                labels: {
                    app: 'broker',
                    appUuid: 'KG75-7D58-mdos',
                    compUuid: 'KG75-7D58-broker',
                    tenantName: 'mdos',
                },
            },
            data: {
                SQLITE_FILE_PATH: '/usr/src/db/mdos_broker.sqlite',
            },
        })

        // Service
        try {
            await axios.get(`${this.kubeApiUrl}/api/v1/namespaces/mdos/services/mdos-broker-http`)
            await axios.delete(`${this.kubeApiUrl}/api/v1/namespaces/mdos/services/mdos-broker-http`)
        } catch (error) {}
        await axios.post(`${this.kubeApiUrl}/api/v1/namespaces/mdos/services`, {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: {
                name: 'mdos-broker-http',
                labels: {
                    app: 'broker',
                    appUuid: 'KG75-7D58-mdos',
                    compUuid: 'KG75-7D58-broker',
                    tenantName: 'mdos',
                },
            },
            spec: {
                type: 'ClusterIP',
                ports: [
                    {
                        targetPort: 3039,
                        port: 3039,
                        name: 'http-3039',
                    },
                ],
                selector: {
                    appUuid: 'KG75-7D58-mdos',
                    compUuid: 'KG75-7D58-broker',
                    app: 'broker',
                    tenantName: 'mdos',
                },
            },
        })

        // PersistentVolumeClaim
        try {
            await axios.get(`${this.kubeApiUrl}/api/v1/namespaces/mdos/persistentvolumeclaims/mdos-broker`)
        } catch (error) {
            await axios.post(`${this.kubeApiUrl}/api/v1/namespaces/mdos/persistentvolumeclaims`, {
                apiVersion: 'v1',
                kind: 'PersistentVolumeClaim',
                metadata: {
                    name: 'mdos-broker',
                    labels: {
                        app: 'broker',
                        appUuid: 'KG75-7D58-mdos',
                        compUuid: 'KG75-7D58-broker',
                        tenantName: 'mdos',
                    },
                },
                spec: {
                    accessModes: ['ReadWriteOnce'],
                    storageClassName: this.storageClass,
                    resources: {
                        requests: {
                            storage: '1Gi',
                        },
                    },
                },
            })
        }

        // Deployment
        try {
            await axios.get(`${this.kubeApiUrl}/apis/apps/v1/namespaces/mdos/deployments/mdos-broker`)
            await axios.delete(`${this.kubeApiUrl}/apis/apps/v1/namespaces/mdos/deployments/mdos-broker`)
        } catch (error) {}
        await axios.post(`${this.kubeApiUrl}/apis/apps/v1/namespaces/mdos/deployments`, {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: {
                name: 'mdos-broker',
                labels: {
                    app: 'broker',
                    appUuid: 'KG75-7D58-mdos',
                    compUuid: 'KG75-7D58-broker',
                    tenantName: 'mdos',
                },
            },
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: {
                        appUuid: 'KG75-7D58-mdos',
                        compUuid: 'KG75-7D58-broker',
                        app: 'broker',
                        tenantName: 'mdos',
                    },
                },
                template: {
                    metadata: {
                        labels: {
                            app: 'broker',
                            appUuid: 'KG75-7D58-mdos',
                            compUuid: 'KG75-7D58-broker',
                            tenantName: 'mdos',
                            date: '1668940129',
                        },
                    },
                    spec: {
                        containers: [
                            {
                                name: 'mdos-broker',
                                image: 'mdundek/mdos-broker:latest',
                                imagePullPolicy: 'Always',
                                env: [
                                    {
                                        name: 'SQLITE_FILE_PATH',
                                        valueFrom: {
                                            configMapKeyRef: {
                                                name: 'mdos-broker-configs',
                                                key: 'SQLITE_FILE_PATH',
                                            },
                                        },
                                    },
                                ],
                                ports: [
                                    {
                                        name: 'http-3039',
                                        containerPort: 3039,
                                    },
                                ],
                                volumeMounts: [
                                    {
                                        name: 'mdos-broker',
                                        mountPath: '/usr/src/db',
                                    },
                                ],
                            },
                        ],
                        volumes: [
                            {
                                name: 'mdos-broker',
                                persistentVolumeClaim: {
                                    claimName: 'mdos-broker',
                                },
                            },
                        ],
                    },
                },
            },
        })
    }

    /**
     * createMdosApi
     */
    async createMdosApi() {
        // ConfigMap
        try {
            await axios.get(`${this.kubeApiUrl}/api/v1/namespaces/mdos/configmaps/mdos-api-configs`)
            await axios.delete(`${this.kubeApiUrl}/api/v1/namespaces/mdos/configmaps/mdos-api-configs`)
        } catch (error) {}
        await axios.post(`${this.kubeApiUrl}/api/v1/namespaces/mdos/configmaps`, {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: {
                name: 'mdos-api-configs',
                labels: {
                    app: 'api',
                    appUuid: 'KG75-7D58-mdos',
                    compUuid: 'KG75-7D58-api',
                    tenantName: 'mdos',
                },
            },
            data: {
                GEN_HELM_PATH_PATH: '/usr/src/dep/mhc-generic',
                RUN_TARGET: 'pod',
                API_MODE: 'FRAMEWORK',
                BROKER_CLIENT: 'http://mdos-broker-http:3039',
            },
        })

        // Service
        try {
            await axios.get(`${this.kubeApiUrl}/api/v1/namespaces/mdos/services/mdos-api-http`)
            await axios.delete(`${this.kubeApiUrl}/api/v1/namespaces/mdos/services/mdos-api-http`)
        } catch (error) {}
        await axios.post(`${this.kubeApiUrl}/api/v1/namespaces/mdos/services`, {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: {
                name: 'mdos-api-http',
                labels: {
                    app: 'api',
                    appUuid: 'KG75-7D58-mdos',
                    compUuid: 'KG75-7D58-api',
                    tenantName: 'mdos',
                },
            },
            spec: {
                type: 'ClusterIP',
                ports: [
                    {
                        targetPort: 3030,
                        port: 3030,
                        name: 'http-3030',
                    },
                ],
                selector: {
                    appUuid: 'KG75-7D58-mdos',
                    compUuid: 'KG75-7D58-api',
                    app: 'api',
                    tenantName: 'mdos',
                },
            },
        })

        // Deployment
        try {
            await axios.get(`${this.kubeApiUrl}/apis/apps/v1/namespaces/mdos/deployments/mdos-api`)
            await axios.delete(`${this.kubeApiUrl}/apis/apps/v1/namespaces/mdos/deployments/mdos-api`)
        } catch (error) {}
        await axios.post(`${this.kubeApiUrl}/apis/apps/v1/namespaces/mdos/deployments`, {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: {
                name: 'mdos-api',
                labels: {
                    app: 'api',
                    appUuid: 'KG75-7D58-mdos',
                    compUuid: 'KG75-7D58-api',
                    tenantName: 'mdos',
                },
            },
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: {
                        appUuid: 'KG75-7D58-mdos',
                        compUuid: 'KG75-7D58-api',
                        app: 'api',
                        tenantName: 'mdos',
                    },
                },
                template: {
                    metadata: {
                        labels: {
                            app: 'api',
                            appUuid: 'KG75-7D58-mdos',
                            compUuid: 'KG75-7D58-api',
                            tenantName: 'mdos',
                            date: '1668940129',
                        },
                    },
                    spec: {
                        containers: [
                            {
                                name: 'mdos-api',
                                image: 'mdundek/mdos-api:latest',
                                imagePullPolicy: 'Always',
                                env: [
                                    {
                                        name: 'GEN_HELM_PATH_PATH',
                                        valueFrom: {
                                            configMapKeyRef: {
                                                name: 'mdos-api-configs',
                                                key: 'GEN_HELM_PATH_PATH',
                                            },
                                        },
                                    },
                                    {
                                        name: 'RUN_TARGET',
                                        valueFrom: {
                                            configMapKeyRef: {
                                                name: 'mdos-api-configs',
                                                key: 'RUN_TARGET',
                                            },
                                        },
                                    },
                                    {
                                        name: 'API_MODE',
                                        valueFrom: {
                                            configMapKeyRef: {
                                                name: 'mdos-api-configs',
                                                key: 'API_MODE',
                                            },
                                        },
                                    },
                                    {
                                        name: 'BROKER_CLIENT',
                                        valueFrom: {
                                            configMapKeyRef: {
                                                name: 'mdos-api-configs',
                                                key: 'BROKER_CLIENT',
                                            },
                                        },
                                    },
                                ],
                                ports: [
                                    {
                                        name: 'http-3030',
                                        containerPort: 3030,
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
        })

        // Ingress
        try {
            await axios.get(`${this.kubeApiUrl}/apis/networking.k8s.io/v1/namespaces/mdos/ingresses/mdos-api-http-ingress`)
            await axios.delete(`${this.kubeApiUrl}/apis/networking.k8s.io/v1/namespaces/mdos/ingresses/mdos-api-http-ingress`)
        } catch (error) {}
        let ingressSpec: any
        ingressSpec = {
            ingressClassName: this.ingressClass,
            rules: [
                {
                    host: this.hostName,
                    http: {
                        paths: [
                            {
                                path: '/',
                                pathType: 'Prefix',
                                backend: {
                                    service: {
                                        name: 'mdos-api-http',
                                        port: {
                                            number: 3030,
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
            ],
        }

        if (this.tlsCert) {
            ingressSpec.tls = [
                {
                    hosts: [this.hostName],
                    secretName: 'mdos-api-tls',
                },
            ]

            try {
                await axios.get(`${this.kubeApiUrl}/api/v1/namespaces/mdos/secrets/mdos-api/mdos-api-tls`)
                await axios.delete(`${this.kubeApiUrl}/api/v1/namespaces/mdos/secrets/mdos-api/mdos-api-tls`)
            } catch (error) {}
            await axios.post(`${this.kubeApiUrl}/api/v1/namespaces/mdos/secrets`, {
                apiVersion: 'v1',
                data: {
                    'tls.crt': Buffer.from(this.tlsCert, 'utf-8').toString('base64'),
                    'tls.key': Buffer.from(this.tlsKey, 'utf-8').toString('base64'),
                },
                kind: 'Secret',
                metadata: {
                    name: 'mdos-api-tls',
                },
                type: 'kubernetes.io/tls',
            })
        }

        await axios.post(`${this.kubeApiUrl}/apis/networking.k8s.io/v1/namespaces/mdos/ingresses`, {
            apiVersion: 'networking.k8s.io/v1',
            kind: 'Ingress',
            metadata: {
                name: 'mdos-api-http-ingress',
            },
            spec: ingressSpec,
        })
    }

    /**
     * waitForMdosUpAndRunning
     */
    async waitForMdosUpAndRunning() {
        let attempts = 0
        while (true) {
            try {
                const res = await axios.get(`${this.kubeApiUrl}/apis/apps/v1/namespaces/mdos/deployments/mdos-api`)
                if (res.data.status.conditions && res.data.status.conditions.find((c: any) => c.type == 'Available' && c.status == 'True')) {
                    break
                }
                attempts++
                await new Promise((r) => setTimeout(r, 2000))
            } catch (error) {
                attempts++
                await new Promise((r) => setTimeout(r, 2000))
            }
            if (attempts >= 150) {
                throw new Error("MDos did not come online")
            }
        }
        await new Promise((r) => setTimeout(r, 2000))
    }
}
