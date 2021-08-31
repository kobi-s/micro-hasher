const express = require('express')
const app = express()
const PORT = process.env.PORT || 4444
const flags = require('./config/hashcatFlags.json')
const {
    spawn
} = require('child_process')
const axios = require('axios')
const log = require('simple-node-logger').createSimpleFileLogger('micro-hasher-process.log');
const hascatPath = "~/hashcat/hashcat-6.2.2/"
let commands = []
let outputDict = []
const {
    data
} = require('./hashcat-process.json')

let instance_uuid = null; // instance uuid initiate after saying hello to main server

app.use(express.json())

log.info('service loaded')

const headers = {
    Camp: data._id,
    Authorization: 'bearer ' + data['token']
}

function buildExecutionCommands(options) {

    console.log('build hashcat command...');
    commands = []

    if (options["hash-type"]) {
        setCommand(flags["hash-type"], '=', options["hash-type"])
    }

    if (options["attack-mode"] == "0" || options["attack-mode"] == "1" || options["attack-mode"] == "3" || options["attack-mode"] == "6" || options["attack-mode"] == "7") {
        setCommand(flags["attack-mode"], '=', options["attack-mode"])
    }

    if (options['status-json']) {
        setCommand(flags["status-json"], null, null)
    }

    if (Array.isArray(options['rules'])) {
        options['rules'].forEach(rule => {
            setCommand('-r', ' ', hascatPath + "rules/" + rule)
        })
    }

    if (options['hash-file']) {
        setCommand('~/micro-hasher/crackthis.txt', null, null)
    }

    if (options['hash']) {
        setCommand(options["hash"], null, null)
    }

    if (options['status-timer']) {
        setCommand(flags["status-timer"], '=', options["status-timer"])
    }

    if (options["attack-mode"] == "1") {
        setCommand(options['combination-wordlist'].dir, null, null)
    }

    if (options['wordlist'] && options["attack-mode"] !== "7") {
        setCommand(options.wordlist, null, null)
    }

    if (options["attack-mode"] == "6" && options["mask"]) {
        setCommand(options.wordlist, null, null)
        setCommand(options["mask"], null, null)
    }

    if (options["attack-mode"] == "7" && options["mask"]) {
        setCommand(options["mask"], null, null)
        setCommand(options.wordlist, null, null)
    }

    if (options["outfile"]) {
        setCommand(flags["outfile"], '=', options["outfile"])
    }

    if (options["username"]) {
        setCommand(flags["username"], null, null)
    }

    if (options["force"]) {
        setCommand(flags["force"], null, null)
    }

    if (options["status"]) {
        setCommand(flags["status"], null, null)
    }

    if (options["mask"] && options['attack-mode'] == "3") {
        setCommand(options["mask"], null, null)
    }

    if (options["increment"]) {
        setCommand(flags["increment"], null, null)
    }

    if (options["increment-min"] && options["increment"]) {
        setCommand(flags["increment-min"], '=', options['increment-min'])
    }

    if (options["increment-max"] && options["increment"]) {
        setCommand(flags["increment-max"], '=', options['increment-max'])
    }

    if (options["potfile-path"]) {
        setCommand(flags["potfile-path"], '=', options["potfile-path"])
    }

    if (options["generate-rule"]) {
        setCommand(flags["generate-rule"], null, null)
    }

    if (options["generate-rules-func-min"] && options["generate-rule"]) {
        setCommand(flags["generate-rules-func-min"], '=', options['generate-rules-func-min'])
    }

    if (options["generate-rules-func-max"] && options["generate-rule"]) {
        setCommand(flags["generate-rules-func-max"], '=', options['generate-rules-func-max'])
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

app.get("/ping", (req, res) => {
    return res.send('pong')
})

app.get("/log", (req, res) => {
    return res.download(__dirname + '/micro-hasher-process.log')
})

app.get("/cracked.txt", (req, res) => {
    return res.download(__dirname + '/cracked.txt')
})


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
        headers: headers
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

        let child = spawn('sudo -u ubuntu ' + hascatPath + 'hashcat.bin', hashcatCommands, {
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

    const response = await sayHello(JSON.stringify({
        hello: "hello"
    }))

    log.info("get uuid from server: " + instance_uuid)
    instance_uuid = response.data.instance_uuid;

    go(data)

}, 2000)

app.listen(PORT, () => {
    console.log("Start listener on port " + PORT)
    log.info("Start listener on port " + PORT)
})