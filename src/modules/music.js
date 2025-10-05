const emojis = require('../config/emojis.json');
const { getGuildSettings } = require('./db');
const {
  EmbedBuilder, PermissionFlagsBits, ThreadAutoArchiveDuration
} = require('discord.js');
const {
  colorResolver, msToHumanReadableTime, handlePagination
} = require('../util');
const { stripIndents } = require('common-tags');
const { hasChannelPerms } = require('../handlers/permissions');
const logger = require('@QIHeena/logger');

const ALLOWED_CONTENT_TYPE = 'audio/mpeg';

const queueTrackCb = (track, idx) => `${ ++idx }: (${ track.duration }) [**${ track.title }**](${ track.url })`;

const requireInitializeSessionConditions = (interaction) => {
  // Destructure
  const { member } = interaction;

  // Check voice channel requirement
  const channel = member.voice?.channel;

  // Can't see channel
  if (!channel.viewable) {
    const ctx = {
      content: `${ emojis.error } ${ member }, I don't have permission to see your voice channel (\`${ emojis.success } View Channel\`) - this command has been cancelled`,
      ephemeral: true
    };
    if (interaction.deferred || interaction.replied) interaction.editReply(ctx);
    else interaction.reply(ctx);
    return false;
  }

  // Join channel
  if (!channel.joinable) {
    const ctx = {
      content: `${ emojis.error } ${ member }, I don't have permission to join your voice channel (\`${ emojis.success } Connect \`) - this command has been cancelled`,
      ephemeral: true
    };
    if (interaction.deferred || interaction.replied) interaction.editReply(ctx);
    else interaction.reply(ctx);
    return false;
  }

  // Channel is full
  // channel.userLimit >= channel.members.size
  if (
    channel.full
    && !channel.members.some((m) => m.id === interaction.client.user.id)
  ) {
    const ctx = {
      content: `${ emojis.error } ${ member }, your voice channel is currently full - this command has been cancelled`,
      ephemeral: true
    };
    if (interaction.deferred || interaction.replied) interaction.editReply(ctx);
    else interaction.reply(ctx);
    return false;
  }

  // Ok
  return true;
};

const requireDJ = (interaction) => {
  const { guild, member } = interaction;
  const settings = getGuildSettings(guild.id);
  const djRoleIds = settings.djRoleIds ?? [];
  if (djRoleIds.length > 0) {
    const memberDJRole = member._roles.some((rId) => djRoleIds.includes(rId));
    if (!memberDJRole) {
      const ctx = {
        content: `${ emojis.error } ${ member }, you need ${
          djRoleIds.length === 1
            ? 'one of the DJ roles to use this command: ' + djRoleIds.map((e) => `<@&${ e }>`).join(', ')
            : 'the DJ role <@&' + djRoleIds[0] + '> to use this command'
        }`,
        disableMentions: true,
        ephemeral: true
      };
      if (interaction.deferred || interaction.replied) interaction.editReply(ctx);
      else interaction.reply(ctx);
      return false;
    }
  }
  // Restricted for admins until DJ roles are configured
  else if (member.permLevel < 2) {
    const ctx = {
      content: `${ emojis.error } ${ member }, you don't have the required permission level to use this command. It is reserved for Administrators and up until **\`;dj-roles\`** are configured - this command has been cancelled`,
      ephemeral: true
    };
    if (interaction.deferred || interaction.replied) interaction.editReply(ctx);
    else interaction.reply(ctx);
    return false;
  }

  return true;
};

