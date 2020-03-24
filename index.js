const express = require('express');

const app = express();
require('./config/express')(app);
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');

// declare Watson Assistant service
const assistant = new AssistantV2({
  version: '2019-02-28',
  authenticator: new IamAuthenticator({
    apikey: process.env.ASSISTANT_IAM_APIKEY,
  }),
  url: process.env.ASSISTANT_URL,
});

const date = new Date();
date.setMonth(date.getMonth() + 1);
const initContext = {
  skills: {
    'main skill': {
      user_defined: {
        acc_minamt: 50,
        acc_currbal: 430,
        acc_paydue: `${date.getFullYear()}-${date.getMonth() + 1}-26 12:00:00`,
        accnames: [5624, 5893, 9225],
      },
    },
  },
};

app.get('/', (req, res) => {
  res.render('./dist/index.html');
});

app.use((req, res, next) => {
  console.log(req.method);
  console.log(req.url);
  if (req.body) {
    console.log(req.body);
  }
  console.log();
  next();
});

app.post('/api/message', (req, res) => {
  // check for assistant id and handle null assistant env variable
  const assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
  if (!assistantId || assistantId === '<assistant-id>') {
    return res.json({
      output: {
        text: 'The app has not been configured with a ASSISTANT_ID environment variable.',
      },
    });
  }

  let textIn = '';

  if (req.body.input) {
    textIn = req.body.input.text;
  }

  // assemble assistant payload
  const payload = {
    assistantId,
    sessionId: req.body.session_id,
    input: {
      message_type: 'text',
      text: textIn,
    },
  };

  if (req.body.isFirstCall || req.body.context) {
    payload.context = req.body.context || initContext;
  }

  // send payload to Conversation and return result
  return assistant.message(payload, (err, data) => {
    if (err) {
      console.log(err);
      return res.status(err.code || 500).json(err);
    }
    console.log(JSON.stringify(data, null, 4));
    return res.json(data);
  });
});

app.get('/api/session', (req, res) => {
  assistant.createSession(
    {
      assistantId: process.env.ASSISTANT_ID || '{assistant_id}',
    },
    (error, response) => {
      if (error) {
        console.log(error);
        return res.status(error.code || 500).send(error);
      }
      return res.send(response);
    },
  );
});

module.exports = app;
