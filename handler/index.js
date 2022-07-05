const hashcatPath = "~/hashcat/hashcat-6.2.2/"
const flags = require('../config/hashcatFlags.json')
const axios = require('axios')
const log = require('../logger')
const {
    spawn
} = require('child_process')
let instanceUuid = null; // instance uuid - initiate after saying hello to main server
let commands = []
let outputDict = []
const {
    data
} = require('../hashcat-process.json')

let headers = {
    camp: data._id,
    instance: null,
    authorization: data['token'],
    'User-Agent': data['settings']['authorized_user_agent']
}

log.info('Service loaded')

function buildExecutionCommands(options) {

    commands = []
    console.log('build hashcat command...');

    if (options['hashcat_config']["hash-type"] || options['hashcat_config']["hash-type"] === 0) {
        setCommand(flags["hash-type"], '=', options['hashcat_config']["hash-type"].toString())
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

    if (options['hashcat_config']["skip"] !== undefined && options['hashcat_config']["skip"] !== null) {
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

function sendHashcatOutpot(stdout) {
    if (stdout.toString() !== "") {
        return axios.post(data.control_server + '/hook', {
            data: stdout.toString(),
            timestamp: Date.now()
        }, {
            headers: { ...headers, 'instance-uuid': instanceUuid }
        })
            .then(() => {
                log.info('send hashcat stdout by axios')
            })
            .catch((error) => {
                console.log(error);
                log.info(error)
            });
    }
}

async function sayHello(params) {
    return axios.post(data.control_server + '/hook?hello=hello', {
        data: params,
        timestamp: Date.now()
    }, {
        headers: { ...headers, 'instance-uuid': data['guid'] }
    })
        .then((response) => {
            log.info('Send hello request by axios')
            log.info(response.data)
            if(response.data.instance._id !== undefined) {
                headers['instance'] = response.data.instance._id;
            }

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
            let stdout = data.toString('utf8').trim();
            outputDict.push(stdout)

            log.info(stdout)
            log.info('print stdout')

            sendHashcatOutpot(stdout)
        });

        child.stdout.on('error', (err) => {
            log.info('error with print stdout')

            sendHashcatOutpot(err)
        })

    } catch (error) {
        log.info(error)
        sendHashcatOutpot(error)
    }
}


setTimeout(async () => {

    log.info("Start from 'setTimeout' function")

    instanceUuid = data['guid'];

    await sayHello(JSON.stringify({
        hello: "hello"
    }))

    log.info("get uuid from server: " + data['guid'])

    go(data)

}, 3000)