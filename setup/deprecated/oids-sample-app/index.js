const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
    console.log(JSON.stringify(req.headers, null, 4));
    res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
