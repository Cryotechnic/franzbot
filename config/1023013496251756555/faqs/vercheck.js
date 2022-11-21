/* eslint-disable max-len */
exports.answer = async client => ({
	title: `How do I fix a version check error when trying to update FFXIV?`,
	description: `You'll need to make an edit to your FFXIVBOOT.cfg file.`
		+ `More Info: [HERE](https://goatcorp.github.io/faq/xl_troubleshooting#q-how-do-i-fix-a-version-check-error-when-trying-to-update-ffxiv
						)`,
	color: client.config.EMBED_NORMAL_COLOR,
	footer: {
		"text": client.config.FRANZBOT_VERSION,
	},
});

exports.info = {
	name: "vercheck",
	category: "help",
	aliases: [
		"versioncheck",
		"versionfail",
		"bootcheck",
		"ffxivboot",
	],
};
