const logger = require('@QIHeena/logger');
const chalk = require('chalk');
const { getPermissionLevel } = require('../../handlers/permissions');
const { 
  checkPrefixCommandCanExecute,
  throttlePrefixCommand,
  executePrefixCommand
} = require('../../handlers/prefix-commands');
const { getGuildSettings } = require('../../modules/db');
const { clientConfig } = require('../../util');
const { emojis } = require('../../client');

const { DEBUG_ENABLED } = process.env;

module.exports = (client, message) => {
  const { member, guild, channel, content, author } = message;
  
  // Ignore bot messages
  if (author.bot) return;
  
  // Ignore DMs
  if (!guild) return;
  
  // Get guild prefix
  const settings = getGuildSettings(guild.id);
  const prefix = settings.prefix || '!';
  
  // Set permission level on member first
  const permLevel = getPermissionLevel(clientConfig, member, channel);
  member.permLevel = permLevel;
  
  let commandName;
  let args;
  let usedPrefix = prefix;
  
  // Special handling for bot owner - allow prefix-less commands for specific shortcuts only
  if (member.permLevel === 5 && !content.startsWith(prefix)) {
    // List of allowed prefix-less commands for bot owner
    const allowedPrefixlessCommands = [
      'p', 'play', 's', 'skip', 'stop', 'pause', 'resume', 
      'np', 'queue', 'q', 'vol', 'volume', 'stp', 'ps', 'res',
      'h', 'help'
    ];
    
    const messageParts = content.trim().split(/ +/);
    const firstWord = messageParts[0]?.toLowerCase();
    
    // Check if first word matches an allowed prefix-less command
    if (firstWord && allowedPrefixlessCommands.includes(firstWord)) {
      commandName = firstWord;
      args = messageParts.slice(1);
      usedPrefix = '';
      
      if (DEBUG_ENABLED === 'true') {
        logger.debug(`Owner Prefix-less Command: ${chalk.white(commandName)} by ${member.user.username} in ${guild.name}`);
      }
    } else {
      // Not a whitelisted command, ignore and let owner chat normally
      return;
    }
  } else {
    // Normal prefix command handling
    // Check if message starts with prefix
    if (!content.startsWith(prefix)) return;
    
    // Parse command and args
    args = content.slice(prefix.length).trim().split(/ +/);
    commandName = args.shift()?.toLowerCase();
    
    if (!commandName) return;
    
    // Debug logging
    if (DEBUG_ENABLED === 'true') {
      logger.debug(`Prefix Command: ${chalk.white(commandName)} by ${member.user.username} in ${guild.name}`);
    }
  }
  
  // Execute the prefix command
  executePrefixCommand(client, message, commandName, args, usedPrefix || prefix);
};
