const { log, getNew } = require("./util.js");

module.exports = async (clients, postman, jmpt) => {
    const embed = {
        title: "HoneyGain gains report",
        thumbnail: {
            url: "https://cdn.discordapp.com/attachments/943520861565091891/943826193734590494/hg_logo_icon_color_dark.png",
        },
        fields: [],
        footer: {
            text: "HoneyGain Earnings Watcher © LockBlock-dev",
        },
    };

    if (!jmpt) {
        const emails = [];

        for (let i = 0; i < clients.length; i++) {
            let newBalances = await getNew(clients[i], "balances");

            if (newBalances.data.payout.credits >= newBalances.data.min_payout.credits) {
                emails.push(clients[i].email);
            }
        }

        if (emails.length > 0) {
            embed.color = 0x00bb6e;
            embed.description = "Payout available!";
            embed.fields.push({
                name: "The following emails can redeem their earnings",
                value: `\`\`\`${emails.join("\n")}\`\`\``,
            });

            log("Payout report sent", "success");
            postman.send(null, [embed]);
        }
    }
};
