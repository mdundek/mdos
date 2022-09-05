const express = require('express');
const jwt_decode = require('jwt-decode');

const app = express()
const port = 3000

app.get('/', (req, res) => {
    let jwtToken = jwt_decode(req.headers["x-auth-request-access-token"]);
    // console.log(JSON.stringify(req.headers, null, 4));
    console.log(jwtToken);
    res.send(JSON.stringify(jwtToken.resource_access))
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
