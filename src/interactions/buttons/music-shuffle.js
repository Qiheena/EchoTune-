const { ComponentCommand } = require('../../classes/Commands');

module.exports = new ComponentCommand({
  data: { name: 'music_shuffle' },
  
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
    
    if (player.queue.size < 2) {
      return interaction.reply({ content: `${emojis.error} Not enough tracks in the queue to shuffle!`, ephemeral: true });
    }
    
    player.queue.shuffle();
    await interaction.deferUpdate();
  }
});
