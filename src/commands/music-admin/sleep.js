const { ApplicationCommandOptionType } = require('discord.js');
const { ChatInputCommand } = require('../../classes/Commands');
const { requireSessionConditions } = require('../../modules/music');
const { useQueue } = require('discord-player');
const logger = require('@QIHeena/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const activeTimers = new Map();

function parseTimeToMs(timeStr) {
  const match = timeStr.match(/^(\d+)(s|m|h)$/);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  
  return null;
}

module.exports = new ChatInputCommand({
  global: true,
  data: {
    description: 'Set a sleep timer - music will stop after the specified time',
    options: [
      {
        name: 'time',
        type: ApplicationCommandOptionType.String,
        description: 'Sleep timer duration (e.g., 30m, 1h, 90s)',
        required: true
      }
    ]
  },
  aliases: ['sl'],
  run: async (client, interaction) => {
    const { emojis } = client.container;
    const { guild, member } = interaction;
    const timeInput = interaction.options.getString('time', true);

    await interaction.deferReply();

    if (!requireSessionConditions(interaction, true, false, true)) return;

    const queue = useQueue(guild.id);
    if (!queue || !queue.isPlaying()) {
      interaction.editReply(`${emojis.error} ${member}, no music is currently playing.`);
      return;
    }

    const totalMs = parseTimeToMs(timeInput);
    if (!totalMs || totalMs < 1000) {
      interaction.editReply(`${emojis.error} ${member}, invalid time format. Use formats like: 30m, 1h, 90s`);
      return;
    }

    if (totalMs > 24 * 60 * 60 * 1000) {
      interaction.editReply(`${emojis.error} ${member}, sleep timer cannot be more than 24 hours.`);
      return;
    }

    // Clear any existing timer for this guild
    const existingTimer = activeTimers.get(guild.id);
    if (existingTimer) {
      clearTimeout(existingTimer.warningTimer);
      clearTimeout(existingTimer.finalTimer);
      clearTimeout(existingTimer.cleanupTimer);
    }

    const totalMinutes = Math.floor(totalMs / 60000);
    const warningMs = Math.max(totalMs - 60000, 0);

    await interaction.editReply(`${emojis.success} ${member}, sleep timer set for **${totalMinutes}** minute${totalMinutes !== 1 ? 's' : ''}. Music will stop automatically unless you respond to the warning.`);

    let warningMessage = null;

    const warningTimer = setTimeout(async () => {
      try {
        const currentQueue = useQueue(guild.id);
        if (!currentQueue || !currentQueue.isPlaying()) {
          activeTimers.delete(guild.id);
          return;
        }

        const confirmButtons = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`sleep_continue_${guild.id}`)
              .setLabel('✅ Continue Playing')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`sleep_stop_${guild.id}`)
              .setLabel('❌ Stop Now')
              .setStyle(ButtonStyle.Danger)
          );

        const channel = queue.metadata?.channel || interaction.channel;
        warningMessage = await channel.send({
          content: `⏰ **Sleep Timer Alert** ${member}\n\n⏱️ Music will stop in **1 minute**. Do you want to continue playing?`,
          components: [confirmButtons]
        });

        const timerData = activeTimers.get(guild.id);
        if (timerData) {
          timerData.warningMessage = warningMessage;
        }

        const collector = warningMessage.createMessageComponentCollector({
          time: 60000
        });

        collector.on('collect', async (btnInteraction) => {
          if (btnInteraction.user.id !== member.user.id) {
            await btnInteraction.reply({
              content: `${emojis.error} Only ${member} can control this sleep timer.`,
              ephemeral: true
            });
            return;
          }

          const existingData = activeTimers.get(guild.id);
          if (existingData) {
            clearTimeout(existingData.finalTimer);
            clearTimeout(existingData.cleanupTimer);
            activeTimers.delete(guild.id);
          }

          if (btnInteraction.customId === `sleep_continue_${guild.id}`) {
            await btnInteraction.update({
              content: `${emojis.success} ${member}, sleep timer cancelled. Music will continue playing!`,
              components: []
            });
            setTimeout(() => {
              warningMessage.delete().catch(() => {});
            }, 10000);
          } else if (btnInteraction.customId === `sleep_stop_${guild.id}`) {
            await btnInteraction.update({
              content: `${emojis.success} ${member}, stopping music and leaving voice channel...`,
              components: []
            });

            const currentQueue = useQueue(guild.id);
            if (currentQueue) {
              currentQueue.delete();
              logger.info(`[Sleep Timer] Music stopped early by user in guild ${guild.id}`);
            }

            setTimeout(() => {
              warningMessage.delete().catch(() => {});
            }, 5000);
          }
        });

      } catch (err) {
        logger.syserr('[Sleep Timer] Error sending warning:', err);
      }
    }, warningMs);

    const finalTimer = setTimeout(async () => {
      try {
        const currentQueue = useQueue(guild.id);
        if (!currentQueue || !currentQueue.isPlaying()) {
          activeTimers.delete(guild.id);
          return;
        }

        const channel = queue.metadata?.channel || interaction.channel;
        await channel.send(`⏰ **Sleep Timer Expired** ${member}\n\nStopping music and leaving voice channel. Good night! 🌙`);

        currentQueue.delete();
        logger.info(`[Sleep Timer] Music stopped due to sleep timer in guild ${guild.id}`);

        if (warningMessage) {
          setTimeout(() => {
            warningMessage.delete().catch(() => {});
          }, 2000);
        }

        activeTimers.delete(guild.id);
      } catch (err) {
        logger.syserr('[Sleep Timer] Error executing final timer:', err);
        activeTimers.delete(guild.id);
      }
    }, totalMs);

    const cleanupTimer = setTimeout(() => {
      activeTimers.delete(guild.id);
    }, totalMs + 10000);

    activeTimers.set(guild.id, {
      warningTimer,
      finalTimer,
      cleanupTimer,
      warningMessage: null,
      startTime: Date.now(),
      endTime: Date.now() + totalMs
    });

    logger.info(`[Sleep Timer] Set for ${totalMinutes} minutes in guild ${guild.id}`);
  }
});
