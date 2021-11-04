const router = require('express').Router()

router.use("/ping", (req, res) => {
    return res.send('pong')
})

router.get("/log", (req, res) => {
    return res.download(__dirname + '../micro-hasher-process.log')
})

router.get("/cracked.txt", (req, res) => {
    return res.download(__dirname + '../cracked.txt')
})

module.exports = router