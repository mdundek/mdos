const fs = require('fs')
const path = require('path')

module.exports = (req, res) => {
    app.get('keycloak')
        .isKeycloakDeployed()
        .then((keycloakAvailable) => {
            if (!keycloakAvailable) {
                res.status(503).send("Keycloak is not installed");
                return;
            }

            // if (!req.headers['x-auth-request-access-token']) {
            //     res.status(403).send("Not athenticated");
            //     return;
            // }

            // let jwtToken = jwt_decode(req.headers['x-auth-request-access-token'])

            // if (jwtToken.resource_access.mdos && jwtToken.resource_access.mdos.roles.find((r) => r == 'mdos_admin')) {
                const list = {}
                const cookieHeader = req.headers?.cookie
                if (!cookieHeader) {
                    res.status(403).send("Not athenticated");
                    return;
                }

                cookieHeader.split(`;`).forEach(function (cookie) {
                    let [name, ...rest] = cookie.split(`=`)
                    name = name?.trim()
                    if (!name) return
                    const value = rest.join(`=`).trim()
                    if (!value) return
                    list[name] = decodeURIComponent(value)
                })

                if(!list["_oauth2_proxy"]) {
                    res.status(403).send("Not athenticated");
                    return;
                } else {
                    let template = fs.readFileSync(path.join(APP_ROOT, 'assets', 'jwt.html'), 'utf8')
                    res.send(template.replace('{TOKEN}', list["_oauth2_proxy"]))
                }
            // } else {
            //     res.status(403).send("Not authorized");
            //     return;
            // }
        })
}