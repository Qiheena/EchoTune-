const { ComponentCommand } = require('../../classes/Commands');

module.exports = new ComponentCommand({ run: async (client, interaction, query) => {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  return [{ name: query, value: query }];
} });
