const express = require('express')
const app = express()
const PORT = process.env.PORT || 4444
const flags = require('./config/hashcatFlags.json')
const {
    spawn
} = require('child_process')
const fs = require("fs");
const axios = require('axios')
const hascatPath = "~/hashcat/hashcat-6.2.2/"
const commands = []
const outputDict = []
const {
    data
} = require('./hashcat-process.json')

app.use(express.json())

const CONTROL_SERVER_PATH = 'https://55479412ee7f.ngrok.io'

function buildExecutionCommands(options) {

    console.log('build hashcat command...');

    if (options["hash-type"]) {
        setCommand(flags["hash-type"], '=', options["hash-type"])
    }

    if (options["attack-mode"] == "0" || options["attack-mode"] == "1" || options["attack-mode"] == "3" || options["attack-mode"] == "6" || options["attack-mode"] == "7") {
        setCommand(flags["attack-mode"], '=', options["attack-mode"])
    }

    if (options['status-json']) {
        setCommand(flags["status-json"], null, null)
    }

    if (options['rules-file']) {
        setCommand(flags["rules-file"], '=', hascatPath + "rules/" + options["rules-file"])
    }

    if (options['hash-file']) {
        setCommand(' ', '', 'crackme.txt')
    }

    if (options['status-time']) {
        setCommand(flags["status-timer"], '=', options["status-timer"])
    }

    if (options.wordlist) {
        setCommand(' ', '', options.wordlist)
    }

    if (options["outfile"]) {
        setCommand(flags["outfile"], '=', options["outfile"])
    }

    if (options["show"]) {
        setCommand(flags["show"], null, null)
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

    if (options["status-timer"]) {
        setCommand(flags["status-timer"], null, null)
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

async function getS3File(bucket, key) {
    return axios.post(CONTROL_SERVER_PATH + '/get-file', {
        bucket: bucket,
        key: key
    }).then((result) => {
        fs.writeFile('~/hashcat/hashcat-6.2.2/crackme.txt', result.data, {
            encoding: 'ascii'
        }, (err, data) => {
            if (err) {
                console.log(err);
            }
            console.log(data);
        })
    }).catch(err => {
        console.log(err);
    })
}


function sendStdoutData(stdout) {

    console.log('send hashcat stdout...');

    // console.log({data: stdout});
    return axios.post(CONTROL_SERVER_PATH + '/hook', {
            data: stdout
        })
        .then(() => {
            console.log('ok');
        })
        .catch(function (error) {
            console.log(error);
        });
}


async function run(options) {
    try {
        console.log('run function execute');

        await getS3File(data['hash-file-bucket'], data['hash-file-key'])
            .then(() => {
                let hashcatCommands = buildExecutionCommands(options)

                console.log(hashcatCommands);

                let child = spawn(hascatPath + 'hashcat.bin', hashcatCommands, {
                    shell: true
                })

                console.log('before child.stdout');

                child.stdout.on('data', (data) => {
                    console.log(`child stdout:\n${data}`);
                    let stdout = data.toString('utf8');
                    outputDict.push(stdout)

                    sendStdoutData(stdout)
                });

                child.stdout.on('error', (err) => {
                    sendStdoutData(err)
                })
            })


    } catch (error) {
        console.log(error);
        res.send(error)
    }

}

setTimeout(async () => {
    await run(data)
}, 1000)

app.listen(PORT, () => {
    console.log("Start listener on port " + PORT)
})