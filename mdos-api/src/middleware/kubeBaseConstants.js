/**
 * Low level core kube constants
 *
 * @class KubeBaseConstants
 */
class KubeBaseConstants {
    /**
     * Creates an instance of KubeBaseConstants.
     * @param {*} app
     * @memberof KubeBaseConstants
     */
    constructor() {}

    /**
     * A full list of all API groups & their resources
     * that admin users can perform read operations on
     * for this namespace
     * @returns
     */
    getAdminReadRolesRBAC() {
        return [
            {
                apiGroups: [''],
                resources: [
                    'bindings',
                    'componentstatuses',
                    'configmaps',
                    'endpoints',
                    'events',
                    'limitranges',
                    'persistentvolumeclaims',
                    'persistentvolumes',
                    'pods',
                    'podtemplates',
                    'replicationcontrollers',
                    'resourcequotas',
                    'secrets',
                    'serviceaccounts',
                    'services',
                ]
            },
            {
                apiGroups: ['apps'],
                resources: ['controllerrevisions', 'deployments', 'replicasets', 'statefulsets']
            },
            {
                apiGroups: ['autoscaling'],
                resources: ['horizontalpodautoscalers']
            },
            {
                apiGroups: ['batch'],
                resources: ['cronjobs', 'jobs']
            },
            {
                apiGroups: ['crd.projectcalico.org'],
                resources: [
                    'networkpolicies',
                    'networksets',
                ]
            },
            {
                apiGroups: ['events.k8s.io'],
                resources: ['events']
            },
            {
                apiGroups: ['helm.cattle.io'],
                resources: ['helmchartconfigs', 'helmcharts']
            },
            {
                apiGroups: ['longhorn.io'],
                resources: [
                    'backingimagedatasources',
                    'backingimagemanagers',
                    'backingimages',
                    'backups',
                    'backuptargets',
                    'backupvolumes',
                    'engineimages',
                    'engines',
                    'instancemanagers',
                    'orphans',
                    'recurringjobs',
                    'replicas',
                    'settings',
                    'sharemanagers',
                    'snapshots',
                    'volumes',
                ]
            },
            {
                apiGroups: ['networking.istio.io'],
                resources: ['destinationrules', 'envoyfilters', 'gateways', 'proxyconfigs', 'serviceentries', 'sidecars', 'virtualservices', 'workloadentries', 'workloadgroups']
            },
            {
                apiGroups: ['networking.k8s.io'],
                resources: ['ingressclasses', 'ingresses', 'networkpolicies']
            },
            {
                apiGroups: ['node.k8s.io'],
                resources: ['runtimeclasses']
            },
            {
                apiGroups: ['policy'],
                resources: ['poddisruptionbudgets', 'podsecuritypolicies']
            },
            {
                apiGroups: ['projectcalico.org'],
                resources: [
                    'networkpolicies',
                    'networksets',
                    'profiles',
                ]
            },
            {
                apiGroups: ['rbac.authorization.k8s.io'],
                resources: ['rolebindings', 'roles']
            },
            {
                apiGroups: ['security.istio.io'],
                resources: ['authorizationpolicies', 'peerauthentications', 'requestauthentications']
            },
            {
                apiGroups: ['storage.k8s.io'],
                resources: ['csidrivers', 'csinodes', 'csistoragecapacities', 'storageclasses', 'volumeattachments']
            }
        ]
    }

