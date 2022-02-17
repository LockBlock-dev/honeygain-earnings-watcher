const fs = require("fs");
const axios = require("axios").default;
const { Client } = require("honeygain.js");
const { Webhook } = require("simple-discord-webhooks");
const { log, delay, getOld } = require("./util.js");
const handleTotal = require("./handleTotal.js");
const handlePayout = require("./handlePayout.js");
const config = require("../config.js");
const pkg = require("../package.json");

const postman = new Webhook(config.discordWebhookURL);
const webhookReg = /https:\/\/discord.com\/api\/webhooks\/\d{18}\/.+/;
const files = ["today", "balances"];
const clients = [];

config.authTokens.forEach((token) => {
    let client = new Client();
    client.login(token);
    clients.push(client);
});

const init = async (client) => {
    try {
        await client.me();
    } catch (e) {
        log("Couldn't log into HoneyGain, check your Authorization token!", "warn");
        return false;
    }

    if (!webhookReg.test(config.discordWebhookURL)) {
        log("Discord Webhook URL is invalid!", "warn");
        return false;
    }

    return true;
};

const checkUpdate = async () => {
    const version = (
        await axios.get(
            "https://raw.githubusercontent.com/LockBlock-dev/honeygain-earnings-watcher/master/package.json"
        )
    ).data.version;

    if (version !== pkg.version)
        log(`An update is available! v${pkg.version} => v${version}`, "info");
};

const run = async () => {
    log(`Welcome to HoneyGain Earnings Watcher v${pkg.version}`, "success");

    for (let i = 0; i < clients.length; i++) {
        let test = await init(clients[i]);

        if (!test) process.exit(1);

        const me = await clients[i].me();
        clients[i].ref = me.data.referral_code;
        clients[i].email = me.data.email;

        if (!fs.existsSync("./data/")) fs.mkdirSync("./data");
        if (!fs.existsSync(`./data/${clients[i].ref}`)) fs.mkdirSync(`./data/${clients[i].ref}`);

        files.forEach(async (f) => {
            if (!fs.existsSync(`./data/${clients[i].ref}/${f}.json`))
                fs.writeFileSync(`./data/${clients[i].ref}/${f}.json`, "{}");

            if (Object.entries(getOld(clients[i].ref, f)).length === 0) {
                log(`No previous ${f} detected, downloading...`, "info");
                let data;

                switch (f) {
                    case "today":
                        data = await clients[i].today();
                        break;
                    case "balances":
                        data = await clients[i].balances();
                        break;
                }

                fs.writeFileSync(
                    `./data/${clients[i].ref}/${f}.json`,
                    JSON.stringify(data, null, 1),
                    "utf8"
                );
                log(`Previous ${f} downloaded`, "success");
            }
        });
    }

    log("Waiting for a balance update...", "info");

    let time = new Date();

    while (true) {
        let newTime = new Date();
        let diff = newTime.getUTCHours() === 0 ? -1 : time.getUTCHours() - newTime.getUTCHours();
        diff = -1;
        if (diff < 0) {
            time = newTime;

            config.modes.forEach((m) => {
                switch (m) {
                    case "total":
                        handleTotal(clients, postman);
                        break;
                    case "payout":
                        handlePayout(clients, postman);
                        break;
                }
            });

            await checkUpdate();
        }

        await delay(1000 * 60);
    }
};

run();
