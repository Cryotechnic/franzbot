exports.answer = async client => ({
	title: `Developer Resources`,
	description: `The primary developer resources should all be on their relevant GitHub pages `
		+ `but for some quick links to a few common resources, see our FAQ post `
		+ `[HERE](https://goatcorp.github.io/faq/development)`,
	color: client.config.EMBED_NORMAL_COLOR,
	footer: {
		"text": client.config.FRANZBOT_VERSION,
	},
});

exports.info = {
	name: "dev",
	category: "info",
	aliases: [
		"xldev",
		"xivlauncherdev",
		"dalamuddev",
		"plugindev",
		"development",
		"xldevelopment",
		"xivlauncherdevelopment",
		"dalamuddevelopment",
		"plugindevelopment",
	],
};
