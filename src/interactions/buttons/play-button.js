const { ComponentCommand } = require('../../classes/Commands');
const { MS_IN_ONE_SECOND } = require('../../constants');
const { getGuildSettings } = require('../../modules/db');
const { requireSessionConditions, musicEventChannel } = require('../../modules/music');
const { clientConfig } = require('../../util');

module.exports = new ComponentCommand({ run: async (client, interaction) => {
  const {
    guild, customId, member
  } = interaction;
  const { emojis } = client.container;
  const [
    ,
    ,
    componentMemberId,
    url
  ] = customId.split('@');
  if (member.id !== componentMemberId) {
    interaction.reply(`${emojis.error} ${member}, this component isn't meant for you, use the \`;search\` command yourself - this action has been cancelled`);
    return;
  }

  if (!requireSessionConditions(interaction, false, true, false)) return;

  const channel = member.voice?.channel;

  await interaction.deferReply();

  try {
    const settings = getGuildSettings(guild.id);

    let eventChannel = interaction.channel;
    if (settings.useThreadSessions) {
      eventChannel = await musicEventChannel(client, interaction);
      if (eventChannel === false) return;
    }

    let volume = settings.volume ?? clientConfig.defaultVolume;
    volume = Math.min(100, volume);

    const kazagumo = client.kazagumo;
    let player = kazagumo.getPlayer(guild.id);
    
    if (!player) {
      player = await kazagumo.createPlayer({
        guildId: guild.id,
        textId: interaction.channelId,
        voiceId: channel.id,
        volume: volume,
        deaf: true
      });
    }

    player.setVolume(volume);
    
    if (!player.data) {
      player.data = {
        channel: eventChannel,
        member,
        timestamp: interaction.createdTimestamp
      };
    }

    const result = await kazagumo.search(url, { requester: interaction.user });
    
    if (!result || !result.tracks || result.tracks.length === 0) {
      await interaction.editReply(`${emojis.error} ${member}, no tracks found!`);
      return;
    }

    const track = result.tracks[0];
    player.queue.add(track);
    
    if (!player.playing && !player.paused) {
      player.play();
    }

    if (Number.isInteger(settings.repeatMode)) {
      if (settings.repeatMode === 1) player.setLoop('track');
      else if (settings.repeatMode === 2) player.setLoop('queue');
      else player.setLoop('none');
    }

    await interaction.editReply(`${emojis.success} ${member}, enqueued **\`${track.title}\`**!`);
    
    setTimeout(() => {
      interaction.message.delete().catch(() => {});
    }, 3000);
  }
  catch (e) {
    interaction.editReply(`${emojis.error} ${member}, something went wrong:\n\n${e.message}`);
  }
} });
