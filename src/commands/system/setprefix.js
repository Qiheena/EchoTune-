const { ApplicationCommandOptionType } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const { getGuildSettings, saveDb } = require('../../modules/db');

module.exports = new ChatInputCommand({
  global: true,
  permLevel: 'Server Owner',
  data: {
    description: 'Set the prefix for this server (for prefix commands)',
    options: [
      {
        name: 'prefix',
        type: ApplicationCommandOptionType.String,
        description: 'The new prefix to use (1-5 characters)',
        required: true
      }
    ]
  },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;
    const newPrefix = interaction.options.getString('prefix', true);

    if (newPrefix.length > 5) {
      await interaction.reply({ 
        content: `${emojis.error} ${member}, prefix must be 5 characters or less.`,
        ephemeral: true 
      });
      return;
    }

    if (newPrefix.length === 0) {
      await interaction.reply({ 
        content: `${emojis.error} ${member}, prefix cannot be empty.`,
        ephemeral: true 
      });
      return;
    }

    const settings = getGuildSettings(guild.id);
    const oldPrefix = settings.prefix || '!';
    
    settings.prefix = newPrefix;
    
    const guilds = require('../../modules/db').db.getCollection('guilds');
    guilds.update(settings);
    saveDb();

    await interaction.reply({ 
      content: `${emojis.success} ${member}, server prefix has been changed from \`${oldPrefix}\` to \`${newPrefix}\`\n${emojis.info} Example: \`${newPrefix}p <song name>\` to play music` 
    });
  }
});
