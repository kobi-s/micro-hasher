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

app.use(express.json())

log.info('service loaded')

const headers = {
    Camp: data.campaign || 'DEV'
}

const CONTROL_SERVER_PATH = 'https://643b43156d02.ngrok.io'

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

    if (options['rule']) {
        setCommand('-r', ' ', hascatPath + "rules/" + options["rule"])
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

    if (options['wordlist']) {
        setCommand(options.wordlist, null, null)
    }

    if (options["outfile"]) {
        setCommand(flags["outfile"], '=', options["outfile"])
    }

    // if (options["show"]) {
    //     setCommand(flags["show"], null, null)
    // }

    if (options["username"]) {
        setCommand(flags["username"], null, null)
    }

    if (options["force"]) {
        setCommand(flags["force"], null, null)
    }

    if (options["status"]) {
        setCommand(flags["status"], null, null)
    }

    if (options["potfile-path"]) {
        setCommand(flags["potfile-path"], '=', options["potfile-path"])
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

app.get("/status", (req, res) => {
    return res.send([])
})

app.get("/log", (req, res) => {
    return res.download(__dirname + '/micro-hasher-process.log')
})

app.get("/cracked.txt", (req, res) => {
    return res.download(__dirname + '/cracked.txt')
})

app.post('/run', (req, res) => {
    
    const options = req.body
    
    run(options)

    res.send(true)

})

function sendStdoutData(stdout) {

    console.log('send hashcat stdout...');

    return axios.post(CONTROL_SERVER_PATH + '/hook', {
        data: stdout,
        timestamp: Date.now()
    },{
        headers: headers
    })
        .then(() => {
            console.log('ok');
        })
        .catch(function (error) {
            console.log(error);
        });
}


function run(options) {
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
            console.log(`child stdout:\n${data}`);
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
        console.log(error);

        log.info('error with with runinng this process')
        log.info(error)

        endStdoutData(error)
        res.send(error)
    }
}

setTimeout(async () => {

    log.info("Start from 'setTimeout' function")

    sendStdoutData({
        hello: "hello"
    })

    run(data)

}, 2000)

app.listen(PORT, () => {
    console.log("Start listener on port " + PORT)
    log.info("Start listener on port " + PORT)
})