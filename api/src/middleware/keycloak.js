const axios = require("axios");
const https = require("https");
const YAML = require("yaml");
const fs = require("fs");
const path = require("path");
const { terminalCommand } = require("../libs/terminal");

axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

class Keycloak {

    /**
     * constructor
     * @param {*} app 
     */
    constructor(app) {
        this.app = app;
        this.k8sAxiosHeader = {
            headers: { 'Authorization': `Bearer ${this.K3S_TOKEN}` }
        };

        this.kcHelmChartPath = "/home/mdundek/workspaces/mdos/setup/dep/keycloak"
        this.rootDomain = "mdundek.network";
        this.sslCertFolder = "/etc/letsencrypt/live/mdundek.network";
        this.kcDbRoot = "/home/mdundek/.mdos/db"

        this.regUser = "mdundek";
        this.regPass = "li14ebe14";
    }

    /**
     * isKeycloakDeployed
     */
    async isKeycloakDeployed() {
        const namespaces = await this.app.get("kube").getNamespaces();
        return namespaces.find(ns => ns.metadata.name == "keycloak");
    }

    /**
     * deployKeycloak
     */
    async deployKeycloak(data) {
        try {
            // Create DB folder if not exist
            if (fs.existsSync(this.kcDbRoot)) {
                await terminalCommand(`sudo rm -rf ${this.kcDbRoot}`);
            }
            fs.mkdirSync(this.kcDbRoot, {recursive: true})

            // Load default values file
            const kcYamlValues = YAML.parse(fs.readFileSync(this.kcHelmChartPath + "/values.yaml", 'utf8'));

            // Update values
            kcYamlValues.registry = `registry.${this.rootDomain}`;
            kcYamlValues.appName = "mdos-keycloak";
            kcYamlValues.appInternalName = "mdos-keycloak";

            kcYamlValues.appComponents[0].config.data[1].value = data.username;
            kcYamlValues.appComponents[0].config.data[2].value = data.password;
            kcYamlValues.appComponents[0].config.data[3].value = data.username;
            kcYamlValues.appComponents[0].config.data[4].value = data.password;
            kcYamlValues.appComponents[0].persistence.hostpathVolumes[0].hostPath = this.kcDbRoot;
            kcYamlValues.appComponents[0].persistence.hostpathVolumes[1].hostPath = path.join(this.kcHelmChartPath, "pg-init-scripts");
            kcYamlValues.appComponents[0].imagePullSecrets = [{name: "regcred-local"}]

            kcYamlValues.appComponents[1].config.data[0].value = data.username;
            kcYamlValues.appComponents[1].config.data[1].value = data.password;
            kcYamlValues.appComponents[1].config.data[2].value = data.username;
            kcYamlValues.appComponents[1].config.data[3].value = data.password;
            kcYamlValues.appComponents[1].persistence.hostpathVolumes[0].hostPath = path.join(this.sslCertFolder, "fullchain.pem");
            kcYamlValues.appComponents[1].persistence.hostpathVolumes[1].hostPath = path.join(this.sslCertFolder, "privkey.pem");
            kcYamlValues.appComponents[1].imagePullSecrets = [{name: "regcred-local"}]

            // Login docker daemon to local registry
            await terminalCommand(`echo "${this.regPass}" | sudo docker login registry.${this.rootDomain} --username ${this.regUser} --password-stdin`);
           
            // Pull & push images to registry
            await terminalCommand(`sudo docker pull postgres:13.2-alpine`);
            await terminalCommand(`sudo docker tag postgres:13.2-alpine registry.${this.rootDomain}/postgres:13.2-alpine`);
            await terminalCommand(`sudo docker push registry.${this.rootDomain}/postgres:13.2-alpine`);

            await terminalCommand(`sudo docker pull quay.io/keycloak/keycloak:18.0.2`);
            await terminalCommand(`sudo docker tag quay.io/keycloak/keycloak:18.0.2 registry.${this.rootDomain}/keycloak:18.0.2`);
            await terminalCommand(`sudo docker push registry.${this.rootDomain}/keycloak:18.0.2`);

            // Deploy keycloak
            await this.app.get("kube").genericHelmInstall("keycloak", kcYamlValues);

            return {
                kcDomain: `keycloak.${this.rootDomain}`
            };
        } catch (err) {
            if (fs.existsSync(this.kcDbRoot)) {
                await terminalCommand(`sudo rm -rf ${this.kcDbRoot}`);
            }
            throw err;
        }
    }
}

module.exports = Keycloak;