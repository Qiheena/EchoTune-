const logger = require('@QIHeena/logger');
const chalk = require('chalk');
const { hasChannelPerms, resolvePermissionArray } = require('./permissions');
const { commands } = require('../client');
const { MS_IN_ONE_SECOND } = require('../constants');

const { emojis } = require('../client');

// Command aliases mapping - short commands to full command names
const COMMAND_ALIASES = {
  // Music commands
  'p': 'play',
  's': 'skip',
  'stp': 'stop',
  'np': 'now-playing',
  'q': 'queue',
  'ps': 'pause',
  'res': 'resume',
  'sh': 'shuffle-queue',
  'rep': 'repeat-mode',
  'vol': 'volume',
  'lyr': 'lyrics',
  'seek': 'seek',
  'clr': 'clear-queue',
  'rm': 'remove-song',
  'sv': 'save-song',
  'srch': 'search',
  'hist': 'history',
  'ap': 'ap',
  'eq': 'equalizer',
  'flt': 'audio-filters',
  'bq': 'biquad',
  'jmp': 'jump-to',
  'mv': 'move-song',
  'pn': 'play-next',
  'pp': 'play-previous-song',
  'qp': 'queue-previous-song',
  'rpl': 'replay',
  'sk': 'skip-to',
  'swp': 'swap-songs',
  'vs': 'vote-skip',
  
  // System commands
  'h': 'help',
  'bst': 'stats',
  'ping': 'stats',
  'inv': 'invite',
  'sup': 'support',
  'perm': 'permlevel'
};

const ThrottleMap = new Map();

const getThrottleId = (cooldown, cmdName, message) => {
  const { member, channel, guild } = message;
  
  let identifierStr;
  
  switch (cooldown.type) {
    case 'member': identifierStr = `${member.id}${guild.id}`;
      break;
    case 'guild': identifierStr = guild.id;
      break;
    case 'channel': identifierStr = channel.id;
      break;
    case 'global': identifierStr = '';
      break;
    case 'user':
    default: {
      identifierStr = member.id;
      break;
    }
  }
  
  identifierStr += `-${cmdName}`;
  return identifierStr;
};

const throttlePrefixCommand = (clientCmd, message, prefix) => {
  const { cooldown, data } = clientCmd;
  const activeCommandName = clientCmd.isAlias ? clientCmd.aliasFor : data.name;
  
  if (cooldown === false) return false;
  
  const cooldownInMS = parseInt(cooldown.duration * MS_IN_ONE_SECOND, 10);
  
  if (!cooldownInMS || cooldownInMS < 0) return false;
  
  const identifierStr = getThrottleId(cooldown, activeCommandName, message);
  
  if (!ThrottleMap.has(identifierStr)) {
    ThrottleMap.set(identifierStr, [Date.now()]);
    setTimeout(() => {
      ThrottleMap.delete(identifierStr);
    }, cooldownInMS);
    return false;
  }
  
  const throttleData = ThrottleMap.get(identifierStr);
  const nonExpired = throttleData.filter((timestamp) => Date.now() < (timestamp + cooldownInMS));
  
  if (nonExpired.length >= cooldown.usages) {
    const timeLeft = Number.parseFloat(((nonExpired[0] + cooldownInMS) - Date.now()) / MS_IN_ONE_SECOND).toFixed(2);
    return `${emojis.error} ${message.member}, you can use **\`${prefix}${data.name}\`** again in ${timeLeft} seconds`;
  }
  
  throttleData.push(Date.now());
  return false;
};