    /**
     * A full list of all API groups & their resources
     * that admin users can perform write operations on
     * for this namespace
     * @returns
     */
     getAdminWriteRolesRBAC() {
        return [
            {
                apiGroups: [''],
                resources: [
                    'bindings',
                    'componentstatuses',
                    'configmaps',
                    'endpoints',
                    'events',
                    'limitranges',
                    'persistentvolumeclaims',
                    'pods',
                    'podtemplates',
                    'replicationcontrollers',
                    'resourcequotas',
                    'secrets',
                    'serviceaccounts',
                    'services',
                ]
            },
            {
                apiGroups: ['apps'],
                resources: ['controllerrevisions', 'deployments', 'replicasets', 'statefulsets']
            },
            {
                apiGroups: ['autoscaling'],
                resources: ['horizontalpodautoscalers']
            },
            {
                apiGroups: ['batch'],
                resources: ['cronjobs', 'jobs']
            },
            {
                apiGroups: ['crd.projectcalico.org'],
                resources: [
                    'networkpolicies',
                    'networksets',
                ]
            },
            {
                apiGroups: ['events.k8s.io'],
                resources: ['events']
            },
            {
                apiGroups: ['helm.cattle.io'],
                resources: ['helmchartconfigs', 'helmcharts']
            },
            {
                apiGroups: ['longhorn.io'],
                resources: [
                    'backingimagedatasources',
                    'backingimagemanagers',
                    'backingimages',
                    'backups',
                    'backuptargets',
                    'backupvolumes',
                    'engineimages',
                    'engines',
                    'instancemanagers',
                    'orphans',
                    'recurringjobs',
                    'replicas',
                    'settings',
                    'sharemanagers',
                    'snapshots',
                    'volumes',
                ]
            },
            {
                apiGroups: ['networking.istio.io'],
                resources: ['destinationrules', 'envoyfilters', 'gateways', 'proxyconfigs', 'serviceentries', 'sidecars', 'virtualservices', 'workloadentries', 'workloadgroups']
            },
            {
                apiGroups: ['networking.k8s.io'],
                resources: ['ingressclasses', 'ingresses', 'networkpolicies']
            },
            {
                apiGroups: ['policy'],
                resources: ['poddisruptionbudgets', 'podsecuritypolicies']
            },
            {
                apiGroups: ['projectcalico.org'],
                resources: [
                    'networkpolicies'
                ]
            },
            {
                apiGroups: ['rbac.authorization.k8s.io'],
                resources: ['rolebindings', 'roles']
            },
            {
                apiGroups: ['security.istio.io'],
                resources: ['authorizationpolicies', 'peerauthentications', 'requestauthentications']
            },
            {
                apiGroups: ['storage.k8s.io'],
                resources: ['volumeattachments']
            }
        ]
    }

    /**
     * A full list of all API groups & their resources
     * that standard users can perform read operations on
     * for this namespace
     * @returns
     */
    getUserReadRolesRBAC() {
        return [
            {
                apiGroups: [''],
                resources: [
                    'bindings',
                    'componentstatuses',
                    'configmaps',
                    'endpoints',
                    'events',
                    'limitranges',
                    'persistentvolumeclaims',
                    'persistentvolumes',
                    'pods',
                    'podtemplates',
                    'replicationcontrollers',
                    'resourcequotas',
                    'secrets',
                    'serviceaccounts',
                    'services',
                ]
            },
            {
                apiGroups: ['apps'],
                resources: ['controllerrevisions', 'deployments', 'replicasets', 'statefulsets']
            },
            {
                apiGroups: ['autoscaling'],
                resources: ['horizontalpodautoscalers']
            },
            {
                apiGroups: ['batch'],
                resources: ['cronjobs', 'jobs']
            },
            {
                apiGroups: ['crd.projectcalico.org'],
                resources: [
                    'networkpolicies',
                    'networksets',
                ]
            },
            {
                apiGroups: ['events.k8s.io'],
                resources: ['events']
            },
            {
                apiGroups: ['helm.cattle.io'],
                resources: ['helmchartconfigs', 'helmcharts']
            },
            {
                apiGroups: ['longhorn.io'],
                resources: [
                    'backingimagedatasources',
                    'backingimagemanagers',
                    'backingimages',
                    'backups',
                    'backuptargets',
                    'backupvolumes',
                    'engineimages',
                    'engines',
                    'instancemanagers',
                    'orphans',
                    'recurringjobs',
                    'replicas',
                    'settings',
                    'sharemanagers',
                    'snapshots',
                    'volumes',
                ]
            },
            {
                apiGroups: ['networking.istio.io'],
                resources: ['destinationrules', 'envoyfilters', 'gateways', 'proxyconfigs', 'serviceentries', 'sidecars', 'virtualservices', 'workloadentries', 'workloadgroups']
            },
            {
                apiGroups: ['networking.k8s.io'],
                resources: ['ingressclasses', 'ingresses', 'networkpolicies']
            },
            {
                apiGroups: ['node.k8s.io'],
                resources: ['runtimeclasses']
            },
            {
                apiGroups: ['policy'],
                resources: ['poddisruptionbudgets', 'podsecuritypolicies']
            },
            {
                apiGroups: ['projectcalico.org'],
                resources: [
                    'networkpolicies',
                    'networksets',
                    'profiles',
                ]
            },
            {
                apiGroups: ['rbac.authorization.k8s.io'],
                resources: ['rolebindings', 'roles']
            },
            {
                apiGroups: ['security.istio.io'],
                resources: ['authorizationpolicies', 'peerauthentications', 'requestauthentications']
            },
            {
                apiGroups: ['storage.k8s.io'],
                resources: ['csidrivers', 'csinodes', 'csistoragecapacities', 'storageclasses', 'volumeattachments']
            }
        ]
    }

    /**
     * A full list of all API groups & their resources
     * that standard users can perform write operations on
     * for this namespace
     * @returns
     */
     getUserWriteRolesRBAC() {
        return []
    }
}

module.exports = KubeBaseConstants
