#!/usr/bin/env node

let { exec } = require('child_process');

/**
 * sh
 * @param {*} cmd 
 */
async function sh(cmd) {
  return new Promise(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Main
 * @param {*} cmd 
 */
(async() => {
  let { stdout } = await sh('kubectl api-resources');
  let responses = [];
  let headers = [];
  stdout.split('\n').forEach((line, i) => {
    if(i == 0) {
        let _hNames = line.split("  ").filter(o => o.length > 0);
        _hNames.forEach((n, z) => {
            if(z == 0){
                headers.push({"name": n.trim(), "pos": line.indexOf(`${n.trim()} `)});
            } 
            else if((z+1) == _hNames.length){
                headers.push({"name": n.trim(), "pos": line.indexOf(` ${n.trim()}`)-1});
            }
            else {
                headers.push({"name": n.trim(), "pos": line.indexOf(` ${n.trim()} `)-1});
            }
        });
    } else {
        let pos = 0;
        let lineData = {};
        for(let y=0; y<headers.length; y++){
            if(y+1 == headers.length){
                lineData[headers[y].name] = line.substring(pos).trim();
            } else {
                lineData[headers[y].name] = line.substring(pos, headers[y+1].pos).trim();
                pos = headers[y+1].pos;
            }
        }
        responses.push(lineData);
    }
  })

  let rules = [];

  rules.push({
    "apiGroups": [""],
    "resources": [],
    "verbs": [
        "get",
        "list",
        "watch",
        "create",
        "update",
        "patch",
        "delete"
    ]
  });
  for(let resource of responses) {
    if(resource.NAME.length > 0) {
      let apigroupRule = rules.find(r => (r.apiGroups[0] == resource.APIGROUP) || (r.apiGroups[0].length == 0 && resource.APIGROUP.length == 0));
      if(!apigroupRule) {
        apigroupRule = {
          "apiGroups": [resource.APIGROUP],
          "resources": [resource.NAME],
          "verbs": [
              "get",
              "list",
              "watch",
              "create",
              "update",
              "patch",
              "delete"
          ]
        };
        rules.push(apigroupRule);
      } else {
        apigroupRule.resources.push(resource.NAME);
      }
    }
  }


  rules.forEach(rule => {
    console.log(JSON.stringify(rule.resources.join(",")));
  });
  
  
  // console.log(JSON.stringify(rules, null, 4));
})();