const logger = require('@QIHeena/logger');
const {
  colorResolver, msToHumanReadableTime, clientConfig
} = require('./util');
const { EmbedBuilder, escapeMarkdown, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildSettings } = require('./modules/db');
const { MS_IN_ONE_SECOND, EMBED_DESCRIPTION_MAX_LENGTH } = require('./constants');

module.exports = (kazagumo) => {
  kazagumo.on('playerStart', async (player, track) => {
    const isAutoplayOn = player.data?.autoplay || false;
    
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
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    const embed = new EmbedBuilder({
      color: colorResolver(),
      title: 'Now Playing',
      description: `**Song:** [${escapeMarkdown(track.title)}](${track.uri})\n**Duration:** ${msToHumanReadableTime(track.length)}\n**Author:** ${track.author}\n**Requester:** ${player.data?.member?.user?.username || 'Unknown'}\n**Time:** ${timeStr} • ${dateStr}`,
      thumbnail: { url: track.thumbnail || track.artworkUrl }
    });

    if (player.data?.controlMessage) {
      try {
        await player.data.controlMessage.edit({ 
          embeds: [embed],
          components: [controlRow1, controlRow2]
        });
      } catch (err) {
        const message = await player.data.channel.send({ 
          embeds: [embed],
          components: [controlRow1, controlRow2]
        });
        player.data.controlMessage = message;
      }
    } else {
      const message = await player.data.channel.send({ 
        embeds: [embed],
        components: [controlRow1, controlRow2]
      });
      if (!player.data) player.data = {};
      player.data.controlMessage = message;
    }
  });

  kazagumo.on('playerEnd', async (player, track) => {
    const isAutoplayOn = player.data?.autoplay || false;
    
    if (player.queue.size === 0 && !player.playing) {
      if (isAutoplayOn && track) {
        try {
          logger.info('[Autoplay] Searching for similar tracks...');
          
          const searchQuery = track.author || track.title.split(/[-–|]/)[0].trim();
          const result = await kazagumo.search(`ytmsearch:${searchQuery}`, { 
            requester: track.requester 
          });
          
          if (result && result.tracks && result.tracks.length > 0) {
            const similarTracks = result.tracks.filter(t => t.uri !== track.uri).slice(0, 3);
            
            if (similarTracks.length > 0) {
              for (const similarTrack of similarTracks) {
                player.queue.add(similarTrack);
              }
              
              player.play();
              logger.info(`[Autoplay] Added ${similarTracks.length} similar tracks`);
              return;
            }
          }
        } catch (error) {
          logger.warn('[Autoplay] Failed to fetch similar tracks:', error.message);
        }
      }
      
      const settings = getGuildSettings(player.guildId);
      const leaveDelay = (settings?.leaveOnEndCooldown || clientConfig.defaultLeaveOnEndCooldown) * MS_IN_ONE_SECOND;
      
      player.data?.channel?.send({ embeds: [
        {
          color: colorResolver(),
          title: 'Queue Empty',
          description: `Queue is now empty, use **\`;play\`** to add something\nLeaving channel in ${msToHumanReadableTime(leaveDelay)} if no songs are added/enqueued`
        }
      ] }).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 60000);
      }).catch(() => {});

      setTimeout(() => {
        if (player.queue.size === 0 && !player.playing) {
          player.destroy();
        }
      }, leaveDelay);
    }
  });

  kazagumo.on('playerEmpty', async (player) => {
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
      player.data.controlMessage.edit({ components: [disabledRow1, disabledRow2] }).catch(() => {});
    }
    
    player.data?.channel?.send({ 
      embeds: [
        {
          color: colorResolver(),
          title: 'Finished Playing',
          description: 'Queue is now empty, leaving the channel'
        }
      ]
    }).then(msg => {
      setTimeout(() => msg.delete().catch(() => {}), 30000);
    }).catch(() => {});

    player.destroy();
  });

  kazagumo.on('playerException', (player, error) => {
    logger.syserr('Music Player encountered unexpected error:');
    logger.printErr(error);
    
    const currentTrack = player.queue.current;
    const errorMsg = error?.exception?.message || error?.message || 'Unknown error';
    
    logger.debug(`playerException full context:`, {
      message: errorMsg,
      track: currentTrack?.uri,
      trackTitle: currentTrack?.title,
      severity: error?.exception?.severity,
      cause: error?.exception?.cause
    });
    
    if (player.data?.channel) {
      const maxLength = Math.max(EMBED_DESCRIPTION_MAX_LENGTH - 350, 500);
      let description = `Failed to play: **${currentTrack?.title || 'current track'}**\n\n`;
      
      const errorLower = errorMsg.toLowerCase();
      if (errorLower.includes('stream') || errorLower.includes('extract') || errorLower.includes('loading')) {
        description += '🔧 **Stream extraction failed** - The audio source may be unavailable, region-restricted, or private.\n\n';
        description += '💡 **Try:** Search for the song again or use a different platform';
      } else if (errorLower.includes('network') || errorLower.includes('timeout') || errorLower.includes('econnrefused')) {
        description += '🌐 **Network issue** - Connection to the audio source failed.\n\n';
        description += '💡 **Try:** Wait a moment and try playing the song again';
      } else {
        const safeErrorMsg = errorMsg.slice(0, maxLength);
        description += `⚠️ **Error:** ${safeErrorMsg}\n\n`;
        description += '💡 **Tip:** This track may not be available. Try a different song or source';
      }
      
      player.data.channel.send({ embeds: [
        {
          color: colorResolver(),
          title: '❌ Playback Error',
          description: description.slice(0, EMBED_DESCRIPTION_MAX_LENGTH)
        }
      ] }).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 20000);
      }).catch(() => {});
    }
  });

  kazagumo.on('playerStuck', (player, data) => {
    logger.warn('Player stuck:', data);
    player.data?.channel?.send({ embeds: [
      {
        color: colorResolver(),
        title: 'Player Stuck',
        description: 'Track playback got stuck, skipping to next track...'
      }
    ] }).then(msg => {
      setTimeout(() => msg.delete().catch(() => {}), 15000);
    }).catch(() => {});
    
    player.skip();
  });

  if (process.env.DEBUG_ENABLED === 'true') {
    kazagumo.on('playerUpdate', (player, data) => {
      console.log(`Player update: Guild ${player.guildId}, Position ${data.state.position}ms`);
    });
  }
};
