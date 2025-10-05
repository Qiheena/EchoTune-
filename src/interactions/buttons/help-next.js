const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ComponentCommand } = require('../../classes/Commands');

module.exports = new ComponentCommand({
  data: { name: 'help_next' },

  run: async (client, interaction) => {
    const { message } = interaction;
    
    // Get help session data
    const helpSessionKey = `help_${message.id}`;
    const session = client.helpSessions?.get(helpSessionKey);
    
    if (!session) {
      await interaction.reply({
        content: 'This help menu has expired. Please run the help command again.',
        ephemeral: true
      });
      return;
    }
    
    // Check if user is the one who initiated the help command
    if (session.userId !== interaction.user.id) {
      await interaction.reply({
        content: 'This help menu is not for you.',
        ephemeral: true
      });
      return;
    }
    
    const { pages } = session;
    let { currentPage } = session;
    
    // Go forward one page
    currentPage = Math.min(currentPage + 1, pages.length - 1);
    
    // Update session
    session.currentPage = currentPage;
    
    // Create updated buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('help_prev')
          .setLabel('◀ Back')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId('help_page_info')
          .setLabel(`Page ${currentPage + 1} of ${pages.length}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('help_next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === pages.length - 1)
      );
    
    // Update message
    await interaction.update({
      embeds: [pages[currentPage]],
      components: [row]
    });
  }
});
