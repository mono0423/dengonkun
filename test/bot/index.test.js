'use strict';

const assert = require('assert');
const sinon = require('sinon');

let mock;

const target = require('../../src/bot/index');

describe('bot', () => {
  before(() => {
    // 環境変数
    process.env.LOG_LEVEL = 'OFF'; /* or 'debug' */
  });

  afterEach(() => {
    if (mock) mock.restore();
    sinon.restore();
  });
  describe('index.js', () => {
    describe('handler', () => {
      describe('共通', () => {
        it('正常終了時、ステータス200を返す', async () => {
          // 想定結果
          const expect = {
            statusCode: 200,
          };

          // ビルダーがスタブを返すようすり替える;
          const stubLineClient = {replyMessage() {}};
          const fakeBuildLineClient = sinon.fake.returns(stubLineClient);
          sinon.replace(
              target.testModules,
              'buildLineClient',
              fakeBuildLineClient
          );

          const body = JSON.stringify({
            events: [
              {
                replyToken: 'test-reply-token',
                type: 'message',
                timestamp: 1543720496343,
                source: {
                  type: 'user',
                  userId: 'Udeadbeefdeadbeefdeadbeefdeadbeef',
                },
                message: {id: '100001', type: 'text', text: 'Hello, world'},
              },
            ],
          });

          const actual = await target.handler({body: body});
          assert.deepEqual(expect, actual);
        });

        it('異常終了時、ステータス500を返す', async () => {
          // 想定結果
          const expect = {
            statusCode: 500,
            body: JSON.stringify({
              message: 'internal server error',
            }),
          };

          // ビルダーがスタブを返すようすり替える;
          const stubLineClient = {
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

          const body = JSON.stringify({
            events: [
              {
                replyToken: 'test-reply-token',
                type: 'message',
                timestamp: 1543720496343,
                source: {
                  type: 'user',
                  userId: 'Udeadbeefdeadbeefdeadbeefdeadbeef',
                },
                message: {id: '100001', type: 'text', text: 'Hello, world'},
              },
            ],
          });

          const actual = await target.handler({body: body});
          assert.deepEqual(expect, actual);
        });

        it('接続確認の場合、ステータス200を返す', async () => {
          // 想定結果
          const expect = {
            statusCode: 200,
          };

          // LINE Clientをモック化
          const stubLineClient = {replyMessage() {}};
          mock = sinon.mock(stubLineClient);
          mock.expects('replyMessage').never();

          // ビルダーがモックを返すようすり替える
          const fakeBuildLineClient = sinon.fake.returns(stubLineClient);
          sinon.replace(
              target.testModules,
              'buildLineClient',
              fakeBuildLineClient
          );

          const body = JSON.stringify({
            events: [
              {
                replyToken: '00000000000000000000000000000000',
                type: 'message',
                timestamp: 1543720496343,
                source: {
                  type: 'user',
                  userId: 'Udeadbeefdeadbeefdeadbeefdeadbeef',
                },
                message: {id: '100001', type: 'text', text: 'Hello, world'},
              },
            ],
          });
          const actual = await target.handler({body: body});

          assert.deepEqual(expect, actual);
          mock.verify();
        });
      });
      describe('テキストメッセージ受信時', () => {
        it('固定の文言を返す', async () => {
          // LINE Clientをモック化
          const stubLineClient = {replyMessage() {}};
          mock = sinon.mock(stubLineClient);
          mock
              .expects('replyMessage')
              .withExactArgs('test-reply-token', {
                type: 'text',
                text: '残したい伝言を音声メッセージで送ってね！',
              })
              .once();

          // ビルダーがモックを返すようすり替える
          const fakeBuildLineClient = sinon.fake.returns(stubLineClient);
          sinon.replace(
              target.testModules,
              'buildLineClient',
              fakeBuildLineClient
          );

          const body = JSON.stringify({
            events: [
              {
                replyToken: 'test-reply-token',
                type: 'message',
                timestamp: 1543720496343,
                source: {
                  type: 'user',
                  userId: 'Udeadbeefdeadbeefdeadbeefdeadbeef',
                },
                message: {id: '100001', type: 'text', text: 'Hello, world'},
              },
            ],
          });
          await target.handler({body: body});

          mock.verify();
        });
      });

      describe('音声メッセージ受信時', () => {
        it('S3に格納する');
      });
    });
  });
});
