exports.answer = async client => ({
	title: `XL Environment Variables`,
	description: `You can find the post on XL environment variables `
		+ `[HERE](https://goatcorp.github.io/faq/xl_troubleshooting#q-xl-environment-variables)`,
	color: client.config.EMBED_NORMAL_COLOR,
	footer: {
		"text": client.config.FRANZBOT_VERSION,
	},
});

exports.info = {
	name: "env",
	category: "info",
	aliases: [
		"envvar",
		"envvars",
		"environment",
		"environmentvar",
		"environmentvariable",
		"environmentvariables",
	],
};
