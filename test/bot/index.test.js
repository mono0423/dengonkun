'use strict';

const assert = require('assert');
const sinon = require('sinon');
const constants = require('./testConstants');

// テスト対象
const target = require('../../src/bot/index');

// モック用変数
let mock;

// スタブ用変数
// beforeEachでデフォルトの振る舞いを定義する
// 振る舞いを変えたい場合は、ケースの中で上書きする
let stubLineClient;
let stubS3;

describe('bot', () => {
  before(() => {
    // 環境変数
    process.env.LOG_LEVEL = 'debug'; /* 'OFF' or 'debug' */
    process.env.AUDIO_BUCKET = 'AUDIO_BUCKET';
  });

  beforeEach(() => {
    // スタブのデフォルト動作
    stubLineClient = {replyMessage() {}};
    stubS3 = {
      putObject() {
        return {promise() {}};
      },
    };
  });

  afterEach(() => {
    // 後片付け
    if (mock) {
      mock.restore();
    }
    sinon.restore();
  });

  describe('index.js', () => {
    describe('handler', () => {
      describe('共通', () => {
        it('異常終了時、ステータス500を返す', async () => {
          // LINE Clientでエラーを発生させる
          // ビルダーがスタブを返すようすり替える
          stubLineClient = {
            replyMessage() {
              throw new Error(JSON.stringify({message: 'test'}));
            },
          };
          const fakeBuildLineClient = sinon.fake.returns(stubLineClient);
          sinon.replace(
              target.testModules,
              'buildLineClient',
              fakeBuildLineClient
          );

          const actual = await target.handler({
            body: constants.BODY_TEXT_MESSAGE,
          });

          assert.deepEqual(constants.EXPECT_FAIL, actual);
        });

        it('接続確認の場合、ステータス200を返す', async () => {
          // LINE Clientをモック化
          mock = sinon.mock(stubLineClient);
          mock.expects('replyMessage').never();

          // ビルダーがモックを返すようすり替える
          const fakeBuildLineClient = sinon.fake.returns(stubLineClient);
          sinon.replace(
              target.testModules,
              'buildLineClient',
              fakeBuildLineClient
          );

          const actual = await target.handler({
            body: constants.BODY_CONFIRM_CONNECT,
          });

          assert.deepEqual(constants.EXPECT_SUCCESS, actual);
          mock.verify();
        });
      });

      describe('テキストメッセージ受信時', () => {
        it('固定の文言を返す', async () => {
          // LINE Clientをモック化
          mock = sinon.mock(stubLineClient);
          mock
              .expects('replyMessage')
              .withExactArgs('test-reply-token', {
                type: 'text',
                text: '伝言を音声メッセージで送ってね！',
              })
              .once();

          // ビルダーがモックを返すようすり替える
          const fakeBuildLineClient = sinon.fake.returns(stubLineClient);
          sinon.replace(
              target.testModules,
              'buildLineClient',
              fakeBuildLineClient
          );

          const actual = await target.handler({
            body: constants.BODY_TEXT_MESSAGE,
          });

          assert.deepEqual(constants.EXPECT_SUCCESS, actual);
          mock.verify();
        });
      });

      describe('音声メッセージ受信時', () => {
        it('登録完了メッセージを返却する', async () => {
          // fetchAudioMessageメソッドをスタブ化
          const fakeFetchAudioMessage = sinon.fake.returns(
              Buffer.from('audio-data')
          );
          sinon.replace(
              target.testModules,
              'fetchAudioMessage',
              fakeFetchAudioMessage
          );

          // S3クライアントをスタブ化
          // ビルダーがスタブを返すようすり替える
          const fakeS3 = sinon.fake.returns(stubS3);
          sinon.replace(target.testModules, 'buildS3', fakeS3);

          // LINE Clientをモック化
          mock = sinon.mock(stubLineClient);
          mock
              .expects('replyMessage')
              .withExactArgs('test-reply-token', {
                type: 'text',
                text: '伝言を登録したよ！',
              })
              .once();

          // ビルダーがモックを返すようすり替える
          const fakeBuildLineClient = sinon.fake.returns(stubLineClient);
          sinon.replace(
              target.testModules,
              'buildLineClient',
              fakeBuildLineClient
          );

          const actual = await target.handler({
            body: constants.BODY_AUDIO_MESSAGE,
          });

          assert.deepEqual(constants.EXPECT_SUCCESS, actual);
          mock.verify();
        });

        it('音声メッセージを取得する。', async () => {
          // LINE Clientをスタブ化
          // ビルダーがスタブを返すようすり替える
          const fakeBuildLineClient = sinon.fake.returns(stubLineClient);
          sinon.replace(
              target.testModules,
              'buildLineClient',
              fakeBuildLineClient
          );

          // S3クライアントをスタブ化
          // ビルダーがスタブを返すようすり替える
          const fakeS3 = sinon.fake.returns(stubS3);
          sinon.replace(target.testModules, 'buildS3', fakeS3);

          // fetchAudioMessageメソッドをモック化
          mock = sinon.mock(target.testModules);
          mock
              .expects('fetchAudioMessage')
              .withArgs('0123456789')
              .once()
              .returns(Buffer.from('data'));

          const actual = await target.handler({
            body: constants.BODY_AUDIO_MESSAGE,
          });

          assert.deepEqual(constants.EXPECT_SUCCESS, actual);
          mock.verify();
        });

        it('S3に格納する', async () => {
          // LINE Clientをスタブ化
          // ビルダーがスタブを返すようすり替える
          stubLineClient = {
            replyMessage() {},
            getMessageContent() {
              return {then() {}};
            },
          };
          const fakeBuildLineClient = sinon.fake.returns(stubLineClient);
          sinon.replace(
              target.testModules,
              'buildLineClient',
              fakeBuildLineClient
          );

          // fetchAudioMessageメソッドをスタブ化
          const fakeFetchAudioMessage = sinon.fake.returns(
              Buffer.from('0123456789')
          );
          sinon.replace(
              target.testModules,
              'fetchAudioMessage',
              fakeFetchAudioMessage
          );

          // S3クライアントをモック化
          // ビルダーがスタブを返すようすり替える
          const fakeS3 = sinon.fake.returns(stubS3);
          sinon.replace(target.testModules, 'buildS3', fakeS3);

          const expectedArgs = {
            ACL: 'public-read',
            Body: Buffer.from('0123456789'),
            Bucket: process.env.AUDIO_BUCKET,
            Key: 'test.m4a',
          };
          mock = sinon.mock(stubS3);
          mock
              .expects('putObject')
              .withArgs(expectedArgs)
              .once()
              .returns({promise() {}});

          const actual = await target.handler({
            body: constants.BODY_AUDIO_MESSAGE,
          });

          assert.deepEqual(constants.EXPECT_SUCCESS, actual);
          mock.verify();
        });
      });
    });
  });
});
