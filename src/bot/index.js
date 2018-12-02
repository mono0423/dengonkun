'use strict';

const line = require('@line/bot-sdk');
let lineClient;

const Bot = {
  async handler(event) {
    const body = JSON.parse(event.body);

    lineClient = Bot.buildLineClient();
    await lineClient.replyMessage(body.events[0].replyToken, {
      type: 'text',
      text: '残したい伝言を音声メッセージで送ってね！',
    });
  },

  async buildLineClient() {
    if (!lineClient) {
      lineClient = new line.Client({
        channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.CHANNEL_SECRET,
      });
    }
    return lineClient;
  },
};

exports.handler = Bot.handler;
exports.testModules = Bot;
