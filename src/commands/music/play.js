const { ApplicationCommandOptionType } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const {
  requireSessionConditions, ALLOWED_CONTENT_TYPE, musicEventChannel
} = require('../../modules/music');
const { clientConfig, isAllowedContentType } = require('../../util');
const { getGuildSettings } = require('../../modules/db');
const logger = require('@QIHeena/logger');

module.exports = new ChatInputCommand({
  global: true,
  data: {
    description: 'Play a song. Search YouTube, provide a link, or upload an audio file.',
    options: [
      {
        name: 'query',
        type: ApplicationCommandOptionType.String,
        description: 'The music to search/query',
        required: true
      },
      {
        name: 'file',
        type: ApplicationCommandOptionType.Attachment,
        description: 'The audio file to play',
        required: false
      }
    ]
  },
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { member, guild } = interaction;
    const query = interaction.options.getString('query', true);
    const attachment = interaction.options.getAttachment('file');

    await interaction.deferReply({ ephemeral: true });

    if (!requireSessionConditions(interaction, false, true, false, client)) return;

    if (attachment) {
      const contentIsAllowed = isAllowedContentType(ALLOWED_CONTENT_TYPE, attachment?.contentType ?? 'unknown');
      if (!contentIsAllowed.strict) {
        interaction.editReply({ content: `${emojis.error} File rejected. Content type is not **\`${ALLOWED_CONTENT_TYPE}\`**, received **\`${attachment.contentType ?? 'unknown'}\`** instead.` });
        return;
      }
    }

    const channel = member.voice?.channel;

    try {
      const searchQuery = attachment?.url ?? query;
      
      if (!searchQuery || searchQuery.trim().length === 0) {
        await interaction.editReply(`${emojis.error} Please provide a song name, URL, or upload an audio file.`);
        return;
      }
      
      const kazagumo = client.kazagumo;
      const settings = getGuildSettings(guild.id);
      
      let player = kazagumo.getPlayer(guild.id);
      if (!player) {
        player = await kazagumo.createPlayer({
          guildId: guild.id,
          textId: interaction.channelId,
          voiceId: channel.id,
          volume: settings.volume ?? clientConfig.defaultVolume,
          deaf: true
        });
      }
      
      const eventChannel = settings.useThreadSessions 
        ? await musicEventChannel(client, interaction) || interaction.channel
        : interaction.channel;
      
      if (!eventChannel) return;
      
      let volume = settings.volume ?? clientConfig.defaultVolume;
      volume = Math.min(100, volume);
      player.setVolume(volume);
      
      player.data = {
        channel: eventChannel,
        member,
        timestamp: interaction.createdTimestamp,
        ...(player.data || {})
      };

      const isDirectUrl = searchQuery.startsWith('http://') || searchQuery.startsWith('https://');
      let finalQuery = searchQuery;
      
      if (!isDirectUrl) {
        finalQuery = `ytmsearch:${searchQuery}`;
      }
      
      let result = null;
      
      try {
        result = await kazagumo.search(finalQuery, { requester: interaction.user });
      } catch (error) {
        logger.warn(`[Play Command] Primary search failed: ${error.message}`);
      }
      
      if ((!result || !result.tracks || result.tracks.length === 0) && !isDirectUrl) {
        try {
          result = await kazagumo.search(`ytsearch:${searchQuery}`, { requester: interaction.user });
        } catch (error) {
          logger.warn(`[Play Command] YouTube fallback failed: ${error.message}`);
        }
      }
      
      if ((!result || !result.tracks || result.tracks.length === 0) && !isDirectUrl) {
        try {
          result = await kazagumo.search(`scsearch:${searchQuery}`, { requester: interaction.user });
        } catch (error) {
          logger.warn(`[Play Command] SoundCloud fallback failed: ${error.message}`);
        }
      }
      
      if (!result || !result.tracks || result.tracks.length === 0) {
        await interaction.editReply(`${emojis.error} No tracks found for query \`${searchQuery}\`.`);
        return;
      }
      
      let filteredTracks = result.tracks;
      
      if (result.type !== 'PLAYLIST' && !isDirectUrl) {
        const MIN_DURATION_MS = 60000;
        filteredTracks = result.tracks.filter(track => {
          const duration = track.length || 0;
          return duration >= MIN_DURATION_MS;
        });
        
        if (filteredTracks.length === 0) {
          filteredTracks = result.tracks;
        }
        
        if (filteredTracks.length > 1) {
          const rankTrack = (track) => {
            const title = track.title.toLowerCase();
            const author = track.author?.toLowerCase() || '';
            let score = 0;
            
            if (title.includes('official') || author.includes('official')) score += 100;
            if (title.includes('audio') || title.includes('music video')) score += 50;
            if (title.includes('vevo') || author.includes('vevo')) score += 80;
            
            if (title.includes('remix') && !searchQuery.toLowerCase().includes('remix')) score -= 50;
            if (title.includes('cover') && !searchQuery.toLowerCase().includes('cover')) score -= 50;
            if (title.includes('lyric') && !searchQuery.toLowerCase().includes('lyric')) score -= 30;
            if (title.includes('live') && !searchQuery.toLowerCase().includes('live')) score -= 40;
            if (title.includes('karaoke')) score -= 60;
            if (title.includes('instrumental') && !searchQuery.toLowerCase().includes('instrumental')) score -= 40;
            
            if (author && searchQuery.toLowerCase().includes(author.split('-')[0].trim())) score += 60;
            
            if (track.length > 120000) score += 20;
            if (track.length > 180000) score += 10;
            
            return score;
          };
          
          filteredTracks.sort((a, b) => rankTrack(b) - rankTrack(a));
        }
      }

      if (result.type === 'PLAYLIST') {
        for (const track of filteredTracks) {
          player.queue.add(track);
        }
        
        if (!player.playing && !player.paused) {
          player.play();
        }
        
        await interaction.editReply(`✅ Enqueued **${filteredTracks.length}** tracks from playlist!`);
      } else {
        const track = filteredTracks[0];
        player.queue.add(track);
        
        if (!player.playing && !player.paused) {
          player.play();
        }
        
        await interaction.editReply({ content: '✅ Added to queue' });
      }

      if (Number.isInteger(settings.repeatMode)) {
        if (settings.repeatMode === 1) player.setLoop('track');
        else if (settings.repeatMode === 2) player.setLoop('queue');
        else player.setLoop('none');
      }
    }
    catch (e) {
      logger.syserr('[Play Command] Error during play command:', e);
      logger.printErr(e);
      interaction.editReply(`${emojis.error} Something went wrong:\n\n${e.message}`);
    }
  }
});
