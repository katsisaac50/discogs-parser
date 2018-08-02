# Instructions for running

1. Place the json-file you wish to process in the /data folder.
2. Sign up with Discogs and create your personal api key and secret.
3. Create a config.json file in the following format and place it in the root of the project:
```
(config.json)
  {
    "apiUrl": "https://api.discogs.com",
    "authKey": "[...]",
    "authSecret": "[...]",
    "inputFile": "./data/[...].json",
    "rateLimit": {
      "requestsAllowed": 55,
      "timeWindow": 60000
    },
  }
```
4. Replace with appropriate values for `authKey`, `authSecret` and `inputFile`.
5. Run `npm install`
6. Run `node index.js`

Additional configuration options:
* `limit` values `integer` will limit how many items from the input file you are processing.
* `offset` values `integer` will skip the first given number of items from the input file you are processing.
* `verbose` values `true|false` will give you more logging output.
