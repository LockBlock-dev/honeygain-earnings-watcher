const { log, getOld, getNew, bytesToSize, shortEnglishHumanizer } = require("./util.js");

module.exports = async (clients, postman) => {
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

    let totalCredits = 0;
    let gathering = 0;
    let streaming = 0;
    let payoutCredits = 0;

    let devices = [];

    for (let i = 0; i < clients.length; i++) {
        let {
            total_credits: newTotalCredits,
            gathering_bytes: newGatheringBytes,
            streaming_seconds: newStreamingSeconds,
        } = getOld(clients[i].ref, "today");
        totalCredits -= newTotalCredits;
        gathering -= newGatheringBytes;
        streaming -= newStreamingSeconds;

        let {
            total_credits: oldTotalCredits,
            gathering_bytes: oldGatheringBytes,
            streaming_seconds: oldStreamingSeconds,
        } = await getNew(clients[i], "today");
        totalCredits += oldTotalCredits;
        gathering += oldGatheringBytes;
        streaming += oldStreamingSeconds;

        let newBalances = await getNew(clients[i], "balances");
        payoutCredits = newBalances.data.payout.credits;

        devices = devices.concat((await clients[i].devices()).data);
    }

    let difference = totalCredits;
    let active = devices.filter((device) => device.status === "active");

    const bottom = () => {
        embed.fields.push(
            {
                name: "Active devices",
                value: `${active.length} devices`,
            },
            {
                name: "Total devices",
                value: `${devices.length} devices`,
            }
        );
    };

    if (difference > 0) {
        embed.color = 0x00bb6e;
        embed.description = "Balance update";
        embed.fields.push(
            {
                name: "Earned",
                value: `+ ${difference.toFixed(2)} CR | + ${(difference / 1000).toFixed(2)}$`,
                inline: true,
            },
            {
                name: "Traffic",
                value: `+ ${bytesToSize(gathering.toFixed(1))}`,
                inline: true,
            },
            {
                name: "Content Delivery",
                value: `+ ${shortEnglishHumanizer(streaming.toFixed(1))}`,
                inline: true,
            },
            {
                name: "Balance",
                value: `${payoutCredits} CR | ${(payoutCredits / 1000).toFixed(2)}$`,
                inline: true,
            }
        );
        bottom();
    } else if (difference === 0) {
        embed.color = 0xff0101;
        embed.description = "Balance didn't change";
        embed.fields.push(
            {
                name: "Earned",
                value: `+ ${difference.toFixed(2)} CR | + ${(difference / 1000).toFixed(2)}$`,
                inline: true,
            },
            {
                name: "Traffic",
                value: `+ ${bytesToSize(gathering.toFixed(1))}`,
                inline: true,
            },
            {
                name: "Content Delivery",
                value: `+ ${shortEnglishHumanizer(streaming.toFixed(1))}`,
                inline: true,
            },
            {
                name: "Balance",
                value: `${payoutCredits} CR | ${(payoutCredits / 1000).toFixed(2)}$`,
                inline: true,
            }
        );
        bottom();
    }

    log("Total report sent", "success");
    postman.send(null, [embed]);
};
