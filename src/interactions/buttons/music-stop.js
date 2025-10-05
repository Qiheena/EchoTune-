const { ComponentCommand } = require('../../classes/Commands');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = new ComponentCommand({
  data: { name: 'music_stop' },
  
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const player = client.kazagumo.getPlayer(interaction.guild.id);
    
    if (!player || !player.playing) {
      return interaction.reply({ content: `${emojis.error} Nothing is playing right now!`, ephemeral: true });
    }
    
    if (!interaction.member.voice?.channel) {
      return interaction.reply({ content: `${emojis.error} You need to be in a voice channel!`, ephemeral: true });
    }
    
    if (interaction.guild.members.me.voice?.channelId !== interaction.member.voice.channelId) {
      return interaction.reply({ content: `${emojis.error} You need to be in the same voice channel!`, ephemeral: true });
    }
    
    const disabledRow1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('music_previous_disabled')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('music_pause_disabled')
          .setLabel('Halt')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('music_skip_disabled')
          .setLabel('Skip')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('music_stop_disabled')
          .setLabel('Stop')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
    
    const disabledRow2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('music_volume_down_disabled')
          .setLabel('Vol -')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('music_volume_up_disabled')
          .setLabel('Vol +')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('music_queue_disabled')
          .setLabel('Queue')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('music_autoplay_disabled')
          .setLabel('Auto')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
    
    if (player.data?.controlMessage) {
      await player.data.controlMessage.edit({ components: [disabledRow1, disabledRow2] }).catch(() => {});
    }
    
    player.destroy();
    await interaction.deferUpdate();
  }
});