const checkPrefixCommandCanExecute = (client, message, clientCmd) => {
  const { member, channel } = message;
  const { data, permLevel, enabled, clientPerms, userPerms, nsfw } = clientCmd;
  
  // Owner (permLevel 5) bypasses ALL restrictions
  if (member.permLevel === 5) {
    return true;
  }
  
  if (enabled === false) {
    message.reply(`${emojis.error} ${member}, this command is currently disabled. Please try again later.`);
    return false;
  }
  
  if (isNaN(permLevel)) {
    message.reply(`${emojis.error} ${member}, something went wrong while using this command.`);
    logger.syserr(`Prefix Command returned: Calculated permission level for command ${data.name} is NaN.`);
    return false;
  }
  
  if (member.permLevel < permLevel) {
    message.reply(`${emojis.error} ${member}, you do not have the required permission level to use this command.`);
    return false;
  }
  
  if (clientPerms.length !== 0) {
    const missingPerms = hasChannelPerms(client.user.id, channel, clientPerms);
    
    if (missingPerms !== true) {
      message.reply(`${emojis.error} ${member}, this command can't be executed because I lack the following permissions in ${channel}\n${emojis.separator} ${resolvePermissionArray(missingPerms).join(', ')}`);
      return false;
    }
  }
  
  if (userPerms.length !== 0) {
    const missingPerms = hasChannelPerms(member.user.id, channel, userPerms);
    
    if (missingPerms !== true) {
      message.reply(`${emojis.error} ${member}, this command can't be executed because you lack the following permissions in ${channel}:\n${emojis.separator} ${resolvePermissionArray(missingPerms).join(', ')}`);
      return false;
    }
  }
  
  if (nsfw === true && channel.nsfw !== true) {
    message.reply(`${emojis.error} ${member}, that command is marked as **NSFW**, you can't use it in a **SFW** channel!`);
    return false;
  }
  
  return true;
};

