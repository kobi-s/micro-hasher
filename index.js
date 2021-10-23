const express = require('express')
const app = express()
const PORT = process.env.PORT || 4444
const flags = require('./config/hashcatFlags.json')
const {
    spawn
} = require('child_process')
const axios = require('axios')
const log = require('simple-node-logger').createSimpleFileLogger('micro-hasher-process.log');
const hashcatPath = "~/hashcat/hashcat-6.2.2/"
let commands = []
let outputDict = []
const {
    data
} = require('./hashcat-process.json')

app.use(express.json())

log.info('service loaded')

let instance_uuid = null; // instance uuid initiate after saying hello to main server

const headers = {
    Camp: data._id,
    Authorization: data['token']
}

function buildExecutionCommands(options) {

    commands = []
    console.log('build hashcat command...');

    if (options['hashcat_config']["hash-type"]) {
        setCommand(flags["hash-type"], '=', options['hashcat_config']["hash-type"])
    }

    if (options['hashcat_config']["attack-mode"] == "0" || options['hashcat_config']["attack-mode"] == "1" || options["attack-mode"] == "3" || options["attack-mode"] == "6" || options["attack-mode"] == "7" || options["attack-mode"] == "9") {
        setCommand(flags["attack-mode"], '=', options['hashcat_config']["attack-mode"])
    }

    if (options['hashcat_config']['status-json']) {
        setCommand(flags["status-json"], null, null)
    }

    if (Array.isArray(options['hashcat_config']['rules'])) {
        options['hashcat_config']['rules'].forEach(rule => {
            setCommand('-r', ' ', hashcatPath + "rules/" + rule.filename)
        })
    }

    if (options['hash-file']) {
        setCommand('~/micro-hasher/crackthis.txt', null, null)
    }

    // if (options['hash']) {
    //     setCommand(options["hash"], null, null)
    // }

    if (options['hashcat_config']['status-timer']) {
        setCommand(flags["status-timer"], '=', options['hashcat_config']["status-timer"])
    }

    if (options['hashcat_config']["attack-mode"] == "1") {
        setCommand(options['hashcat_config']['combination-wordlist'].dir, null, null)
    }

    if (options['hashcat_config']['wordlist'] && options['hashcat_config']["attack-mode"] !== "7") {
        setCommand("~/wordlists/" + options['hashcat_config'].wordlist.filename, null, null)
    }

    if (options['hashcat_config']["attack-mode"] == "6" && options['hashcat_config']["mask"]) {
        setCommand("~/wordlists/" + options['hashcat_config'].wordlist.filename, null, null)
        setCommand(options['hashcat_config']["mask"], null, null)
    }

    if (options['hashcat_config']["attack-mode"] == "7" && options['hashcat_config']["mask"]) {
        setCommand(options['hashcat_config']["mask"], null, null)
        setCommand("~/wordlists/" + options['hashcat_config'].wordlist.filename, null, null)
    }

    if (options['hashcat_config']["outfile"]) {
        setCommand(flags["outfile"], '=', options['hashcat_config']["outfile"])
    }

    if (options['hashcat_config']["username"]) {
        setCommand(flags["username"], null, null)
    }

    if (options['hashcat_config']["force"]) {
        setCommand(flags["force"], null, null)
    }

    if (options['hashcat_config']["status"]) {
        setCommand(flags["status"], null, null)
    }

    if (options['hashcat_config']["mask"] && options['hashcat_config']['attack-mode'] == "3") {
        setCommand(options['hashcat_config']["mask"], null, null)
    }

    if (options['hashcat_config']["increment"]) {
        setCommand(flags["increment"], null, null)
    }

    if (options['hashcat_config']["increment-min"] && options['hashcat_config']["increment"]) {
        setCommand(flags["increment-min"], '=', options['hashcat_config']['increment-min'])
    }

    if (options['hashcat_config']["increment-max"] && options['hashcat_config']["increment"]) {
        setCommand(flags["increment-max"], '=', options['hashcat_config']['increment-max'])
    }

    if (options['hashcat_config']["skip"] !== undefined) {
        setCommand(flags["skip"], '=', options['hashcat_config']["skip"])
    }

    if (options['hashcat_config']["limit"]) {
        setCommand(flags["limit"], '=', options['hashcat_config']["limit"])
    }

    if (options['hashcat_config']["potfile-path"]) {
        setCommand(flags["potfile-path"], '=', options['hashcat_config']["potfile-path"])
    }

    if (options['hashcat_config']["generate-rules"]) {
        setCommand(flags["generate-rules"], '=', options['hashcat_config']['generate-rules'])
    }

    if (options['hashcat_config']["generate-rules-func-min"] && options['hashcat_config']["generate-rules"]) {
        setCommand(flags["generate-rules-func-min"], '=', options['hashcat_config']['generate-rules-func-min'])
    }

    if (options['hashcat_config']["generate-rules-func-max"] && options['hashcat_config']["generate-rules"]) {
        setCommand(flags["generate-rules-func-max"], '=', options['hashcat_config']['generate-rules-func-max'])
    }

    if (options['hashcat_config']['optimized-kernel-enable']) {
        setCommand(flags["optimized-kernel-enable"], null, null)
    }
    
    return commands.filter(a => (a !== '') && (a !== ' ') && (a !== null))
}

