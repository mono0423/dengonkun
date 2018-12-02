'use strict';

const log4js = require('log4js');
const logger = log4js.getLogger('[BOT]');
logger.level = process.env.LOG_LEVEL;

const line = require('@line/bot-sdk');
let lineClient;

const Bot = {
  async handler(event) {
    try {
      logger.debug(JSON.stringify(event));
      const body = JSON.parse(event.body);

      if (body.events[0].replyToken === '00000000000000000000000000000000') {
        logger.info('接続確認のため、成功で返却する');
        return {
          statusCode: 200,
        };
      }

      lineClient = Bot.buildLineClient();
      await lineClient.replyMessage(body.events[0].replyToken, {
        type: 'text',
        text: '残したい伝言を音声メッセージで送ってね！',
      });

      return {
        statusCode: 200,
      };
    } catch (e) {
      logger.error(JSON.stringify(e));
      return {
        statusCode: 500,
        body: {
          message: 'internal server error',
        },
      };
    }
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
