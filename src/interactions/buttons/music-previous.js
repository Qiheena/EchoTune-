const { ComponentCommand } = require('../../classes/Commands');

module.exports = new ComponentCommand({
  data: { name: 'music_previous' },
  
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
    
    if (!player.queue.previous || player.queue.previous.length === 0) {
      return interaction.reply({ content: `${emojis.error} No previous track available!`, ephemeral: true });
    }
    
    const previousTrack = player.queue.previous[player.queue.previous.length - 1];
    player.queue.unshift(previousTrack);
    player.skip();
    
    await interaction.deferUpdate();
  }
});
