'use strict';

const moment = require('moment');
const crypto = require('crypto');
const log4js = require('log4js');
const logger = log4js.getLogger('[BOT]');
logger.level = process.env.LOG_LEVEL;

const AWS = require('aws-sdk');
let s3;
let documentClient;

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

      if (body.events[0].message.type === 'audio') {
        await lineClient.replyMessage(replyToken, {
          type: 'text',
          text: '伝言を登録したよ！',
        });

        const audioData = await Bot.fetchAudioMessage(
            body.events[0].message.id
        );

        const fileName = Bot.generateAudioFileName(
            body.events[0].source.userId
        );

        s3 = Bot.buildS3();

        const paramS3 = {
          ACL: 'public-read',
          Body: audioData,
          Bucket: process.env.AUDIO_BUCKET,
          Key: fileName,
        };
        logger.debug('音声メッセージをS3に保存', JSON.stringify(paramS3));
        await s3.putObject(paramS3).promise();

        documentClient = Bot.buildDocumentClient();

        const paramsDynamoDB = {
          TableName: process.env.AUDIO_TABLE,
          Item: {
            lineId: Bot.hashCode(body.events[0].source.userId),
            created: Bot.now(),
            s3Url: `https://s3-ap-northeast-1.amazonaws.com/${
              process.env.AUDIO_BUCKET
            }/${fileName}`,
            expiredIn: Math.floor(new Date().getTime() / 1000) + 24 * 60 * 60,
          },
        };
        await documentClient.put(paramsDynamoDB).promise();
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
      console.log(err);
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

  hashCode(input) {
    const sha512 = crypto.createHash('sha512');
    sha512.update(`${input}_${process.env.SALT}`);
    return sha512.digest('hex');
  },

  now() {
    return moment().format('YYYYMMDDHHmmssSSS');
  },

  generateAudioFileName(lineId) {
    const now = Bot.now();
    const hash = Bot.hashCode(lineId);
    return `${hash}_${now}.m4a`;
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
      s3 = new AWS.S3();
    }
    logger.info('[END]buildS3');
    return s3;
  },

  buildDocumentClient() {
    logger.info('[START]buildDocumentClient');
    if (!documentClient) {
      logger.debug('DocumentClientのインスタンスを生成');
      documentClient = new AWS.DynamoDB.DocumentClient();
    }
    logger.info('[END]buildDocumentClient');
    return documentClient;
  },
};

exports.handler = Bot.handler;
exports.testModules = Bot;
