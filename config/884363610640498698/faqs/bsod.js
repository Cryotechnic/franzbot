/* eslint-disable max-len */
exports.answer = async client => ({
	title: `I think XIV Launcher is giving me a Blue Screen of Death`,
	description: `It's probably not XL's fault. But if you really think it is, please answer the questions `
		+ `[HERE](https://goatcorp.github.io/faq/xl_troubleshooting#q-i-think-xivlauncher-is-giving-me-a-blue-screen-of-death-what-information-would-help-narrow-this-down)`,
	color: client.config.EMBED_NORMAL_COLOR,
	footer: {
		"text": client.config.FRANZBOT_VERSION,
	},
});

exports.info = {
	name: "bsod",
	category: "help",
	aliases: [
		"BSOD",
		"bluescreen",
	],
};