function setCommand(flag, op, command) {

    if (op == '=') {
        return commands.push(flag + op + command);
    } else {
        commands.push(flag);
        return commands.push(command);
    }
}

app.use("/ping", (req, res) => {
    return res.send('pong')
})

app.get("/log", (req, res) => {
    return res.download(__dirname + '/micro-hasher-process.log')
})

app.get("/cracked.txt", (req, res) => {
    return res.download(__dirname + '/cracked.txt')
})


// app.post('/start', (req, res) => {

//     log.info('start post request recived')

//     let campigan_data = data
    
//     if(campigan_data['attack-mode'] == 0) {

//         // 1. get addedd command (divided wordlist)

//         if(req.body.commands.skip && req.body.commands.limit) {

//             log.info('setting new commands (limit and skip)')

//             campigan_data['skip'] = req.body.commands.skip
//             campigan_data['limit'] = req.body.commands.limit
//         }

//         // 2. run hashcat
//         go(campigan_data)

//         return res.sendStatus(200)
//     }
// })

function sendStdoutData(stdout) {
    return axios.post(data.control_server + '/hook', {
        data: stdout,
        timestamp: Date.now()
    }, {
        headers: {...headers, instance_uuid: instance_uuid}
    })
        .then(() => {
            log.info('send hashcat stdout by axios')
        })
        .catch(function (error) {
            log.info(error)
        });
}

async function sayHello(params) {
    return axios.post(data.control_server + '/hook', {
        data: params,
        timestamp: Date.now()
    }, {
        headers: {...headers,  instance_uuid: data['guid']}
    })
        .then((response) => {
            log.info('send hello request by axios')
            return response
        })
        .catch(function (error) {
            log.info(error)
        });
}


function go(options) {
    log.info('run function has been executed')

    try {

        log.info('build command execution')

        let hashcatCommands = buildExecutionCommands(options)

        log.info(hashcatCommands)

        let child = spawn('sudo -u ubuntu ' + hashcatPath + 'hashcat.bin', hashcatCommands, {
            shell: true
        })

        outputDict = []

        child.stdout.on('data', (data) => {
            let stdout = data.toString('utf8');
            outputDict.push(stdout)

            log.info(stdout)
            log.info('print stdout')

            sendStdoutData(stdout)
        });

        child.stdout.on('error', (err) => {
            log.info('error with print stdout')

            sendStdoutData(err)
        })


    } catch (error) {
        log.info(error)

        endStdoutData(error)
        res.send(error)
    }
}

setTimeout(async () => {

    log.info("Start from 'setTimeout' function")

    await sayHello(JSON.stringify({
        hello: "hello"
    }))
    
    instance_uuid = data['guid'];
    log.info("get uuid from server: " + data['guid'])


    go(data)

}, 2000)

app.listen(PORT, () => {
    console.log("Start listener on port " + PORT)
    log.info("Start listener on port " + PORT)
})