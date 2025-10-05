const { ComponentCommand } = require('../../classes/Commands');

module.exports = new ComponentCommand({
  data: { name: 'music_volume_up' },
  
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
    
    const currentVolume = player.volume;
    const newVolume = Math.min(100, currentVolume + 10);
    
    if (currentVolume === newVolume) {
      return interaction.reply({ content: `${emojis.error} Volume is already at maximum (100%)!`, ephemeral: true });
    }
    
    player.setVolume(newVolume);
    await interaction.deferUpdate();
  }
});
