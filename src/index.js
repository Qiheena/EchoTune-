// Importing from packages
const { existsSync } = require('fs');
require('dotenv').config({ path: existsSync('.env') ? '.env' : '.env.example' });
const logger = require('@QIHeena/logger');
const chalk = require('chalk');
const {
  Client, Events, GatewayIntentBits, ActivityType, PresenceUpdateStatus
} = require('discord.js');
const { Kazagumo, Plugins } = require('kazagumo');
const { Connectors } = require('shoukaku');
require('./server/webserver');
// Argv
const modeArg = process.argv.find((arg) => arg.startsWith('mode='));

// Local imports
// Initialize database as early as possible
// Before registering any commands or listeners
require('./modules/db');
const pkg = require('../package');
const {
  getFiles, titleCase, getRuntime, clientConfig
} = require('./util');
const config = clientConfig;
const path = require('path');
const clientExtensions = require('./client');
const { saveDb } = require('./modules/db');

// Clear the console in non-production modes & print vanity
process.env.NODE_ENV !== 'production' && console.clear();
const packageIdentifierStr = `${ pkg.name }@${ pkg.version }`;
logger.info(`${ chalk.greenBright.underline(packageIdentifierStr) } by ${ chalk.cyanBright.bold(pkg.author) }`);

// Initializing/declaring our variables
const initTimerStart = process.hrtime.bigint();
const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
];
const presenceActivityMap = config.presence.activities.map(
  (act) => ({
    ...act, type: ActivityType[titleCase(act.type)]
  })
);

// Building our discord.js client
const client = new Client({
  intents,
  presence: {
    status: PresenceUpdateStatus[config.presence.status] || PresenceUpdateStatus['online'],
    activities: presenceActivityMap
  }
});

// Lavalink Music Player with Kazagumo - Optimized for speed and quality
const kazagumo = new Kazagumo({
  defaultSearchEngine: 'youtube',
  // Performance optimizations
  resumeByLibrary: true,
  resumeTimeout: 60,
  reconnectTries: 3,
  reconnectInterval: 5,
  plugins: [
    new Plugins.PlayerMoved(client)
  ],
  send: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(payload);
  }
}, new Connectors.DiscordJS(client), [
  {
    name: process.env.LAVALINK_NAME || 'Serenetia',
    url: process.env.LAVALINK_URL || 'lava-v4.ajieblogs.eu.org:443',
    auth: process.env.LAVALINK_PASSWORD || 'https://dsc.gg/ajidevserver',
    secure: process.env.LAVALINK_SECURE === 'false' ? false : true
  }
]);

client.kazagumo = kazagumo;
require('./music-player')(kazagumo);

// Destructuring from env
const {
  DISCORD_BOT_TOKEN,
  DEBUG_ENABLED,
  USE_API
} = process.env;

// Listen for user requested shutdown
process.on('SIGINT', () => {
  logger.info('\nReceived SIGINT (Ctrl-C), saving database...');
  saveDb();
  logger.info('Gracefully shutting down from SIGINT (Ctrl-C)');
  process.exit(0);
});

// Error handling / keep alive - ONLY in production as you shouldn't have any
// unhandledRejection or uncaughtException errors in production
// these should be addressed in development
if (process.env.NODE_ENV !== 'production') {
  process.on('unhandledRejection', (reason, promise) => {
    logger.syserr('Encountered unhandledRejection error (catch):');
    console.error(reason, promise);
  });
  process.on('uncaughtException', (err, origin) => {
    logger.syserr('Encountered uncaughtException error:');
    console.error(err, origin);
  });
}

/**
 * Register our listeners using client.on(fileNameWithoutExtension)
 * @private
 */
