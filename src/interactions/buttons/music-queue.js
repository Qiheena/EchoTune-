const { ComponentCommand } = require('../../classes/Commands');
const { EmbedBuilder } = require('discord.js');
const { colorResolver, msToHumanReadableTime } = require('../../util');

module.exports = new ComponentCommand({
  data: { name: 'music_queue' },
  
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const player = client.kazagumo.getPlayer(interaction.guild.id);
    
    if (!player || !player.playing) {
      return interaction.reply({ content: `${emojis.error} Nothing is playing right now!`, ephemeral: true });
    }
    
    const currentTrack = player.queue.current;
    const tracks = player.queue;
    
    let description = `**Now Playing:**\n[${currentTrack.title}](${currentTrack.uri}) - \`${msToHumanReadableTime(currentTrack.length)}\`\n\n`;
    
    if (tracks.size > 0) {
      description += '**Up Next:**\n';
      const queueArray = Array.from(tracks);
      queueArray.slice(0, 10).forEach((track, index) => {
        description += `${index + 1}. [${track.title}](${track.uri}) - \`${msToHumanReadableTime(track.length)}\`\n`;
      });
      
      if (tracks.size > 10) {
        description += `\n*...and ${tracks.size - 10} more track(s)*`;
      }
    } else {
      description += '*No tracks in queue*';
    }
    
    const queueEmbed = new EmbedBuilder()
      .setColor(colorResolver())
      .setTitle('📋 Current Queue')
      .setDescription(description)
      .setFooter({ text: `Total tracks: ${tracks.size + 1}` });
    
    await interaction.reply({ embeds: [queueEmbed], ephemeral: true });
  }
});
