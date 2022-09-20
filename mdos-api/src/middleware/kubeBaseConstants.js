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
    constructor() { }

    /**
     * A full list of all API groups, resources and verbs
     * available on the cluster
     * @returns 
     */
    getAllRolesRBACTemplate() {
        return [
            {
                "apiGroups": [
                    ""
                ],
                "resources": [
                    "bindings",
                    "componentstatuses",
                    "configmaps",
                    "endpoints",
                    "events",
                    "limitranges",
                    "namespaces",
                    "nodes",
                    "persistentvolumeclaims",
                    "persistentvolumes",
                    "pods",
                    "podtemplates",
                    "replicationcontrollers",
                    "resourcequotas",
                    "secrets",
                    "serviceaccounts",
                    "services"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "admissionregistration.k8s.io"
                ],
                "resources": [
                    "mutatingwebhookconfigurations",
                    "validatingwebhookconfigurations"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "apiextensions.k8s.io"
                ],
                "resources": [
                    "customresourcedefinitions"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "apiregistration.k8s.io"
                ],
                "resources": [
                    "apiservices"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "apps"
                ],
                "resources": [
                    "controllerrevisions",
                    "daemonsets",
                    "deployments",
                    "replicasets",
                    "statefulsets"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "authentication.k8s.io"
                ],
                "resources": [
                    "tokenreviews"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "authorization.k8s.io"
                ],
                "resources": [
                    "localsubjectaccessreviews",
                    "selfsubjectaccessreviews",
                    "selfsubjectrulesreviews",
                    "subjectaccessreviews"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "autoscaling"
                ],
                "resources": [
                    "horizontalpodautoscalers"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "batch"
                ],
                "resources": [
                    "cronjobs",
                    "jobs"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "certificates.k8s.io"
                ],
                "resources": [
                    "certificatesigningrequests"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "coordination.k8s.io"
                ],
                "resources": [
                    "leases"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "crd.projectcalico.org"
                ],
                "resources": [
                    "bgpconfigurations",
                    "bgppeers",
                    "blockaffinities",
                    "caliconodestatuses",
                    "clusterinformations",
                    "felixconfigurations",
                    "globalnetworkpolicies",
                    "globalnetworksets",
                    "hostendpoints",
                    "ipamblocks",
                    "ipamconfigs",
                    "ipamhandles",
                    "ippools",
                    "ipreservations",
                    "kubecontrollersconfigurations",
                    "networkpolicies",
                    "networksets"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "discovery.k8s.io"
                ],
                "resources": [
                    "endpointslices"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "events.k8s.io"
                ],
                "resources": [
                    "events"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "extensions.istio.io"
                ],
                "resources": [
                    "wasmplugins"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "flowcontrol.apiserver.k8s.io"
                ],
                "resources": [
                    "flowschemas",
                    "prioritylevelconfigurations"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "helm.cattle.io"
                ],
                "resources": [
                    "helmchartconfigs",
                    "helmcharts"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "install.istio.io"
                ],
                "resources": [
                    "istiooperators"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "k3s.cattle.io"
                ],
                "resources": [
                    "addons"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "longhorn.io"
                ],
                "resources": [
                    "backingimagedatasources",
                    "backingimagemanagers",
                    "backingimages",
                    "backups",
                    "backuptargets",
                    "backupvolumes",
                    "engineimages",
                    "engines",
                    "instancemanagers",
                    "nodes",
                    "orphans",
                    "recurringjobs",
                    "replicas",
                    "settings",
                    "sharemanagers",
                    "snapshots",
                    "volumes"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "metrics.k8s.io"
                ],
                "resources": [
                    "nodes",
                    "pods"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "networking.istio.io"
                ],
                "resources": [
                    "destinationrules",
                    "envoyfilters",
                    "gateways",
                    "proxyconfigs",
                    "serviceentries",
                    "sidecars",
                    "virtualservices",
                    "workloadentries",
                    "workloadgroups"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "networking.k8s.io"
                ],
                "resources": [
                    "ingressclasses",
                    "ingresses",
                    "networkpolicies"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "node.k8s.io"
                ],
                "resources": [
                    "runtimeclasses"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "operator.tigera.io"
                ],
                "resources": [
                    "apiservers",
                    "imagesets",
                    "installations",
                    "tigerastatuses"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "policy"
                ],
                "resources": [
                    "poddisruptionbudgets",
                    "podsecuritypolicies"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "projectcalico.org"
                ],
                "resources": [
                    "bgpconfigurations",
                    "bgppeers",
                    "caliconodestatuses",
                    "clusterinformations",
                    "felixconfigurations",
                    "globalnetworkpolicies",
                    "globalnetworksets",
                    "hostendpoints",
                    "ippools",
                    "ipreservations",
                    "kubecontrollersconfigurations",
                    "networkpolicies",
                    "networksets",
                    "profiles"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "rbac.authorization.k8s.io"
                ],
                "resources": [
                    "clusterrolebindings",
                    "clusterroles",
                    "rolebindings",
                    "roles"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "scheduling.k8s.io"
                ],
                "resources": [
                    "priorityclasses"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "security.istio.io"
                ],
                "resources": [
                    "authorizationpolicies",
                    "peerauthentications",
                    "requestauthentications"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "storage.k8s.io"
                ],
                "resources": [
                    "csidrivers",
                    "csinodes",
                    "csistoragecapacities",
                    "storageclasses",
                    "volumeattachments"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            },
            {
                "apiGroups": [
                    "telemetry.istio.io"
                ],
                "resources": [
                    "telemetries"
                ],
                "verbs": [
                    "get",
                    "list",
                    "watch",
                    "create",
                    "update",
                    "patch",
                    "delete"
                ]
            }
        ]
    }

    /**
     * For which "apiGroups" do we want to EXCLUDE
     * permissions in terms of "resources" and "verbs"
     */
    getForbiddenRolesRBACForNsAdmins() {
        return [{
            "apiGroups": [
                ""
            ],
            "resources": [
                "namespaces",
                "nodes",
                "persistentvolumes",
                "resourcequotas"
            ],
            "verbs": []
        }, {
            "apiGroups": [
                "authorization.k8s.io"
            ],
            "resources": [],
            "verbs": [
                "create",
                "update",
                "patch",
                "delete"
            ]
        }, {
            "apiGroups": [
                "rbac.authorization.k8s.io"
            ],
            "resources": [
                "clusterrolebindings",
                "clusterroles"
            ],
            "verbs": []
        }, {
            "apiGroups": [
                "storage.k8s.io"
            ],
            "resources": [
                "storageclasses"
            ],
            "verbs": []
        }, {
            "apiGroups": [
                "tekton.dev"
            ],
            "resources": [
                "clustertasks"
            ],
            "verbs": []
        }, {
            "apiGroups": [
                "triggers.tekton.dev"
            ],
            "resources": [
                "clustertriggerbindings"
            ],
            "verbs": []
        }]
    }

    /**
     * For which "apiGroups" do we want to EXCLUDE
     * permissions in terms of "resources" and "verbs"
     */
    getForbiddenRolesRBACForNsUsers() {
        return [{
            "apiGroups": [
                ""
            ],
            "resources": [
                "namespaces",
                "nodes",
                "persistentvolumes",
                "resourcequotas"
            ],
            "verbs": []
        }, {
            "apiGroups": [
                "authorization.k8s.io"
            ],
            "resources": [],
            "verbs": [
                "create",
                "update",
                "patch",
                "delete"
            ]
        }, {
            "apiGroups": [
                "rbac.authorization.k8s.io"
            ],
            "resources": [
                "clusterrolebindings",
                "clusterroles"
            ],
            "verbs": []
        }, {
            "apiGroups": [
                "storage.k8s.io"
            ],
            "resources": [
                "storageclasses"
            ],
            "verbs": []
        }, {
            "apiGroups": [
                "tekton.dev"
            ],
            "resources": [
                "clustertasks"
            ],
            "verbs": []
        }, {
            "apiGroups": [
                "triggers.tekton.dev"
            ],
            "resources": [
                "clustertriggerbindings"
            ],
            "verbs": []
        }]
    }

    /**
     * Which "apiGroups" do we want to EXCLUDE
     * permissions for all together
     */
    getForbiddenGroupsRBACForNsAdmins() {
        return [
            "admissionregistration.k8s.io",
            "apiextensions.k8s.io",
            "apiregistration.k8s.io",
            "caching.internal.knative.dev",
            "crd.projectcalico.org",
            "install.istio.io",
            "networking.k8s.io",
            "node.k8s.io",
            "security.istio.io",
            "metrics.k8s.io"
        ]
    }

    /**
     * Which "apiGroups" do we want to EXCLUDE
     * permissions for all together
     */
    getForbiddenGroupsRBACForNsUsers() {
        return [
            "admissionregistration.k8s.io",
            "apiextensions.k8s.io",
            "apiregistration.k8s.io",
            "caching.internal.knative.dev",
            "crd.projectcalico.org",
            "install.istio.io",
            "networking.k8s.io",
            "node.k8s.io",
            "security.istio.io",
            "metrics.k8s.io"
        ]
    }
}

module.exports = KubeBaseConstants