const registerListeners = () => {
  const eventFiles = getFiles('src/listeners', '.js');
  const eventNames = eventFiles.map((filePath) => filePath.slice(
    filePath.lastIndexOf(path.sep) + 1,
    filePath.lastIndexOf('.')
  ));

  // Debug logging
  if (DEBUG_ENABLED === 'true') {
    logger.debug(`Registering ${ eventFiles.length } listeners: ${ eventNames.map((name) => chalk.whiteBright(name)).join(', ') }`);
  }

  // Looping over our event files
  for (const filePath of eventFiles) {
    const eventName = filePath.slice(
      filePath.lastIndexOf(path.sep) + 1,
      filePath.lastIndexOf('.')
    );

    // Binding our event to the client
    const eventFile = require(filePath);

    // Map event names to Events enum constants to avoid deprecation warnings
    // Use the enum constant (e.g., Events.ClientReady), not its string value
    const capitalizedEventName = eventName.charAt(0).toUpperCase() + eventName.slice(1);
    const event = (Events[capitalizedEventName] !== undefined) ? Events[capitalizedEventName] : eventName;

    client.on(event, (...received) => eventFile(client, ...received));
  }
};

// Use an Immediately Invoked Function Expressions (IIFE) if you need to use await
// In the index.js main function
// (async () => {})();

// Containerizing? =) all our client extensions
client.container = clientExtensions;

// Load prefix commands
const { commands, buttons, modals, selectMenus } = client.container;
const CHAT_INPUT_COMMAND_DIR = 'src/commands';

logger.debug(`Start loading Prefix Commands... ("${ CHAT_INPUT_COMMAND_DIR }")`);
for (const filePath of getFiles(CHAT_INPUT_COMMAND_DIR)) {
  try {
    const command = require(filePath);
    command.load(filePath, commands);
    command.loadAliases();
  }
  catch (err) {
    logger.syserr(`Error encountered while loading Prefix Command (${ CHAT_INPUT_COMMAND_DIR })\nCommand: ${ filePath }`);
    console.error(err.stack || err);
  }
}

// Load buttons
const BUTTONS_DIR = 'src/interactions/buttons';
for (const filePath of getFiles(BUTTONS_DIR)) {
  try {
    const button = require(filePath);
    button.load(filePath, buttons);
  }
  catch (err) {
    logger.syserr(`Error encountered while loading Button (${ BUTTONS_DIR })\nButton: ${ filePath }`);
    console.error(err.stack || err);
  }
}

// Load modals
const MODALS_DIR = 'src/interactions/modals';
for (const filePath of getFiles(MODALS_DIR)) {
  try {
    const modal = require(filePath);
    modal.load(filePath, modals);
  }
  catch (err) {
    logger.syserr(`Error encountered while loading Modal (${ MODALS_DIR })\nModal: ${ filePath }`);
    console.error(err.stack || err);
  }
}

// Load select menus
const SELECT_MENUS_DIR = 'src/interactions/select-menus';
for (const filePath of getFiles(SELECT_MENUS_DIR)) {
  try {
    const selectMenu = require(filePath);
    selectMenu.load(filePath, selectMenus);
  }
  catch (err) {
    logger.syserr(`Error encountered while loading Select Menu (${ SELECT_MENUS_DIR })\nSelect Menu: ${ filePath }`);
    console.error(err.stack || err);
  }
}

// Registering our listeners
registerListeners();

/**
 * Finished initializing
 * Performance logging and logging in to our client
 */

// Execution time logging
logger.success(`Finished initializing after ${ getRuntime(initTimerStart).ms } ms`);

// Require our server index file if requested
if (USE_API === 'true') require('./server/');

// Exit before initializing listeners in test mode
if (modeArg && modeArg.endsWith('test')) process.exit(0);

// Lavalink event handlers
kazagumo.shoukaku.on('ready', (name) => {
  logger.success(`✅ Lavalink node "${name}" connected successfully!`);
});

kazagumo.shoukaku.on('error', (name, error) => {
  logger.syserr(`❌ Lavalink node "${name}" connection error:`, error?.message || error);
  logger.info('⚠️ Make sure your Lavalink server is running and accessible.');
});

kazagumo.shoukaku.on('close', (name, code, reason) => {
  logger.info(`⚠️ Lavalink node "${name}" closed with code ${code}. Reason: ${reason || 'No reason provided'}`);
});

kazagumo.shoukaku.on('disconnect', (name, count) => {
  logger.info(`⚠️ Lavalink node "${name}" disconnected. Retry count: ${count}`);
});

// Logging in to our client
client.login(DISCORD_BOT_TOKEN);
