/* eslint-disable max-len */
const {
	MessageEmbed,
} = require('discord.js');
const got = require('got');

const URLSafeBase64 = require('urlsafe-base64');

const logger = require("../modules/Logger");

const {
	SECOND, MINUTE, timeoutSet, timeoutEnded, resetTimeout,
} = require("../modules/triggerTimeoutManager");

const {
	checkTheMessage,
} = require("../modules/checkTheMessage");

// The MESSAGE event runs anytime a message is received
// Note that due to the binding of client to every event, every event
// goes `client, other, args` when this function is run.
module.exports = async (client, message) => {
	// It's good practice to ignore other bots. This also makes your bot ignore itself
	// and not get into a spam loop (we call that "botception").
	// unless it's an announcement channel, since we want to publish posts...
	if (message.partial) {
		message = await message.fetch()
			.catch(error => {
				console.log('Something went wrong when fetching the message: ', error);
			});
	}
	// client.logger.debug(`Message type: ${message.channel.type}`);

	// I swear to god if the channel type enum changes again, I'll scream. This should work. For now.
	// (message.channel.type === 'GUILD_NEWS' || message.channel.type.match(/news/gui))

	if (!(message.channel.type === 'GUILD_NEWS' || message.channel.type.match(/news/gui)) && message.author.bot) {
		return;
	}

	// Franzbot should ignore webhooks too, unless it's an announcement channel
	if (!(message.channel.type === 'GUILD_NEWS' || message.channel.type.match(/news/gui)) && message.webhookID) {
		return;
	}

	const isDirectMessage = message.channel.type == "DM";


	// Channel-specific markers
	const GoatTriggers = [
		client.config.GUILDID_TESTING, // franzbot testing - general
		client.config.GUILDID_GOAT, // Goatplace - general
		client.config.GUILDID_HELIOSPHERE,
		client.config.GUILDID_XIVONMAC, // XIV on Mac - general
		client.config.GUILDID_PENUMBRA,
	];
	const MeteorTriggers = [
		client.config.GUILDID_TESTING, // franzbot testing - general
		client.config.GUILDID_METEOR, // Meteor - general
	];
	/*
	const ZuTriggers = [
		client.config.GUILDID_TESTING, // franzbot testing - general
		client.config.GUILDID_ZU, // Zu - general
	];
	*/
	if (isDirectMessage) {
		console.log(`Received a DM from ${message.author.username}.`);
	}
	else {
		console.log(`GUILD: ${message.guild.name} ${message.guild?.id ?? "Not a guild"}`);
		console.log(`CHANNEL: ${message.channel.name} ${message.channel?.id ?? "Not a channel"}`);
	}

	// Checks if the bot was mentioned, with no message after it, returns the prefix.
	const prefixMention = new RegExp(`^\\s*<@!?${client.user.id}>\\s*$`, 'u');
	if (message.content.match(prefixMention)) {
		message.channel.send(`My prefix on this guild is \`${client.config.prefix}\``);


		if (MeteorTriggers.includes(message.guild.id)) {
			const embedobj = {

				title: "Franzbot FAQ",
				description: `Supported FAQ commands listed below. Type \`${client.config.prefix}faq <topic>\` to display the content.`,
				color: client.config.EMBED_NORMAL_COLOR,
				footer: {
					"text": client.config.FRANZBOT_VERSION,
				},
				fields: [
					{
						"name": "Information",
						"value": "wiki status paru md5",
					},
					{
						"name": "Guides",
						"value": "compile config client",
					},
					{
						"name": "Tools",
						"value": "vs wamp",
					},
				],
			};
			message.channel.send(embedobj);
		}
		return;
	}

	// execute server-specific triggers
	if (!isDirectMessage) {
		client.perserversettings?.get(`${message.guild.id}-triggers`)?.forEach(trigger => {
			logger.debug(`Processing trigger: ${trigger.info.name}`);
			if (trigger.info.name !== "announcement publisher" && (message.author.bot || message.webhookID)) {
				// don't run triggers on bots or webhooks, unless it's to publish
				return;
			}
			trigger.execute(client, message);
		});
	}

	const forbidAny = []; // an array of regex, at least one must match to complain
	const forbidCount = []; // same value type, a minimum number must match
	const negateBadWords = []; // same type again, these matches count against the bad word matches
	let forbiddenMinCount; // the number of forbidCount match results to complain
	let adjustedMinCount; // the number of ADJUSTED bad word match results to complain
	let ignoredRoles = []; // an array of roles to ignore messages from
	let replyMessage; // whatever this is, it gets sent via `message.reply()` unless it's falsey

	// Triggers for XIVLauncher and Dalamud functions
	if (isDirectMessage || GoatTriggers.includes(message.guild?.id)) {
		console.log(`Found in GoatTriggers: ${isDirectMessage ? "direct message" : message.channel.name}`);

		// some debugging
		let customChannel = null;
		if (isDirectMessage || message.guild?.id === client.config.GUILDID_GOAT) {
			customChannel = await client.channels.fetch(client.config.CHANNELID_RELAY_GOAT);
		}
		if (message.guild.id === client.config.GUILDID_HELIOSPHERE) {
			customChannel = await client.channels.fetch(client.config.CHANNELID_RELAY_GOAT);
		}
		if (message.guild?.id === client.config.GUILDID_XIVONMAC) {
			customChannel = await client.channels.fetch(client.config.CHANNELID_RELAY_XIVONMAC);
		}
		if (message.guild?.id === client.config.GUILDID_TESTING || client.config.DEBUGMODE) {
			customChannel = await client.channels.fetch(client.config.CHANNELID_RELAY_TEST);
		}

		// check if it's a dalamud log
		if (message.attachments.size > 0) {
			console.log("Found an attachment in this message");

			message.attachments.forEach(async attachment => {
				console.log(attachment.name);
				if (isDirectMessage && attachment.name.match(/(aria|output|dalamud|message|dalamudConfig|launcher|dxdiag|event|SquirrelSetup|patcher).*\.(log|txt|json|evtx)$/gui)) {
					// sane filesizes only
					if (attachment.size > (6 * 1024 * 1024)) {
						console.log("Big chonker file. That's a lot of text...");
						message.channel.send("This file is pretty big and has not be relayed.\n"
							+ "Perhaps you'd like to generate a fresh log that's smaller?\n\n"
							+ "To do that, just delete your log file and try to relaunch with XIVLauncher. "
							+ "Then upload the new log, which should be much smaller!");
						return;
					}

					console.log(`Launcher or Dalamud log upload: ${attachment.attachment}`);
					// const response = await got(attachment.attachment);
					console.log(`Fetched custom channel to relay: ${customChannel.name}`);
					await customChannel.send({
						content: `${message.author.username} (${message.author}) uploaded an attachment in DMs`,
						files: [attachment],
					});
				}

				// relay crash dumps from goatplace (or DMs)
				if (attachment.name.match(/.*\.(dmp)$/gui)) {
					console.log(`Dalamud crash dump upload: ${attachment.attachment}`);
					// const response = await got(attachment.attachment);
					console.log(`Fetched custom channel to relay: ${customChannel.name}`);
					const relayedMessage = await customChannel.send({
						content: `${message.author.username} (${message.author}) uploaded a crash log in ${isDirectMessage ? "DMs" : `${message.channel} from **${message.guild.name}**`}.`,
						files: [attachment],
					});


					if (isDirectMessage) {
						await message.channel.send({
							content: `Franzbot has relayed this crash dump to a private channel in **${customChannel.guild.name}** for analysis.`,
						});
					}
					else {
						const replymsg = await message.reply({
							embeds: [
								{
									"description": `${message.author}, Franzbot has relayed this crash dump to a private channel in `
										+ `**${customChannel.guild.name}** for analysis.\n\n`
										+ `Support staff can find it [here](${relayedMessage.url})\n\n`
										+ `The original post will be removed.\n\n`
										+ `Orginal Message:\n`
										+ `>>> ${message.content}`,
								},
							],
							allowedMentions: {
								repliedUser: false,
							},
						});
						setTimeout(() => message.delete().catch(console.error), 5 * SECOND);

						await customChannel.send({
							embeds: [
								{
									"description": `Original post: ${replymsg.url}`,
								},
							],
						});
					}
				}

				// relay dalamud.injector.log files from goatplace (or DMs)
				const DALAMUD_INJECTOR_RELAY_ENABLE = true;
				if (DALAMUD_INJECTOR_RELAY_ENABLE && attachment.name.match(/dalamud\.injector.*\.(log)$/gui)) {
					console.log(`Dalamud injector log upload: ${attachment.attachment}`);
					// const response = await got(attachment.attachment);
					console.log(`Fetched custom channel to relay: ${customChannel.name}`);
					const relayedMessage = await customChannel.send({
						content: `${message.author.username} (${message.author}) uploaded a dalamud.injector log in ${isDirectMessage ? "DMs" : `${message.channel} from **${message.guild.name}**`}.`,
						files: [attachment],
					});


					if (isDirectMessage) {
						await message.channel.send({
							content: `Franzbot has relayed this log to a private channel in **${customChannel.guild.name}** for analysis by select members of the support team.`,
						});
					}
					else {
						const replymsg = await message.reply({
							embeds: [
								{
									"description": `${message.author}, Franzbot has relayed this log to a private channel in `
										+ `**${customChannel.guild.name}** for analysis.\n\n`
										+ `Support staff can find it [here](${relayedMessage.url})\n\n`
										+ `The original post will be removed.\n\n`
										+ `Orginal Message:\n`
										+ `>>> ${message.content}`,
								},
							],
							allowedMentions: {
								repliedUser: false,
							},
						});

						// injector log no longer has the thing unless it's debug.
						// TODO: parse injector log and verbose xlcore logs and strip that out.
						await message.removeAttachments().catch(console.error);
					}
				}

				// relay tspack files from goatplace (or DMs)
				const TSPACK_RELAY_ENABLE = true;
				if (attachment.name.match(/.*\.(tspack)$/gui)) {
					console.log(`Troubleshooting pack upload: ${attachment.attachment}`);
					// const response = await got(attachment.attachment);
					console.log(`Fetched custom channel to relay: ${customChannel.name}`);
					const relayedMessage = await customChannel.send({
						embeds: [
							{
								"description": `${message.author.username} (${message.author}) uploaded a troubleshooting pack in `
									+ `${isDirectMessage ? "DMs" : `${message.channel} from **${message.guild.name}**`}.\n\n`
									+ `Orginal Message:\n`
									+ `>>> ${message.content}`,
							},
						],
						files: [attachment],
					});


					// set up proxied url for loggy
					// console.log(relayedMessage.attachments.first().proxyURL);
					// console.log(relayedMessage.attachments.first().url);
					const url = `https://wiki.ffxivrp.org/${relayedMessage.channelId}/${relayedMessage.attachments.first().id}/${relayedMessage.attachments.first().name}`;
					// console.log(url);
					const base64url = new Buffer.from(url).toString('base64');
					const safebase64url = URLSafeBase64.encode(new Buffer.from(url));

					const loggyUrl = `https://loggy.goat.place/?url=${safebase64url}`;

					if (isDirectMessage) {
						await message.reply({
							embeds: [
								{
									"description": `${message.author}, Franzbot has relayed this file to a private channel in **${customChannel.guild.name}** for analysis by select members of the XIVLauncher/Dalamud support team.`,
								},
							],
							allowedMentions: {
								repliedUser: false,
							},
						});
						await message.channel.send({
							embeds: [
								{
									"description": `Read provided logs on [Loggy](${loggyUrl})`,
								},
							],
						});
					}

					if (!isDirectMessage && TSPACK_RELAY_ENABLE) {
						const replymsg = await message.reply({
							embeds: [
								{
									"description": `${message.author}, Franzbot has relayed this file to a private channel in `
										+ `**${customChannel.guild.name}** for analysis by select members of the support team.\n\n`
										+ `Support staff can find it [here](${relayedMessage.url})\n\n`
										+ `**NOTE**: Please make sure to provide some context about this if you haven't already.` // ,
										+ `The original post will be removed.\n\n`
										+ `Orginal Message:\n`
									    + `>>> ${message.content}`,
								},
							],
							allowedMentions: {
								repliedUser: false,
							},
						});
						setTimeout(() => message.delete().catch(console.error), 5 * SECOND);
					}

					// send our loggy url to the relay channel
					await customChannel.send({
						embeds: [
							{
								"description": `Read provided logs on [Loggy](${loggyUrl})\n\n`
									// + `Original post: ${replymsg.url}`,
									+ `Original post: ${message.url}`,
							},
						],
					});
				}

				// handle the dalamud.txt file
				if (attachment.name.match(/(dalamud|output|launcher|message).*\.(log|txt)$/gui)) {
					// read the data
					console.log(`Processing Dalamud or XIVLauncher log called ${attachment.name} `
						+ `in ${message.guild.name} #${message.channel.name}`);

					// const dalamudLogParser = require("../modules/parse/dalamudLog");

					try {
						const response = await got(attachment.attachment);

						// const parseResults = dalamudLogParser.parse(client, response?.body);

						/*
						if (message.channel.isThread()) {
							client.logger.debug("THIS IS A THREAD");
							console.log(response?.body);
							client.logger.debug("END OF THREAD");
						}
						*/
						let foundCustomRepoPluginInstalled = false;
						let anyCustomRepoPluginsLoaded = false;

						const logdata = response?.body;
						const logdresults = logdata.match(/TROUBLESHOOTING:(.*)/gu);
						if (logdresults?.length > 0) {
							let data = logdresults[logdresults.length - 1];
							data = data.slice(16);
							// console.log(`TROUBLESHOOTING:\n${data}`);

							// decrypt from base64
							const buffer = new Buffer.from(data, 'base64');
							data = buffer.toString('utf8');
							// console.log(`TROUBLESHOOTING decoded:\n${data}`);
							data = JSON.parse(data);

							// make fancy embed and return
							const replymessage2 = new MessageEmbed()
								.setTitle(`${attachment.name} TROUBLESHOOTING parse results${client.config.DEBUGMODE ? " - Debug Version" : ""}`)
								.setDescription("Franzbot has parsed your logfile. "
									+ "Here's some information about the plugins that were loaded.")
								.setColor(13580863)
								.setFooter(`DalamudVersion: ${data.DalamudVersion}\n`
									+ `DalamudGitHash: ${data.DalamudGitHash}\n`
									+ `GameVersion: ${data.GameVersion}`);

							let plugintext = ">>> ";
							let overflowed = false;

							if (data?.LoadedPlugins?.length == 0) {
								replymessage2
									.addField(
										"Installed plugins",
										"No plugins installed according to troubleshooting blob."
									);
							}
							else if (data.LoadedPlugins.length == 1) {
								plugintext += `**${data.LoadedPlugins[0].Name}**`
									+ ` - ${data.LoadedPlugins[0].AssemblyVersion}\n`;

								replymessage2
									.addField(
										"Installed plugin",
										plugintext
									);
							}
							else {
								const pluginlist = data.LoadedPlugins
									.sort((a, b) => (a.Name.toLowerCase() > b.Name.toLowerCase() ? 1 : -1));

								const officialpluginsources = [
									null,
									"",
									"OFFICIAL",
									"https://kamori.goats.dev/Plugin/PluginMaster",
									"https://raw.githubusercontent.com/goatcorp/DalamudPlugins/api6/pluginmaster.json",
								];

								const devpluginsources = [
									null,
									"",
								];

								const officialplugins = pluginlist.filter(plugin => officialpluginsources.includes(plugin.InstalledFromUrl));
								// const devplugins = pluginlist.filter(plugin => devpluginsources.includes(plugin.InstalledFromUrl));
								const unofficialplugins = pluginlist.filter(plugin => !officialpluginsources.includes(plugin.InstalledFromUrl));

								// List all officially supported plugins
								officialplugins.forEach(plugin => {
									let prefix = "";
									let suffix = "\n";

									if (data.PluginStates && plugin.InternalName in data.PluginStates) {
										const state = data.PluginStates[plugin.InternalName];
										const everStartedLoading = data.EverStartedLoadingPlugins?.includes(plugin.InternalName);
										let startedLoadingSuffix = "";
										if (state === "Loaded") {
											prefix = "✅ ";
										}
										else if (everStartedLoading) {
											prefix += "⚠️ ";
											startedLoadingSuffix = ", but started loading";
										}
										else {
											prefix += "❌ ";
										}
										suffix = ` _(${state}${startedLoadingSuffix})_\n`;
									}

									plugintext += prefix;
									plugintext += plugin.Disabled
										? `~~**${plugin.Name}** - ${plugin.AssemblyVersion}~~`
										: `**${plugin.Name}** - ${plugin.AssemblyVersion}`;
									plugintext += suffix;

									if (plugintext.length > 900) {
										replymessage2
											.addField(
												overflowed ? "Officially supported plugins continued..." : "Installed officially supported plugins",
												plugintext
											);
										plugintext = ">>> ";
										overflowed = true;
									}
								});

								if (overflowed) {
									replymessage2
										.addField(
											"Officially supported plugins continued....",
											plugintext
										);
								}
								else {
									replymessage2
										.addField(
											"Last seen installed official plugins",
											plugintext
										);
								}

								// List all the unsupported plugins
								plugintext = ">>> ";
								overflowed = false;

								if (unofficialplugins.length >= 1) {
									foundCustomRepoPluginInstalled = true;

									unofficialplugins.forEach(plugin => {
										let prefix = "";
										let suffix = "\n";

										if (data.PluginStates && plugin.InternalName in data.PluginStates) {
											const state = data.PluginStates[plugin.InternalName];
											const everStartedLoading = data.EverStartedLoadingPlugins?.includes(plugin.InternalName);
											let startedLoadingSuffix = "";
											if (state === "Loaded") {
												prefix = "✅ ";
												anyCustomRepoPluginsLoaded = true;
											}
											else if (everStartedLoading) {
												prefix += "⚠️ ";
												startedLoadingSuffix = ", but started loading";
												anyCustomRepoPluginsLoaded = true;
											}
											else {
												prefix += "❌ ";
											}
											suffix = ` _(${state}${startedLoadingSuffix})_\n`;
										}

										plugintext += prefix;
										plugintext += plugin.Disabled
											? `~~**${plugin.Name}** - ${plugin.AssemblyVersion}~~`
											: `**${plugin.Name}** - ${plugin.AssemblyVersion}`;
										plugintext += suffix;

										if (plugintext.length > 900) {
											replymessage2
												.addField(
													overflowed ? "Unsupported plugins continued..." : "Installed custom repo / unsupported plugins",
													plugintext
												);
											plugintext = ">>> ";
											overflowed = true;
										}
									});

									if (overflowed) {
										replymessage2
											.addField(
												"Unsupported plugins continued....",
												plugintext
											);
									}
									else {
										replymessage2
											.addField(
												"Last seen installed custom repo / unsupported plugins",
												plugintext
											);
									}
								}
							}
							//
							replymessage2
								.addField(
									"Dalamud Testing",
									data.BetaKey ?? "null",
									true
								)
								.addField(
									"Plugin Testing",
									data.DoPluginTest ? "Yes" : "No",
									true
								)
								.addField(
									"Has third-party repos",
									data.HasThirdRepo ? "Yes" : "No"
								)
								.addField(
									"Loading all API levels",
									data.LoadAllApiLevels ? "Yes" : "No",
									true
								)
								.addField(
									"ForcedMinHook",
									data.ForcedMinHook ? "Yes" : "No",
									true
								)
								.addField(
									"InterfaceLoaded",
									data.InterfaceLoaded ? "Yes" : "No",
									true
								);

							if (data.EverStartedLoadingPlugins) {
								replymessage2
									.addField(
										"Third-party plugins enabled",
										anyCustomRepoPluginsLoaded ? "Yes" : "No"
									);
							}

							if (isDirectMessage) {
								customChannel.send({
									embeds: [replymessage2],
									allowedMentions: {
										repliedUser: false,
									},
								});
							}
							message.reply({
								embeds: [replymessage2],
								allowedMentions: {
									repliedUser: false,
								},
							}).catch(console.error);
						}

						const lastexpresults = logdata.match(/LASTEXCEPTION:(.*)/gu);
						if (lastexpresults?.length > 0) {
							let data = lastexpresults[lastexpresults.length - 1];
							data = data.slice(14);
							// console.log(`LASTEXCEPTION:\n${data}`);

							// decrypt from base64
							const buffer = new Buffer.from(data, 'base64');
							data = buffer.toString('utf8');
							// console.log(`LASTEXCEPTION decoded:\n${data}`);
							data = JSON.parse(data);

							// handle the injection error blob
							const timestamp = Math.round(Date.parse(data?.When) / 1000);

							const replymessage3 = new MessageEmbed()
								.setTitle(`${attachment.name} LASTEXCEPTION parse results${client.config.DEBUGMODE ? " - Debug Version" : ""}`)
								.setDescription("Franzbot has parsed your logfile. "
									+ "Here's some information about the last issue found in your log file.")
								.setColor(13580863)
								.setFooter(client.config.FRANZBOT_VERSION);

							const exceptionInfo = data?.Info;
							const exceptionContext = data?.Context;

							if (exceptionInfo.length > 0) {
								// console.log(`Long Info ${exceptionInfo.length} characters.`);
								if (exceptionInfo.length > 1024) {
									const temp = exceptionInfo.split("\r\n");
									// console.log(temp);
									// console.log(`Split into ${temp.length} lines`);
									let tempvalue = "";
									let overflowed = false;

									temp.forEach(line => {
										tempvalue += line;
										if (tempvalue.length > 700) {
											// console.log("Splitting Info into new field.");
											replymessage3.addField(
												"Info",
												`\`\`\`${tempvalue}\`\`\``
											);
											tempvalue = "";
											overflowed = true;
										}
									});

									if (overflowed) {
										replymessage3.addField(
											"Info continued",
											`\`\`\`${tempvalue}\`\`\``
										);
									}
								}
								else {
									replymessage3.addField(
										"Info",
										`\`\`\`${data?.Info}\`\`\``
									);
								}
							}

							if (exceptionContext.length > 0) {
								// console.log(`Long Context ${exceptionInfo.length} characters.`);
								if (exceptionContext.length > 1024) {
									const temp = exceptionContext.split("\r\n");
									// console.log(`Split into ${temp.length} lines`);
									let tempvalue = "";
									let overflowed = false;

									temp.forEach(line => {
										tempvalue += line;
										if (tempvalue.length > 700) {
											// console.log("Splitting Context into new field.");
											replymessage3.addField(
												"Context",
												`\`\`\`${tempvalue}\`\`\``
											);
											tempvalue = "";
											overflowed = true;
										}
									});

									if (overflowed) {
										replymessage3.addField(
											"Context continued",
											`\`\`\`${tempvalue}\`\`\``
										);
									}
								}
								else {
									replymessage3.addField(
										"Context",
										`\`\`\`${data?.Context}\`\`\``
									);
								}
							}

							replymessage3.addField(
								"Timestamp",
								`${data?.When}\n<t:${timestamp}:F>`
							);

							if (isDirectMessage) {
								customChannel.send({
									embeds: [replymessage3],
									allowedMentions: {
										repliedUser: false,
									},
								});
							}
							message.reply({
								embeds: [replymessage3],
								allowedMentions: {
									repliedUser: false,
								},
							}).catch(console.error);
						}

						if (foundCustomRepoPluginInstalled
							&& anyCustomRepoPluginsLoaded && (
							message.guildId === client.config.GUILDID_GOAT
							|| message.guildId === client.config.GUILDID_XIVONMAC
							|| message.guildId === client.config.GUILDID_TESTING)
						) {
							const nagMessage = require("../modules/parse/customrepoplugin.js");
							const nagMessageReply = await nagMessage.replyMessage(client);

							if (isDirectMessage) {
								customChannel.send({
									embeds: [nagMessageReply],
									allowedMentions: {
										repliedUser: false,
									},
								});
							}
							message.reply({
								embeds: [nagMessageReply],
								allowedMentions: {
									repliedUser: false,
								},
							}).catch(console.error);
						}

						const logxlresults = logdata.match(/TROUBLESHXLTING:(.*)/gu);
						if (logxlresults?.length > 0) {
							let data = logxlresults[logxlresults.length - 1];
							data = data.slice(16);
							console.log(`TROUBLESHXLTING:\n${data}`);

							// decrypt from base64
							const buffer = new Buffer.from(data, 'base64');
							data = buffer.toString('utf8');
							// console.log(`TROUBLESHXLTING decoded:\n${data}`);
							data = JSON.parse(data);

							// handle the injection error blob
							const timestamp = Math.round(Date.parse(data?.When) / 1000);

							/* eslint-disable sonarjs/no-duplicate-string */

							const troubleshxltingreplymessage = new MessageEmbed()
								.setTitle(`${attachment.name} XLTROUBLESHOOTING parse results${client.config.DEBUGMODE ? " - Debug Version" : ""}`)
								.setDescription("Franzbot has parsed your logfile. "
									+ "Here's some information about the last issue found in your log file.")
								.setColor(4886754);


							// launcher info
							troubleshxltingreplymessage
								.addField("XIVLauncher version", data.LauncherVersion, true)
								.addField("XL Git Hash", data.LauncherHash, true)
								.addField("Official XL Release", data.Official ? "yes" : "no", true);

							switch (data.Platform) {
								case 0:
									troubleshxltingreplymessage
										.addField("Platform", "Windows");
									break;
								case 1:
									troubleshxltingreplymessage
										.addField("Platform", "Wine on Linux");
									break;
								case 2:
									if (message.guildId === client.config.GUILDID_XIVONMAC) {
										troubleshxltingreplymessage
											.addField("Platform", "macOS");
									}
									else {
										troubleshxltingreplymessage
											.addField("Platform", "XLCore on Linux");
									}
									break;
								case 3:
									troubleshxltingreplymessage
										.addField("Platform", "macOS");
									break;
								default:
									break;
							}

							// launcher settings
							const troubleshxltingreplymessage2 = new MessageEmbed()
								.setColor(4886754)
								.setTitle("General Launcher Settings")
								.addField("Autologin", data.IsAutoLogin ? "enabled" : "disabled", true)
								.addField("DirectX", data.IsDx11 ? "dx11" : "dx9", true)
								.addField("DPI Aware", data.DpiAwareness ? "no" : "yes", true)
								.addField("Encrypted Arguments", data.EncryptArguments ? "enabled" : "disabled", true)
								// .addField("Steam Integration", data.SteamIntegration ? "enabled" : "disabled", true)
								.addField("UID Cache", data.IsUidCache ? "enabled" : "disabled", true);
							// dalamud injection
							troubleshxltingreplymessage2
								.addField("Dalamud", data.DalamudEnabled ? "enabled" : "disabled");
							if (data.DalamudEnabled) {
								switch (data.DalamudLoadMethod) {
									case 0:
										troubleshxltingreplymessage2
											.addField("Injection Method", "Entrypoint", true);
										break;
									case 1:
										troubleshxltingreplymessage2
											.addField("Injection Method", "DLL Injection", true);
										break;
									case 2:
										troubleshxltingreplymessage2
											.addField("Injection Method", "ACL Only", true);
										break;
									default:
										break;
								}

								troubleshxltingreplymessage2
									.addField("Injection Delay", data.DalamudInjectionDelay ? `${data.DalamudInjectionDelay}ms` : "0ms", true);
							}

							// game version info

							const troubleshxltingreplymessage3 = new MessageEmbed()
								.setColor(4886754)
								.setTitle("Game Version Information")
								.addField("A Realm Reborn", data.ObservedGameVersion === "2012.01.01.0000.0000" ? "not installed" : data.ObservedGameVersion ?? "error", true)
								.addField("Heavensward", data.ObservedEx1Version === "2012.01.01.0000.0000" ? "not installed" : data.ObservedEx1Version ?? "error", true)
								.addField("Stormblood", data.ObservedEx2Version === "2012.01.01.0000.0000" ? "not installed" : data.ObservedEx2Version ?? "error", true)
								.addField("Shadowbringers", data.ObservedEx3Version === "2012.01.01.0000.0000" ? "not installed" : data.ObservedEx3Version ?? "error", true)
								.addField("Endwalker", data.ObservedEx4Version === "2012.01.01.0000.0000" ? "not installed" : data.ObservedEx4Version ?? "error", true)
								.addField("BCK files match", data.BckMatch ? "yes" : "no", true);

							switch (data.IndexIntegrity) {
								case 0:
									troubleshxltingreplymessage3
										.addField("Index Integrity", "Failed");
									break;

								case 1:
									troubleshxltingreplymessage3
										.addField("Index Integrity", "Exception");
									break;

								case 2:
									troubleshxltingreplymessage3
										.addField("Index Integrity", "NoGame");
									break;

								case 3:
									troubleshxltingreplymessage3
										.addField("Index Integrity", "ReferenceNotFound");
									break;

								case 4:
									troubleshxltingreplymessage3
										.addField("Index Integrity", "ReferenceFetchFailure");
									break;

								case 5:
									troubleshxltingreplymessage3
										.addField("Index Integrity", "Success");
									break;

								default:
									break;
							}

							troubleshxltingreplymessage.addField(
								"Log Timestamp",
								`${data?.When}\n<t:${timestamp}:F>`
							);

							troubleshxltingreplymessage3
								.setFooter(client.config.FRANZBOT_VERSION);

							/* eslint-enable sonarjs/no-duplicate-string */

							if (isDirectMessage) {
								customChannel.send({
									embeds: [
										troubleshxltingreplymessage,
										troubleshxltingreplymessage2,
										troubleshxltingreplymessage3,
									],
									allowedMentions: {
										repliedUser: false,
									},
								});
							}
							message.reply({
								embeds: [
									troubleshxltingreplymessage,
									troubleshxltingreplymessage2,
									troubleshxltingreplymessage3,
								],
								allowedMentions: {
									repliedUser: false,
								},
							});
						}
					}
					catch (error) {
						if (error?.response?.body) {
							console.error(error.response.body);
						}
						else {
							console.error(error);
						}
					}
				}
			});
			return;
		}

		// we don't want to deal with any other DMs.
		if (isDirectMessage) {
			return;
		}

		// process actual triggers
		ignoredRoles = ignoredRoles.concat([
			"moderator",
			"team",
			"friends", // FORMERLY: demogoat
			"plugin developer",
			"plugin creator",
			"test",
			"botters",
			"XIV on Mac Team",
			"Contributor",
			"XIVLauncher Developer",
		]);
	}

	// Also good practice to ignore any message that does not start with our prefix,
	// which is set in the configuration file.
	if (message.content[0] == client.config.prefix_old && message.guild.id == client.config.GUILDID_METEOR) {
		message.reply(`Franzbot now uses ${client.config.prefix} as a prefix.`);
	}
	if (message.content.indexOf(client.config.prefix) !== 0) {
		return;
	}

	// Here we separate our "command" name, and our "arguments" for the command.
	// e.g. if we have the message "+say Is this the real life?" , we'll get the following:
	// command = say
	// args = ["Is", "this", "the", "real", "life?"]
	const args = message
		.content
		.slice(client.config.prefix.length)
		.trim()
		.split(/\s+/gu);
	const command = args.shift().toLowerCase();

	// If the member on a guild is invisible or not cached, fetch them.
	if (message.guild && !message.member) {
		message.guild.fetchMember(message.author);
	}

	// If the member was added to a server's ignorelist, don't process the command
	logger.debug(`loading ${message.guild.id}-ignoredUsers`);
	const ignoredUsers = client.perserversettings?.get(`${message.guild.id}-serversettings`)?.get("ignoredUsers");
	// const ignoredUsers = client.perserversettings.get(`${message.guild.id}-ignoredUsers`);
	logger.debug(`checking ignored users: ${ignoredUsers}`);
	if (ignoredUsers?.includes(message.author.id)) {
		await message.reply("You can't use that command.")
			.then(msg => {
				setTimeout(() => msg.delete(), 5 * SECOND);
			})
			.then(origMsg => {
				// only works if Franzbot is allowed to manage messages.
				setTimeout(() => message.delete(), 5 * SECOND);
			});
		return;
	}

	// Check whether the command, or alias, exist in the collections defined
	// in app.js.
	const cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command));
	if (!cmd) {
		return;
	}

	// Some commands may not be useable in DMs. This check prevents those commands from running
	// and return a friendly error message.
	if (cmd && !message.guild && cmd.conf.guildOnly) {
		message.channel.send("This command is unavailable via private message. Please run this command in a guild.");
		return;
	}

	message.flags = [];
	while (args[0] && args[0][0] === "-") {
		message.flags.push(args.shift().slice(1));
	}
	cmd.run(client, message, args);
};
