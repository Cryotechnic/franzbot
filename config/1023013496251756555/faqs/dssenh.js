/* eslint-disable max-len */
exports.answer = async client => ({
	title: `SSL/TLS issues on wine?`,
	description: `If you're running into SSL/TLS issues while using Wine/Lutris, this may `
		+ `be part of recent changes to your distro's SSL configuration. Especially on newer `
		+ `distributions. \n\nSee the FAQ for more details `
		+ `[HERE](https://goatcorp.github.io/faq/xl_troubleshooting#q-im-on-linux-and-i-keep-getting-xivlauncher-failed-to-update-errors)`,
	color: client.config.EMBED_NORMAL_COLOR,
	footer: {
		"text": client.config.FRANZBOT_VERSION,
	},
});

exports.info = {
	name: "test",
	category: "help",
	aliases: [],
};
