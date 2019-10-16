module.exports = {
  EXPECT_SUCCESS: {
    statusCode: 200,
  },
  EXPECT_FAIL: {
    statusCode: 500,
    body: JSON.stringify({
      message: 'internal server error',
    }),
  },
  BODY_TEXT_MESSAGE:
    '{ "events": [{ "replyToken": "test-reply-token", "type": "message", "timestamp": 1543720496343, "source": { "type": "user", "userId": "Udeadbeefdeadbeefdeadbeefdeadbeef" }, "message": { "id": "100001", "type": "text", "text": "Hello, world" } }] }',
  BODY_CONFIRM_CONNECT:
    '{"events":[{"replyToken":"00000000000000000000000000000000","type":"message","timestamp":1543720496343,"source":{"type":"user","userId":"Udeadbeefdeadbeefdeadbeefdeadbeef"},"message":{"id":"100001","type":"text","text":"Hello, world"}}]}',
  BODY_AUDIO_MESSAGE:
    '{"events":[{"replyToken":"test-reply-token","type":"message","timestamp":1543720496343,"source":{"type":"user","userId":"Udeadbeefdeadbeefdeadbeefdeadbeef"},"message":{"type":"audio","id":"0123456789","contentProvider":{"type":"line"},"duration":2000}}]}',
};
