const { ComponentCommand } = require('../../classes/Commands');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = new ComponentCommand({
  data: { name: 'music_pause' },
  
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
    
    const isAutoplayOn = player.data?.autoplay || false;
    
    if (player.paused) {
      player.pause(false);
      
      const controlRow1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('music_previous')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_pause')
            .setLabel('Halt')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_skip')
            .setLabel('Skip')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_stop')
            .setLabel('Stop')
            .setStyle(ButtonStyle.Danger)
        );
      
      const controlRow2 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('music_volume_down')
            .setLabel('Vol -')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_volume_up')
            .setLabel('Vol +')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_queue')
            .setLabel('Queue')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_autoplay')
            .setLabel('Auto')
            .setStyle(isAutoplayOn ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
      
      await interaction.update({ components: [controlRow1, controlRow2] });
    } else {
      player.pause(true);
      
      const controlRow1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('music_previous')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_pause')
            .setLabel('Halt')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('music_skip')
            .setLabel('Skip')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_stop')
            .setLabel('Stop')
            .setStyle(ButtonStyle.Danger)
        );
      
      const controlRow2 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('music_volume_down')
            .setLabel('Vol -')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_volume_up')
            .setLabel('Vol +')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_queue')
            .setLabel('Queue')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('music_autoplay')
            .setLabel('Auto')
            .setStyle(isAutoplayOn ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
      
      await interaction.update({ components: [controlRow1, controlRow2] });
    }
  }
});