const executePrefixCommand = async (client, message, commandName, args, prefix) => {
  const cmdRunTimeStart = process.hrtime.bigint();
  const { member, guild, channel } = message;
  
  // Resolve command name from alias if needed
  const resolvedCommandName = COMMAND_ALIASES[commandName] || commandName;
  
  // Get the command
  let clientCmd = commands.get(resolvedCommandName);
  
  if (!clientCmd) {
    message.reply(`${emojis.error} ${member}, command \`${prefix}${commandName}\` not found.`);
    return;
  }
  
  // Check if command has subcommands (type 1 or 2 options)
  const hasSubcommands = clientCmd.data.options?.some(opt => opt.type === 1 || opt.type === 2);
  
  if (hasSubcommands) {
    message.reply(`${emojis.error} ${member}, \`${resolvedCommandName}\` requires subcommands and cannot be used with prefix commands.`);
    return;
  }
  
  // Check if command can execute
  if (!checkPrefixCommandCanExecute(client, message, clientCmd)) {
    return;
  }
  
  // Throttle command (skip for developers and owner)
  // Owner (5) and Developers (4) bypass cooldowns
  if (member.permLevel < 4) {
    const onCooldown = throttlePrefixCommand(clientCmd, message, prefix);
    
    if (onCooldown !== false) {
      message.reply(onCooldown);
      return;
    }
  }
  
  // Parse arguments based on command options
  const parsedArgs = {};
  const commandOptions = clientCmd.data.options || [];
  
  logger.debug(`[Prefix] Command: ${resolvedCommandName}, Args: ${JSON.stringify(args)}, Options: ${commandOptions.length}`);
  
  // Only join all args if:
  // 1. There's exactly one string option, OR
  // 2. First option is required STRING (type 3) and all other options are optional
  const firstOption = commandOptions[0];
  const shouldJoinArgs = 
    (commandOptions.length === 1 && firstOption?.type === 3) ||
    (firstOption?.type === 3 && 
     firstOption.required !== false && 
     commandOptions.slice(1).every(opt => opt.required === false));
  
  logger.debug(`[Prefix] shouldJoinArgs: ${shouldJoinArgs}, firstOption type: ${firstOption?.type}, required: ${firstOption?.required}`);
  
  if (shouldJoinArgs) {
    const joinedArgs = args.join(' ').trim();
    logger.debug(`[Prefix] Joining args: "${joinedArgs}", firstOption.name: "${firstOption.name}"`);
    if (joinedArgs.length > 0) {
      parsedArgs[firstOption.name] = joinedArgs;
      logger.debug(`[Prefix] Added to parsedArgs, JSON: ${JSON.stringify(parsedArgs)}`);
    } else {
      logger.debug(`[Prefix] joinedArgs was empty after trim`);
    }
  } else {
    // Map args to options by index
    commandOptions.forEach((option, index) => {
      if (args[index]) {
        parsedArgs[option.name] = args[index];
      }
    });
  }
  
  logger.debug(`[Prefix] Final parsedArgs JSON: ${JSON.stringify(parsedArgs)}, Keys: ${Object.keys(parsedArgs).join(', ')}`);
  
  // Validate required options are provided
  const missingRequired = commandOptions
    .filter(opt => opt.required === true)
    .filter(opt => !parsedArgs[opt.name])
    .map(opt => opt.name);
  
  if (missingRequired.length > 0) {
    const missingList = missingRequired.map(name => `\`${name}\``).join(', ');
    message.reply(`${emojis.error} ${member}, missing required parameter(s): ${missingList}\n\nUsage: \`${prefix}${resolvedCommandName} ${commandOptions.filter(o => o.required).map(o => `<${o.name}>`).join(' ')}\``);
    return;
  }
  
  // Convert message to interaction-like object for command compatibility
  const fakeInteraction = {
    member,
    guild,
    channel,
    user: message.author,
    createdTimestamp: message.createdTimestamp,
    options: {
      getString: (name, required) => {
        const value = parsedArgs[name];
        logger.debug(`[Prefix] getString called: name="${name}", required=${required}, value="${value}", parsedArgs:`, parsedArgs);
        return value ?? (required ? '' : null);
      },
      getInteger: (name, required) => {
        const value = parsedArgs[name];
        if (value !== null && value !== undefined) {
          const parsed = parseInt(value, 10);
          return isNaN(parsed) ? (required ? 0 : null) : parsed;
        }
        return required ? 0 : null;
      },
      getNumber: (name, required) => {
        const value = parsedArgs[name];
        if (value !== null && value !== undefined) {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? (required ? 0 : null) : parsed;
        }
        return required ? 0 : null;
      },
      getBoolean: (name, required) => {
        const value = parsedArgs[name];
        if (value !== null && value !== undefined) {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return required ? false : null;
      },
      getUser: (name, required) => {
        const value = parsedArgs[name];
        if (value && value.match(/<@!?(\d+)>/)) {
          const userId = value.match(/<@!?(\d+)>/)[1];
          return guild.members.cache.get(userId)?.user || (required ? message.author : null);
        }
        return required ? message.author : null;
      },
      getChannel: (name, required) => {
        const value = parsedArgs[name];
        if (value && value.match(/<#(\d+)>/)) {
          const channelId = value.match(/<#(\d+)>/)[1];
          return guild.channels.cache.get(channelId) || (required ? channel : null);
        }
        return required ? channel : null;
      },
      getRole: (name, required) => {
        const value = parsedArgs[name];
        if (value && value.match(/<@&(\d+)>/)) {
          const roleId = value.match(/<@&(\d+)>/)[1];
          return guild.roles.cache.get(roleId) || null;
        }
        return null;
      },
      getAttachment: () => null,
      getMember: (name, required) => {
        const value = parsedArgs[name];
        if (value && value.match(/<@!?(\d+)>/)) {
          const userId = value.match(/<@!?(\d+)>/)[1];
          return guild.members.cache.get(userId) || (required ? member : null);
        }
        return required ? member : null;
      }
    },
    reply: async (content) => {
      if (typeof content === 'string') {
        return message.reply(content);
      }
      return message.reply(content);
    },
    editReply: async (content) => {
      if (fakeInteraction._deferredMessage) {
        if (typeof content === 'string') {
          return fakeInteraction._deferredMessage.edit(content);
        }
        return fakeInteraction._deferredMessage.edit(content);
      }
      if (typeof content === 'string') {
        return message.channel.send(content);
      }
      return message.channel.send(content);
    },
    deferReply: async () => {
      const thinkingMsg = await message.channel.send(`${emojis.wait} Processing...`);
      fakeInteraction._deferredMessage = thinkingMsg;
      return thinkingMsg;
    },
    // Mark as prefix interaction
    isPrefixCommand: true,
    originalMessage: message
  };
  
  try {
    await clientCmd.run(client, fakeInteraction);
    
    // Log command execution
    const aliasTag = COMMAND_ALIASES[commandName] ? `(Alias: ${commandName} -> ${resolvedCommandName})` : '';
    console.log([
      `${logger.timestamp()} ${chalk.white('[PREFIX]')}: ${chalk.bold(resolvedCommandName)} ${aliasTag}`,
      guild.name,
      `#${channel.name}`,
      member.user.username
    ].join(chalk.magentaBright(` ${emojis.separator} `)));
    
  } catch (err) {
    logger.syserr(`An error has occurred while executing the prefix command ${chalk.whiteBright(resolvedCommandName)}`);
    console.error(err);
    message.reply(`${emojis.error} ${member}, something went wrong:\n\n${err.message}`);
  }
};

module.exports = {
  checkPrefixCommandCanExecute,
  throttlePrefixCommand,
  executePrefixCommand,
  COMMAND_ALIASES
};