const requireSessionConditions = (
  interaction,
  requireVoiceSession = false,
  useInitializeSessionConditions = false,
  requireDJRole = true, // Explicit set to false for public commands
  client = null
) => {
  // Destructure
  const { guild, member } = interaction;
  const clientObj = client || interaction.client;

  // Return early
  if (!requireMusicChannel(interaction, clientObj)) return false;
  if (requireDJRole && !requireDJ(interaction)) return false;

  // Check voice channel requirement
  const channel = member.voice?.channel;
  if (!channel) {
    const ctx = {
      content: `${ emojis.error } ${ member }, please join/connect to a voice channel first, and try again.`,
      ephemeral: true
    };
    if (interaction.deferred || interaction.replied) interaction.editReply(ctx);
    else interaction.reply(ctx);
    return false;
  }

  // Note outside of useInitializeSessionConditions because
  // this is logic that should be applied to all music commands
  // that control player/queue state
  //
  // Check is playing in different channel
  // Essentially makes sure a shared voice connection is required
  // when playing/applicable
  const player = clientObj?.kazagumo?.getPlayer(guild.id);
  if (player && player.voiceId !== channel.id) {
    const ctx = {
      content: `${ emojis.error } ${ member }, I'm already playing in <#${ player.voiceId }> - this command has been cancelled`,
      ephemeral: true
    };
    if (interaction.deferred || interaction.replied) interaction.editReply(ctx);
    else interaction.reply(ctx);
    return false;
  }

  // Check if we can initialize the voice state/channel join
  // Has a dedicated spot in logic, should be used in commands separate
  // from #requireSessionConditions where it could be called before and after checking this logic
  // while it should be right here in the middle
  if (
    useInitializeSessionConditions === true
    && requireInitializeSessionConditions(interaction) !== true
  ) return false;

  // No queue
  else if (
    requireVoiceSession === true
    && (!player || !player.queue || player.queue.size === 0)
  ) {
    const ctx = {
      content: `${ emojis.error } ${ member }, no music is currently being played - \`;play\` something first to initialize a session`,
      ephemeral: true
    };
    if (interaction.deferred || interaction.replied) interaction.editReply(ctx);
    else interaction.reply(ctx);
    return false;
  }

  // Ok, continue
  return true;
};

// eslint-disable-next-line sonarjs/cognitive-complexity
const requireMusicChannel = (interaction, client = null) => {
  const {
    guild, channel, member
  } = interaction;
  const clientObj = client || interaction.client;
  const settings = getGuildSettings(guild.id);
  const { musicChannelIds } = settings;

  // Return if falsy
  if (!musicChannelIds || !musicChannelIds[0]) return true;

  // Use Strict Thread Session command channels
  if (
    settings.useThreadSessions === true
    && settings.threadSessionStrictCommandChannel === true
  ) {
    const player = clientObj?.kazagumo?.getPlayer(guild.id);
    if (
      (!player && !musicChannelIds.includes(channel.id))
      || (player && player.data?.channel && channel.id !== player.data.channel.id)
    ) {
      const output = `${ emojis.error } ${ member }, please use music commands in the dedicated music session channel <#${ player
        ? player.data.channel.id
        : musicChannelIds[0]
      }>`;
      const outputMultipleChannels = `${ emojis.error } ${ member }, please use music commands in one of the dedicated music session channels: ${
        musicChannelIds.map((e) => `<#${ e }>`).join(', ')
      }`;
      const ctx = {
        content: player ? output : outputMultipleChannels,
        ephemeral: true
      };
      if (interaction.deferred || interaction.replied) interaction.editReply(ctx);
      else interaction.reply(ctx);
      return false;
    }
  }

  // ELSE Check array value
  else if (
    Array.isArray(musicChannelIds)
    && musicChannelIds.length !== 0
    && !musicChannelIds.includes(channel.id)
  ) {
    const ctx = {
      content: `${ emojis.error } ${ member }, please use music commands in ${
        musicChannelIds.length === 1
          ? `the dedicated music channel <#${ musicChannelIds[0] }>`
          : `one of the dedicated channels: ${
            musicChannelIds.map((e) => `<#${ e }>`).join(', ')
          }`
      }`,
      ephemeral: true
    };
    if (interaction.deferred || interaction.replied) interaction.editReply(ctx);
    else interaction.reply(ctx);
    return false;
  }

  // Ok, criteria met
  return true;
};

const repeatModeEmoji = (repeatMode) => repeatMode === 'queue'
  ? ':repeat:'
  : repeatMode === 'track'
    ? ':repeat_one:'
    : ':arrow_forward:';

const repeatModeEmojiStr = (repeatMode) => repeatMode === 'queue'
  ? ':repeat: Queue'
  : repeatMode === 'track'
    ? ':repeat_one: Track'
    : ':arrow_forward: Off';

const queueEmbeds = (player, guild, title) => {
  // Ok, display the queue!
  const currQueue = player.queue || [];
  const repeatModeStr = repeatModeEmojiStr(player.loop);
  const usableEmbeds = [];
  const chunkSize = 10;
  for (let i = 0; i < currQueue.length; i += chunkSize) {
    // Cut chunk
    const chunk = currQueue.slice(i, i + chunkSize);
    const embed = new EmbedBuilder()
      .setColor(colorResolver())
      .setAuthor({
        name: `${ title } for ${ guild.name }`,
        iconURL: guild.iconURL({ dynamic: true })
      });

    // Resolve string output
    const chunkOutput = chunk.map((e, ind) => queueTrackCb(e, ind + i)).join('\n');

    // Construct our embed
    embed
      .setDescription(stripIndents`
            **:musical_note: Now Playing:** ${ player.queue.current?.title || 'Nothing' }${ player.loop && player.loop !== 'none' ? `\n**Repeat/Loop Mode:** ${ repeatModeStr }` : '' }
  
            ${ chunkOutput }
          `)
      .setFooter({ text: `Page ${ Math.ceil((i + chunkSize) / chunkSize) } of ${
        Math.ceil(currQueue.length / chunkSize)
      // eslint-disable-next-line sonarjs/no-nested-template-literals
      } (${ i + 1 }-${ Math.min(i + chunkSize, currQueue.length) } / ${ currQueue.length })` });
    
    const thumbnailUrl = chunk[0]?.thumbnail;
    if (thumbnailUrl && thumbnailUrl.trim()) {
      embed.setImage(thumbnailUrl);
    }

    // Always push to usable embeds
    usableEmbeds.push(embed);
  }

  return usableEmbeds;
};

