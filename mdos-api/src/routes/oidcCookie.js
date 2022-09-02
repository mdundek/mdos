const fs = require('fs')
const path = require('path')
const jwt_decode = require('jwt-decode')

module.exports = (app, req, res) => {
    app.get('keycloak')
        .isKeycloakDeployed()
        .then((keycloakAvailable) => {
            if (!keycloakAvailable) {
                res.status(503).send("Keycloak is not installed");
                return;
            }

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

            let jwtToken = jwt_decode(req.headers['x-auth-request-access-token'])

            if(!list["_oauth2_proxy"]) {
                res.status(403).send("Not athenticated");
                return;
            } else {
                let template = fs.readFileSync(path.join(APP_ROOT, 'assets', 'jwt.html'), 'utf8')
                res.send(template.replaceAll('{TOKEN}', list["_oauth2_proxy"]).replaceAll('{USERNAME}', jwtToken.preferred_username))
            }
        })
}