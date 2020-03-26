const express = require('express');

const app = express();
require('./config/express')(app);
const AssistantV2 = require('ibm-watson/assistant/v2');
const DiscoveryV1 = require('ibm-watson/discovery/v1');
const { IamAuthenticator } = require('ibm-watson/auth');

// declare Watson Assistant service
const assistant = new AssistantV2({
  version: '2019-02-28',
  authenticator: new IamAuthenticator({
    apikey: process.env.ASSISTANT_IAM_APIKEY,
  }),
  url: process.env.ASSISTANT_URL,
});

// declare Discovery service
const discovery = new DiscoveryV1({
  version: '2019-02-28',
  authenticator: new IamAuthenticator({ 
    apikey: process.env.DISCOVERY_IAM_APIKEY
  }),
  url: process.env.DISCOVERY_URL
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
  const missingVariables = [];
  // check for assistant id and handle null assistant env variable
  const assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
  if (!assistantId || assistantId === '<assistant-id>') {
    return res.json({
      output: {
        text: 'The app has not been configured with a ASSISTANT_ID environment variable.',
      },
    });
  }

  // TODO: Consider moving this into Discovery function or turning it into a warning message?
  const discoveryCollectionId = process.env.DISCOVERY_COLLECTION_ID || '<discovery-id>';
  const discoveryEnvironmentId = process.env.DISCOVERY_ENVIRONMENT_ID || '<environment-id>';

  if (!discoveryCollectionId || discoveryCollectionId === '<discovery-id>') {
    missingVariables.push('The app has not been configured with a DISCOVERY_COLLECTION_ID environment variable.');
  }

  if (!discoveryEnvironmentId || discoveryEnvironmentId === '<environment-id>') {
    missingVariables.push('The app has not been configured with a DISCOVERY_ENVIRONMENT_ID environment variable.');
  }

  if (missingVariables.length !== 0) {
    const error = missingVariables.join(' ');
    console.log(error);
    return res.json({
      output: {
        text: error
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
      options: {
        return_context: true
      }
    },
  };

  if (req.body.isFirstCall || req.body.context) {
    payload.context = req.body.context || initContext;
  }

  if (payload.input.text.match('discovery')) {
    console.log('calling Discovery...');
    getDiscoveryResults(textIn, function(err, data) {
      if (err) {
        console.log(err);
        return res.status(err.code || 500).json(err);
      } else {
        console.log('Success');
        return res.json(data);
      }
    });
  } else {
    // send payload to Conversation and return result
    return assistant.message(payload, (err, data) => {
      if (err) {
        console.log(err);
        return res.status(err.code || 500).json(err);
      }
      console.log(JSON.stringify(data, null, 4));
      return res.json(data);
    });
  }

});

function getDiscoveryResults(query, callback) {
  const queryParams = {
    environmentId: process.env.DISCOVERY_ENVIRONMENT_ID,
    collectionId: process.env.DISCOVERY_COLLECTION_ID,
    naturalLanguageQuery: query
  };

  return discovery.query(queryParams, (err, data) => {
    if (err) {
      callback(err, null);
    } else {
      // Converts Discovery API response
      let botResponse;
      if (data.result.results.length > 0) {
        data.result.results.forEach((result) => {
          // Depending on the data, a result may have a subtitle and no title, or vice versa
          if (!result.hasOwnProperty('title')) {
            const title = result.hasOwnProperty('subtitle') ? result.subtitle : [''];
            Object.defineProperty(result, 'title', {
              value: title,
              enumerable: true
            });
          }
        });
        botResponse = 'Here is what I could find:'
      } else {
        botResponse = 'Sorry, I couldn\'t find anything that matched your query.'
      }

      const response = {
        status: data.status,
        statusText: data.statusText,
        headers: data.headers,
        result: {
          output: {
            generic: [{
              header: botResponse,
              response_type: 'search',
              results: data.result.results
            }]
          }
        }
      };

      callback(null, response);
    }
  });
}


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
