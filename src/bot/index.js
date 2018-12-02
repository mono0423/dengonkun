'use strict';

const log4js = require('log4js');
const logger = log4js.getLogger('[BOT]');
logger.level = process.env.LOG_LEVEL;

const line = require('@line/bot-sdk');
let lineClient;

const Bot = {
  async handler(event) {
    try {
      logger.info('[START]handler');
      logger.debug(JSON.stringify(event));
      const body = JSON.parse(event.body);

      const replyToken = body.events[0].replyToken;
      if (replyToken === '00000000000000000000000000000000') {
        logger.info('接続確認のため、成功で返却する');
        return {
          statusCode: 200,
        };
      }

      lineClient = Bot.buildLineClient();
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: '残したい伝言を音声メッセージで送ってね！',
      });

      logger.info('[END]handler');
      return {
        statusCode: 200,
      };
    } catch (err) {
      logger.error(JSON.stringify(err));
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'internal server error',
        }),
      };
    }
  },

  buildLineClient() {
    logger.info('[START]buildLineClient');
    if (!lineClient) {
      logger.debug('LINEクライアントのインスタンスを生成');
      lineClient = new line.Client({
        channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.CHANNEL_SECRET,
      });
    }
    logger.info('[END]buildLineClient');
    return lineClient;
  },
};

exports.handler = Bot.handler;
exports.testModules = Bot;
