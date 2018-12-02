'use strict';

const log4js = require('log4js');
const logger = log4js.getLogger('[BOT]');
logger.level = process.env.LOG_LEVEL;

const {S3} = require('aws-sdk');
let s3;

const line = require('@line/bot-sdk');
let lineClient;

const Bot = {
  async handler(event) {
    try {
      logger.info('[START]handler');
      logger.debug(JSON.stringify(event));
      const body = JSON.parse(event.body);

      // todo:リクエストの検証

      const replyToken = body.events[0].replyToken;
      if (replyToken === '00000000000000000000000000000000') {
        logger.info('接続確認のため、成功で返却する');
        return {
          statusCode: 200,
        };
      }

      lineClient = Bot.buildLineClient();

      // テキストメッセージと音声メッセージの分岐
      if (body.events[0].message.type === 'audio') {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '伝言を登録したよ！',
        });

        const audioData = await Bot.fetchAudioMessage(
            body.events[0].message.id
        );

        s3 = Bot.buildS3();

        const param = {
          ACL: 'public-read',
          Body: audioData,
          Bucket: process.env.AUDIO_BUCKET,
          Key: 'test.m4a', // todo: ファイル名をLINE ID + 日時
        };
        await s3.putObject(param).promise();
      } else {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '伝言を音声メッセージで送ってね！',
        });
      }

      logger.info('[END]handler');
      return {
        statusCode: 200,
      };
    } catch (err) {
      logger.error(err);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'internal server error',
        }),
      };
    }
  },

  async fetchAudioMessage(messageId) {
    logger.info('[START]getVoiceMessage');
    return new Promise((resolve, reject) => {
      lineClient.getMessageContent(messageId).then((stream) => {
        const content = [];
        stream
            .on('data', (chunk) => {
              logger.debug(chunk);
              content.push(new Buffer(chunk));
            })
            .on('error', (err) => {
              reject(err);
            })
            .on('end', function() {
              logger.debug(content);
              logger.info('[END  ]getVoiceMessage');
              resolve(Buffer.concat(content));
            });
      });
    });
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

  buildS3() {
    logger.info('[START]buildS3');
    if (!s3) {
      logger.debug('S3のインスタンスを生成');
      s3 = new S3();
    }
    logger.info('[END]buildS3');
    return s3;
  },
};

exports.handler = Bot.handler;
exports.testModules = Bot;
