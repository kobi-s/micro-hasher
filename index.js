const express = require('express')
const app = express()
const PORT = process.env.PORT || 4444
const log = require('./logger')

app.use(express.json())
app.use('/', require('./routes'))
require('./handler')

app.listen(PORT, () => {
    console.log("Start listener on port " + PORT)
    log.info("Start listener on port " + PORT)
})