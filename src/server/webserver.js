const express = require("express");
const logger = require('@QIHeena/logger');
const app = express();

app.get("/", (req, res) => res.send("Bot is running!"));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.success(`Express webserver listening on port ${PORT}`);
});

server.on('error', (err) => {
  logger.syserr('Express webserver error:', err.message);
});
