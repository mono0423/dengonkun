'use strict';

const sinon = require('sinon');

let mock;

const target = require('../../src/bot/index');

describe('bot', () => {
  afterEach(() => {
    if (!mock) mock.restore();
    sinon.restore();
  });
  describe('index.js', () => {
    describe('handler', () => {
      it('テキストメッセージが送られた場合、固定の文言を返す', async () => {
        // LINE Clientをモック化
        const stubLineClient = {replyMessage() {}};
        mock = sinon.mock(stubLineClient);
        mock
            .expects('replyMessage')
            .withExactArgs('00000000000000000000000000000000', {
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
        await target.handler({body: body});

        mock.verify();
      });
      it('音声メッセージが送信された場合、S3に格納する');
    });
  });
});
