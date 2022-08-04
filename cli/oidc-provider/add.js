const prompts = require('prompts');
const axios = require('axios').default;
const ora = require('ora');
const { info } = require("../lib/utils");
const chalk = require('chalk');

const api_uri = "http://localhost:3030";

module.exports = async (options) => {
	const promptResponses = await prompts([
		{
			type: 'select',
			name: 'oidcProviderType',
			message: 'What OIDC provider would you like to configure?',
			choices: [
				{ title: 'Keycloak (new client)', value: 'keycloak' },
				{ title: 'Google', value: 'google' }
			],
		}
	]);

	// Keycloak provider
	if(promptResponses.oidcProviderType == "keycloak") {
		try {
			// Is keycloak deployed?
			let nsResponse = await axios.get(`${api_uri}/kube?target=namespaces`);
			let kcInfoResponses = {};
			let spinner;
			if (!nsResponse.data.find(ns => ns.metadata.name == "keycloak")) {

				info("Keycloak is not installed, installing it now");

				// No, lets go about it
				kcInfoResponses = await prompts([
					{
						type: 'text',
						name: 'username',
						message: 'What admin username would you like to configure for Keycloak?',
						validate: value => value.trim().length == 0 ? `Mandatory field` : true
					}, {
						type: 'password',
						name: 'password',
						message: 'What admin password would you like to configure for Keycloak?',
						validate: value => value.trim().length == 0 ? `Mandatory field` : true
					}, {
						type: 'text',
						name: 'email',
						message: 'What is the admin email address?',
						validate: value => value.trim().length == 0 ? `Mandatory field` : true
					}
				]);

				let deployData = null;
				spinner = ora('Installing Keycloak').start();
				try {
					deployData = await axios.post(`${api_uri}/oidc-provider`, {
						"type": "keycloak-deploy",
						"realm": "mdos",
						...kcInfoResponses
					});
					spinner.succeed("Keycloak is installed");
				} catch (error) {
					console.log(error);
					spinner.fail("Keycloak could not be installed");
					return;
				}

				// TODO: collect master-realm secret

				info("Some manual configuration steps are required");

				console.log("  1. Open a browser and go to:");
				console.log(chalk.cyan(`     https://${deployData.kcDomain}/admin/master/console/#/realms/master/clients`));
				console.log("  2. From the 'Clients' section, click on the client 'master-realm'");
				console.log("  3. Change 'Access Type' value to 'confidential'");
				console.log("  4. Enable the boolean value 'Service Accounts Enabled'");
				console.log("  5. Set 'Valid Redirect URIs' value to '*'");
				console.log("  6. Save those changes (button at the bottom of the page)");
				console.log("  7. In tab 'Roles', Click on button 'edit' for role 'magage realm'.");
				console.log("     Enable 'Composite roles' and add 'admin' realm to associated roles");
				console.log("  8. Go to the 'Service Account Roles' tab and add the role 'admin' to the 'Assigned Roles' box");
				console.log("  9. Click on tab 'Credentials'");
				console.log();

				const secretResponse = await prompts([
					{
						type: 'text',
						name: 'clientSecret',
						message: 'Enter the client secret',
						validate: value => value.trim().length == 0 ? `Mandatory field` : true
					}
				]);

				spinner = ora('Saving config').start();
				try {
					await axios.post(`${api_uri}/kube`, {
						"type": "secret",
						"namespace": "keycloak",
						"name": "admin-creds",
						"data": {
							...kcInfoResponses, ...secretResponse
						}
					});
					spinner.succeed("Done");
				} catch (error) {
					spinner.fail("Config could not be saved");
					return;
				}
			}

			// Now, lets go about it
			kcInfoResponses = await prompts([
				{
					type: 'text',
					name: 'clientId',
					message: 'Enter a Keycloak client ID (application)?',
					validate: value => value.trim().length == 0 ? `Mandatory field` : true
				}
			]);

			// Create new client in Keycloak
			spinner = ora('Installing Keycloak').start();
			try {
				await axios.post(`${api_uri}/oidc-provider`, {
					"type": "keycloak",
					"realm": "mdos",
					"data": {
					    ...kcInfoResponses
					}
				});
				spinner.succeed("Keycloak is installed");
			} catch (error) {
				spinner.fail("Keycloak could not be installed");
				return;
			}






			// const spinner = ora('Creating Keycloak OIDC client').start();
			// try {
			// 	await axios.post('http://localhost:3030/oidc-provider', {
			// 		"type": "keycloak-deploy",
			// 		"realm": "mdos",
			// 		...kcInfoResponses
			// 	});
			// 	spinner.succeed("Keycloak client created");
			// } catch (error) {
			// 	spinner.fail("Keycloak client could not be created");
			// }

			// await axios.post('http://localhost:3030/oidc-provider', {
			// 	"type": "keycloak",
			// 	"realm": "mdos",
			// 	...kcInfoResponses
			// });
		
		} catch (error) {
			console.log(error);
		}
	}

	// let oidcProviders = await axios.get('http://localhost:3030/oidc-provider');
	// console.log(JSON.stringify(oidcProviders.data, null, 4));

	// await axios.post('http://localhost:3030/oidc-provider', {
	//   "name": "oauth2-proxy-foobar",
	//   "oidcClientId": "",
	//   "oidcClientSecret": "",
	//   "oidcIssuerUrl": "",
	//   "oidcProfileUrl": "",
	//   "oidcValidateUrl": "",
	//   "oidcDomain": ""
	// });

	// await axios.post('http://localhost:3030/oidc-provider', {
	//   "type": "keycloak",
	//   "realm": "mdos",
	//   "clientId": "mdos"
	// });

	// await axios.post('http://localhost:3030/oidc-provider', {
	//   "type": "google",
	//   "clientId": "",
	//   "clientSecret": ""
	// });

	// await axios.delete('http://localhost:3030/oidc-provider/oauth2-proxy-foobar');

	// const response = await prompts([
	//   {
	//     type: 'select',
	//     name: 'color',
	//     message: 'Pick colors',
	//     choices: [
	//       { title: 'Red', value: '#ff0000' },
	//       { title: 'Green', value: '#00ff00' },
	//       { title: 'Blue', value: '#0000ff' }
	//     ],
	//   }
	// ]);

	// console.log(response);
}