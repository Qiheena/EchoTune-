const { ChatInputCommand } = require('../../classes/Commands');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { commandAutoCompleteOption } = require('../../interactions/autocomplete/command');
const { titleCase, colorResolver } = require('../../util');
const { COMMAND_ALIASES } = require('../../handlers/prefix-commands');

module.exports = new ChatInputCommand({
  global: true,
  aliases: [ 'commands', 'h' ],
  cooldown: {
    type: 'user',
    usages: 3,
    duration: 10
  },
  clientPerms: [ 'EmbedLinks' ],
  data: {
    description: 'Show all commands with detailed information (use with pagination)',
    options: [ commandAutoCompleteOption ]
  },

  run: async (client, interaction) => {
    const { member, guild } = interaction;
    const { commands, contextMenus, emojis, colors } = client.container;
    
    // Get guild prefix
    const { getGuildSettings } = require('../../modules/db');
    const settings = getGuildSettings(guild.id);
    const prefix = settings.prefix || '!';

    // Check for specific command info request
    const commandName = interaction.options.getString('command');
    
    if (commandName) {
      // Show specific command details
      const clientCmd = commands.get(commandName) || contextMenus.get(commandName);
      
      if (!clientCmd) {
        interaction.reply({
          content: `${emojis.error} ${member}, I couldn't find the command **\`${commandName}\`**`,
          ephemeral: true
        });
        return;
      }
      
      // Generate detailed command embed
      const cmdEmbed = generateDetailedCommandEmbed(clientCmd, prefix, emojis, colors);
      const msg = await interaction.reply({ embeds: [cmdEmbed] });
      
      // Auto-delete after 1 minute
      setTimeout(async () => {
        try {
          if (msg && msg.delete) await msg.delete();
        } catch (err) {
          // Message might already be deleted
        }
      }, 60000);
      return;
    }

    // Show paginated help
    const availableCommands = commands
      .concat(contextMenus)
      .filter(cmd => cmd.permLevel <= member.permLevel && cmd.enabled === true);

    // Organize by category
    const categories = organizeCommandsByCategory(availableCommands);
    
    // Create pages
    const pages = createHelpPages(categories, prefix, member, emojis, colors);
    
    if (pages.length === 0) {
      interaction.reply({
        content: `${emojis.error} No commands available for you.`,
        ephemeral: true
      });
      return;
    }

    // Create navigation buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('help_prev')
          .setLabel('◀ Back')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('help_page_info')
          .setLabel(`Page 1 of ${pages.length}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('help_next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pages.length === 1)
      );

    // Check if this is a prefix command
    const isPrefixCommand = interaction.isPrefixCommand === true;
    
    if (isPrefixCommand && pages.length > 1) {
      // For prefix commands, send first page with buttons and use channel.send
      const message = await interaction.originalMessage.channel.send({
        embeds: [pages[0]],
        components: [row]
      });
      
      // Store help session data globally
      const helpSessionKey = `help_${message.id}`;
      client.helpSessions = client.helpSessions || new Map();
      client.helpSessions.set(helpSessionKey, {
        pages,
        currentPage: 0,
        userId: interaction.user.id,
        messageId: message.id,
        channelId: message.channel.id
      });
      
      // Auto-delete message after 1 minute
      setTimeout(async () => {
        client.helpSessions.delete(helpSessionKey);
        try {
          await message.delete();
        } catch (err) {
          // Message might already be deleted
        }
      }, 60000); // 1 minute
      
      return;
    } else if (isPrefixCommand) {
      // Single page for prefix command
      const msg = await interaction.originalMessage.channel.send({ embeds: pages });
      
      // Auto-delete after 1 minute
      setTimeout(async () => {
        try {
          await msg.delete();
        } catch (err) {
          // Message might already be deleted
        }
      }, 60000);
      return;
    }

    // Send first page with buttons (for slash commands only)
    const message = await interaction.reply({
      embeds: [pages[0]],
      components: [row],
      fetchReply: true
    });

    // Handle pagination if multiple pages (slash commands only)
    if (pages.length > 1) {
      // Store help session for slash commands too
      const helpSessionKey = `help_${message.id}`;
      client.helpSessions = client.helpSessions || new Map();
      client.helpSessions.set(helpSessionKey, {
        pages,
        currentPage: 0,
        userId: interaction.user.id,
        messageId: message.id,
        channelId: interaction.channel.id
      });
      
      // Auto-delete message after 1 minute
      setTimeout(async () => {
        client.helpSessions.delete(helpSessionKey);
        try {
          await message.delete();
        } catch (err) {
          // Message might already be deleted
        }
      }, 60000); // 1 minute
    }
  }
});

// Helper: Organize commands by category
function organizeCommandsByCategory(commands) {
  const categories = {
    'Music': { emoji: '🎵', desc: 'Play and search songs', commands: [] },
    'Music DJ': { emoji: '🎚️', desc: 'Control playback (DJ role needed)', commands: [] },
    'Music Admin': { emoji: '⚙️', desc: 'Bot settings (Admin only)', commands: [] },
    'System': { emoji: '🔧', desc: 'Bot info and utilities', commands: [] },
    'Developer': { emoji: '👨‍💻', desc: 'Owner only commands', commands: [] }
  };

  commands.forEach(cmd => {
    const cat = titleCase(cmd.category.replace(/-/g, ' '));
    if (cat === 'Music Dj') {
      categories['Music DJ'].commands.push(cmd);
    } else if (cat === 'Music Admin') {
      categories['Music Admin'].commands.push(cmd);
    } else if (categories[cat]) {
      categories[cat].commands.push(cmd);
    }
  });

  return categories;
}

// Helper: Create help pages
function createHelpPages(categories, prefix, member, emojis, colors) {
  const pages = [];
  
  // Page 1: Overview with all categories
  const overviewEmbed = new EmbedBuilder()
    .setColor(colorResolver(colors.main))
    .setTitle(`${emojis.music} Music Bot Help`)
    .setDescription(
      `**Current Prefix:** \`${prefix}\`\n\n` +
      `**Quick Guide:**\n` +
      `${emojis.separator} Type \`${prefix}play <song name>\` to play music\n` +
      `${emojis.separator} Use \`${prefix}h <command>\` for detailed info\n` +
      `${emojis.separator} Navigate pages with buttons below\n\n` +
      `**Shortcuts Available:** Many commands have short aliases (e.g., \`${prefix}p\` for play)`
    )
    .setFooter({ text: `Permission Level: ${member.permLevel} • Use buttons to navigate` })
    .setTimestamp();

  // Add category summaries
  Object.entries(categories).forEach(([catName, catData]) => {
    if (catData.commands.length > 0) {
      const cmdNames = catData.commands
        .slice(0, 5)
        .map(cmd => `\`${cmd.data.name}\``)
        .join(', ');
      const more = catData.commands.length > 5 ? ` +${catData.commands.length - 5} more` : '';
      
      overviewEmbed.addFields({
        name: `${catData.emoji} ${catName}`,
        value: `${catData.desc}\n${cmdNames}${more}`,
        inline: false
      });
    }
  });

  pages.push(overviewEmbed);

  // Create detailed pages for each category
  Object.entries(categories).forEach(([catName, catData]) => {
    if (catData.commands.length === 0) return;

    // Split commands into chunks of 8 per page
    const chunks = chunkArray(catData.commands, 8);
    
    chunks.forEach((chunk, chunkIndex) => {
      const pageEmbed = new EmbedBuilder()
        .setColor(colorResolver(colors.main))
        .setTitle(`${catData.emoji} ${catName} Commands`)
        .setDescription(catData.desc)
        .setFooter({ 
          text: `Prefix: ${prefix} • ${chunk.length} commands on this page` 
        });

      chunk.forEach(cmd => {
        // Get aliases for this command
        const aliases = Object.entries(COMMAND_ALIASES)
          .filter(([alias, fullName]) => fullName === cmd.data.name)
          .map(([alias]) => `${prefix}${alias}`);
        
        // Add command's own aliases
        if (cmd.aliases && cmd.aliases.length > 0) {
          aliases.push(...cmd.aliases.map(a => `${prefix}${a}`));
        }

        const aliasText = aliases.length > 0 
          ? `\nShortcuts: ${aliases.join(', ')}`
          : '';

        const usage = cmd.data.options && cmd.data.options.length > 0
          ? `${prefix}${cmd.data.name} <options>`
          : `${prefix}${cmd.data.name}`;

        pageEmbed.addFields({
          name: `${prefix}${cmd.data.name}`,
          value: `${cmd.data.description}\n**Usage:** \`${usage}\`${aliasText}`,
          inline: false
        });
      });

      pages.push(pageEmbed);
    });
  });

  return pages;
}

// Helper: Generate detailed command embed
function generateDetailedCommandEmbed(cmd, prefix, emojis, colors) {
  const { data, cooldown, clientPerms, userPerms, category, aliases } = cmd;
  
  // Get all aliases (both from COMMAND_ALIASES and cmd.aliases)
  const allAliases = Object.entries(COMMAND_ALIASES)
    .filter(([alias, fullName]) => fullName === data.name)
    .map(([alias]) => alias);
  
  if (aliases && aliases.length > 0) {
    allAliases.push(...aliases);
  }

  const aliasText = allAliases.length > 0
    ? `**Shortcuts:** ${allAliases.map(a => `\`${prefix}${a}\``).join(', ')}\n\n`
    : '';

  let usage = `\`${prefix}${data.name}\``;
  if (data.options && data.options.length > 0) {
    const option = data.options[0];
    usage = `\`${prefix}${data.name} <${option.name}>\``;
  }

  const embed = new EmbedBuilder()
    .setColor(colorResolver(colors.main))
    .setTitle(`${emojis.info} ${titleCase(data.name)} Command`)
    .setDescription(
      `**Description:** ${data.description}\n\n` +
      `**How to use:** ${usage}\n\n` +
      aliasText +
      `**Category:** ${titleCase(category.replace(/-/g, ' '))}\n` +
      `**Cooldown:** ${cooldown.usages} time(s) per ${cooldown.duration} second(s)`
    );

  if (clientPerms.length > 0 || userPerms.length > 0) {
    const permsText = [];
    if (clientPerms.length > 0) permsText.push(`**Bot needs:** ${clientPerms.join(', ')}`);
    if (userPerms.length > 0) permsText.push(`**You need:** ${userPerms.join(', ')}`);
    embed.addFields({
      name: 'Permissions Required',
      value: permsText.join('\n'),
      inline: false
    });
  }

  embed.setFooter({ text: `Use ${prefix}help to see all commands` });

  return embed;
}

// Helper: Split array into chunks
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
