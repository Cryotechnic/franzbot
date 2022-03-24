/* eslint-disable max-len */
exports.answer = async client => ({
	title: `Please whitelist or make AV exceptions for XIV Launcher`,
	description: `Details can be found `
		+ `[HERE](https://goatcorp.github.io/faq/xl_troubleshooting#q-how-do-i-whitelist-xivlauncher-and-dalamud-so-my-antivirus-leaves-them-alone)`,
	color: client.config.EMBED_NORMAL_COLOR,
	footer: {
		"text": client.config.FRANZBOT_VERSION,
	},
});

exports.info = {
	name: "antivirus",
	category: "help",
	aliases: [
		"av",
		"anti-virus",
		"defender",
		"avast",
		"avg",
		"bitdefender",
		"kaspersky",
		"mcafee",
		"norton",
		"eset",
	],
};