const queueEmbedResponse = (interaction, player, title = 'Queue') => {
  const { guild, member } = interaction;
  // Ok, display the queue!
  const usableEmbeds = queueEmbeds(player, guild, title);
  // Queue empty
  if (usableEmbeds.length === 0) interaction.reply({ embeds: [
    new EmbedBuilder()
      .setColor(colorResolver())
      .setAuthor({
        name: `${ title } for ${ guild.name }`,
        iconURL: guild.iconURL({ dynamic: true })
      })
      .setDescription(`${ title } is currently empty`)
  ] });
  // Reply to the interaction with the SINGLE embed
  else if (usableEmbeds.length === 1) interaction.reply({ embeds: usableEmbeds }).catch(() => { /* Void */ });
  // Properly handle pagination for multiple embeds
  else handlePagination(interaction, member, usableEmbeds);
};

const musicEventChannel = async (client, interaction) => {
  let eventChannel = interaction.channel;
  const { member } = interaction;
  const hasCreateThreadPerms = hasChannelPerms(
    client.user.id,
    interaction.channel,
    [ PermissionFlagsBits.CreatePublicThreads ]
  );
  if (hasCreateThreadPerms !== true) {
    interaction.editReply(`${ emojis.error } ${ member }, the \`Use Thread Sessions\` setting is enabled but I don't have permission to Create Public Threads in this channel - this command has been cancelled`);
    return false;
  }
  if (!interaction.channel.isThread()) {
    const thread = await interaction.channel
      ?.threads
      ?.create({
        name: `Music Session ${ new Date().toUTCString() }`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
        // type: ChannelType.PublicThread,
        startMessage: await interaction.fetchReply(),
        reason: 'Created for use in music session'
      })
      .catch((err) => {
        logger.syserr('Error encountered while creating thread for Use Thread Sessions:');
        console.error(err);
      });
    if (thread) eventChannel = thread;
  }
  return eventChannel;
};

const nowPlayingEmbed = (player, includeSessionDetails = true) => {
  const currentTrack = player.queue.current;
  if (!currentTrack) return null;

  const trackDescriptionOutputStr = currentTrack.description
    ? `\n\`\`\`\n${ currentTrack.description }\`\`\`\n`
    : '';

  const durationOut = currentTrack.isStream ? 'Live' : currentTrack.length;

  const sessionDetails = includeSessionDetails
    ? `\n${ trackDescriptionOutputStr }`
    : '';

  const npEmbed = new EmbedBuilder({ color: colorResolver() })
    .setTitle(currentTrack.title)
    .setURL(currentTrack.uri)
    .setImage(currentTrack.thumbnail)
    .addFields(
      {
        name: 'Details',
        value: stripIndents`
      👑 **Author:** ${ currentTrack.author }
      🚩 **Length:** ${ durationOut }${ sessionDetails }
    `,
        inline: true
      }
    );

  if (includeSessionDetails) {
    npEmbed.addFields({
      name: 'Repeat/Loop Mode',
      value: repeatModeEmojiStr(player.loop),
      inline: false
    });
    if (currentTrack.requester) {
      npEmbed.setFooter({ text: `Requested by: ${ currentTrack.requester.username }` });
    }
    if (player.data?.timestamp) {
      npEmbed.setTimestamp(player.data.timestamp);
    }
  }

  return npEmbed;
};

const audioFilters = () => [];

module.exports = {
  ALLOWED_CONTENT_TYPE,
  queueTrackCb,
  requireDJ,
  requireSessionConditions,
  requireInitializeSessionConditions,
  requireMusicChannel,
  repeatModeEmoji,
  repeatModeEmojiStr,
  queueEmbeds,
  queueEmbedResponse,
  musicEventChannel,
  nowPlayingEmbed,
  audioFilters
};
