'use strict';

const clova = require('@line/clova-cek-sdk-nodejs');

// AWS-SDK
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

const crypto = require('crypto');

exports.handler = async (event) => {
  console.log('event: ', JSON.stringify(event));
  const context = new clova.Context(JSON.parse(event.body));
  const requestType = context.requestObject.request.type;
  const requestHandler = clovaSkillHandler.config.requestHandlers[requestType];

  await requestHandler.call(context, context);

  return {
    statusCode: 200,
    body: JSON.stringify(context.responseObject),
  };
};

const clovaSkillHandler = clova.Client.configureSkill()
    .onLaunchRequest(async (responseHelper) => {
      console.log('responseHelper', JSON.stringify(responseHelper));
      // Dynamoから伝言リストを取得
      const param = {
        TableName: process.env.AUDIO_TABLE,
        KeyConditionExpression: 'lineId = :l',
        ExpressionAttributeValues: {
          ':l': hashCode(responseHelper.requestObject.session.user.userId),
        },
      };

      console.log('伝言リストを取得:', JSON.stringify(param));
      const audioList = await docClient.query(param).promise();
      console.log(JSON.stringify(audioList.Items));

      const length = audioList.Items.length;

      if (length === 0) {
        responseHelper
            .setSimpleSpeech({
              lang: 'ja',
              type: 'PlainText',
              value: `伝言君です。今日の伝言はありません。伝言くんを終了します。`,
            })
            .endSession();
        return;
      }

      responseHelper
          .setSimpleSpeech({
            lang: 'ja',
            type: 'PlainText',
            value: `伝言君です。伝言が${length}件あります。再生しますか？`,
          })
          .setSessionAttributes({
            url: audioList.Items[0].s3Url,
            created: audioList.Items[0].created,
            lineId: audioList.Items[0].lineId,
          });
    })
    .onIntentRequest(async (responseHelper) => {
      console.log('responseHelper', JSON.stringify(responseHelper));
      const intent = responseHelper.getIntentName();
      const sessionId = responseHelper.getSessionId();

      console.log('intent: ', intent);
      switch (intent) {
        case 'Clova.YesIntent':
        case 'PlayIntent':
          const {lineId, created, url} = responseHelper.getSessionAttributes();

          responseHelper
              .setSpeechList([
                clova.SpeechBuilder.createSpeechText(`再生します。`),
                clova.SpeechBuilder.createSpeechUrl(url),
              ])
              .endSession();

          const param = {
            TableName: process.env.AUDIO_TABLE,
            Key: {
              lineId,
              created,
            },
          };
          console.log('再生済みの伝言を削除する', JSON.stringify(param));
          await docClient.delete(param).promise();

          break;
        case 'Clova.NoIntent':
        case 'EndIntent':
          break;
      }
    })
    .onSessionEndedRequest((responseHelper) => {
      const sessionId = responseHelper.getSessionId();
    });

const hashCode = (input) => {
  const sha512 = crypto.createHash('sha512');
  sha512.update(`${input}_${process.env.SALT}`);
  return sha512.digest('hex');
};
