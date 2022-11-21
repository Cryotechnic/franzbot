/* eslint-disable max-len */
exports.answer = async client => ({
	title: `Plugin GUI does not load or Dalamud crashes on game start`,
	description: `Please check if you have other programs modifying FFXIV. More details `
		+ `[HERE](https://goatcorp.github.io/faq/xl_troubleshooting#q-how-come-the-in-game-addon-dalamud-doesnt-work-andor-plugins-dont-display)`,
	color: client.config.EMBED_NORMAL_COLOR,
	footer: {
		"text": client.config.FRANZBOT_VERSION,
	},
});

exports.info = {
	name: "conflict",
	category: "debug",
	aliases: [
		"conflictapp",
		"afterburner",
		"msiafterburner",
		"rivatuner",
		"rtss",
		"mactype",
		"hookfail",
		"specialk",
		"ghub",
		"obs",
		"fraps",
	],
};
