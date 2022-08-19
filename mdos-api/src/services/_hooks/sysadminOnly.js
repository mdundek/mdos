const errors = require('@feathersjs/errors');
const jwt_decode = require('jwt-decode')

module.exports = function () {
    return async (context) => {
        // Is auth disabled?
        if(process.env.NO_ADMIN_AUTH == "true")
            return context;
        if(context.params.provider != "rest") // Internal calls don't need authentication
            return context;

        if (!context.params.headers['x-auth-request-access-token']) {
            throw new errors.Forbidden('You are not authenticated');
        }
        let jwtToken = jwt_decode(context.params.headers['x-auth-request-access-token'])

        // if(context.data)
        //     console.log("        // BODY:", JSON.stringify(context.data)); //rest
        // if(context.params.query && Object.keys(context.params.query).length > 0)
        //     console.log("        // QUERY:", JSON.stringify(context.params.query)); //{ target: 'users', realm: 'mdos' }
        // console.log("        // METHOD:", context.method); // find
        // console.log("        // PATH:", context.path); // keycloak
        // console.log();

        // -=-=-=-=-=-=-=- mdos kc user list -=-=-=-=-=-=-=
        // TODO: If no "mdos::" role listed below, filter out users that are not part of the namespace client
        // => REQUIRED ROLES: mdos::admin, mdos::list-users, namespace::admin
        // QUERY: {"target":"users","realm":"mdos"}
        // METHOD: find
        // PATH: keycloak

        // -=-=-=-=-=-=-=- mdos kc user add-role -=-=-=-=-=-=-=
        // => REQUIRED ROLES: mdos::list-clients, mdos::assign-roles, namespace::admin
        // QUERY: {"target":"clients","realm":"mdos"}
        // METHOD: find
        // PATH: keycloak

        // => REQUIRED ROLES: mdos::list-clients, mdos::assign-roles
        // QUERY: {"target":"client-roles","realm":"mdos","clientId":"ns1"}
        // METHOD: find
        // PATH: keycloak

        // => REQUIRED ROLES: mdos::list-users, mdos::assign-roles
        // QUERY: {"target":"users","realm":"mdos"}
        // METHOD: find
        // PATH: keycloak

        // => REQUIRED ROLES: mdos::list-users, mdos::assign-roles
        // QUERY: {"target":"user-roles","realm":"mdos","username":"mdundek"}
        // METHOD: find
        // PATH: keycloak
        
        // => REQUIRED ROLES: mdos::assign-roles
        // BODY: {
            // type: 'user-role',
            // realm: 'mdos',
            // clientUuid: 'f91b9feb-28e5-4510-828a-1e2cb6ff2bce',
            // clientId: 'ns1',
            // roleUuid: '38201267-e9ff-4e6f-b2df-4eb9cea024e4',
            // roleName: 's3-write',
            // username: 'mdundek',
            // userUuid: '91aa12b7-1e14-47fd-8fec-bc5633e9ca0e'
        // }
        // METHOD: create
        // PATH: keycloak

        // -=-=-=-=-=-=-=- mdos kc user create -=-=-=-=-=-=-=
        // BODY: {"type":"user","realm":"mdos","username":"sdf","password":"sdf","email":"sdf@df.com"}
        // METHOD: create
        // PATH: keycloak

        // -=-=-=-=-=-=-=- mdos kc user delete -=-=-=-=-=-=-=
        // QUERY: {"target":"users","realm":"mdos"}
        // METHOD: find
        // PATH: keycloak

        // QUERY: {"target":"users","realm":"mdos"}
        // METHOD: remove
        // PATH: keycloak

        // -=-=-=-=-=-=-=- mdos kc user remove-role -=-=-=-=-=-=-=
        // QUERY: {"target":"users","realm":"mdos"}
        // METHOD: find
        // PATH: keycloak

        // QUERY: {"target":"clients","realm":"mdos"}
        // METHOD: find
        // PATH: keycloak

        // QUERY: {"target":"user-roles","realm":"mdos","username":"mdundek"}
        // METHOD: find
        // PATH: keycloak

        // QUERY: {"target":"user-roles","realm":"mdos","clientUuid":"f91b9feb-28e5-4510-828a-1e2cb6ff2bce","userUuid":"91aa12b7-1e14-47fd-8fec-bc5633e9ca0e","roleName":"k8s-read"}
        // METHOD: remove
        // PATH: keycloak

        // -=-=-=-=-=-=-=- mdos kc user list-roles -=-=-=-=-=-=-=
        // QUERY: {"target":"user-roles","realm":"mdos","username":"mdundek"}
        // METHOD: find
        // PATH: keycloak




        // -=-=-=-=-=-=-=- mdos namespace list -=-=-=-=-=-=-=
        // QUERY: {"target":"namespaces"}
        // METHOD: find
        // PATH: kube

        // QUERY: {"target":"namespaces","realm":"mdos","includeKcClients":"true"}
        // METHOD: find
        // PATH: kube

        // -=-=-=-=-=-=-=- mdos namespace create -=-=-=-=-=-=-=
        // QUERY: {"target":"namespaces"}
        // METHOD: find
        // PATH: kube

        // BODY: {"type":"tenantNamespace","realm":"mdos","namespace":"ns2"}
        // METHOD: create
        // PATH: kube

        // -=-=-=-=-=-=-=- mdos namespace delete -=-=-=-=-=-=-=
        // QUERY: {"target":"clients","realm":"mdos"}
        // METHOD: find
        // PATH: keycloak

        // QUERY: {"target":"tenantNamespace","realm":"mdos","clientUuid":"f91b9feb-28e5-4510-828a-1e2cb6ff2bce"}
        // METHOD: remove
        // PATH: kube






        // -=-=-=-=-=-=-=- mdos kc client create-role -=-=-=-=-=-=-=
        // QUERY: {"target":"clients","realm":"mdos"}
        // METHOD: find
        // PATH: keycloak

        // QUERY: {"target":"client-roles","realm":"mdos","clientId":"ns2"}
        // METHOD: find
        // PATH: keycloak

        // BODY: {"type":"client-role","realm":"mdos","name":"foorole","clientUuid":"dedb31dc-943b-44c0-8caf-fba3804f2b1f","clientId":"ns2"}
        // METHOD: create
        // PATH: keycloak


        // -=-=-=-=-=-=-=- mdos kc client delete-role -=-=-=-=-=-=-=
        // QUERY: {"target":"clients","realm":"mdos"}
        // METHOD: find
        // PATH: keycloak

        // QUERY: {"target":"client-roles","realm":"mdos","clientId":"ns2","filterProtected":"true"}
        // METHOD: find
        // PATH: keycloak

        // QUERY: {"target":"client-roles","realm":"mdos","clientUuid":"dedb31dc-943b-44c0-8caf-fba3804f2b1f"}
        // METHOD: remove
        // PATH: keycloak

        // -=-=-=-=-=-=-=- mdos kc client list-roles -=-=-=-=-=-=-=
        // QUERY: {"target":"clients","realm":"mdos"}
        // METHOD: find
        // PATH: keycloak

        // QUERY: {"target":"client-roles","realm":"mdos","clientId":"ns2"}
        // METHOD: find
        // PATH: keycloak



        // -=-=-=-=-=-=-=- mdos oidc protect-app -=-=-=-=-=-=-=


        // -=-=-=-=-=-=-=- mdos oidc provider add -=-=-=-=-=-=-=
        // QUERY: {"target":"clients","realm":"mdos"}
        // METHOD: find
        // PATH: keycloak

        // BODY: {"type":"keycloak","realm":"mdos","data":{"clientUuid":"dedb31dc-943b-44c0-8caf-fba3804f2b1f","clientId":"ns2","name":"kc-ns2"}}
        // METHOD: create
        // PATH: oidc-provider

        // -=-=-=-=-=-=-=- mdos oidc provider list -=-=-=-=-=-=-=
        // METHOD: find
        // PATH: oidc-provider

        // -=-=-=-=-=-=-=- mdos oidc provider remove -=-=-=-=-=-=-=
        // METHOD: find
        // PATH: oidc-provider

        // METHOD: remove
        // PATH: oidc-provider


        // -=-=-=-=-=-=-=- mdos deploy -=-=-=-=-=-=-=
        // console.log(JSON.stringify(jwtToken, null, 4));

        if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.find((r) => r == 'admin')) {
            return context;
        } else {
            throw new errors.Forbidden('You are not authorized to access this resource');
        }        
    };  
}