const fs = require('fs');
const fetch = require('node-fetch');
const config = require('./config.json');
const PQueue = require('p-queue');
let output = [];
let ratelimitValues = {
  remaining: 60,
  currentRate: 0,
  lastReset: null
}

const validateConfig = () => {
  // @todo
  return true;
}
let taskCount = 0;
let startCount = 0;
let count = 0;


const meta = {
  method: "GET",
  compress: true,
  headers: {
    "Authorization": `Discogs key=${config.authKey}, secret=${config.authSecret}`,
    "Content-Type": "application/json",
    "User-Agent": "PersonalResearchApplication/0.1 contact: zakiwa@gmail.com"
  }
};

const queue = new PQueue({concurrency: 5});

const search = (query, type = 'q') => {
  console.log(`Started task ${startCount++}`)
  // const fakeProm = new Promise((resolve, reject) => {
  //   setTimeout(() => {
  //     resolve();
  //     console.log(count++);
  //     return fakeProm
  //   }, Math.random * 2000);
  // });

  // queue.add(() => fakeProm).then(() => rateLimit(queue));
  // return fakeProm;


  const url = `${config.apiUrl}/database/search?${type}=${query}`;
  console.log(`Fetching ${url}`);
  
  // Add promise to queue
  return queue.add(() => {
    return fetch(
      `${config.apiUrl}/database/search?${type}=${query}`,
      meta
    ).catch(err => console.error(`Search failed. Error message:\n${err}`));
  })
  .then((result) => {
    console.log(`Finished task ${taskCount++}`);
    return result;
  })
  .then((result) => rateLimit(queue, result));
}

if (validateConfig()) {
  const ratelimit = config.ratelimit || 60;
  let input = require(config.inputFile);
  if (config.offset || config.limit) {
    input = input.slice(config.offset || 0, config.limit || input.length);
  }

  input.map((el) => {
    const searchQuery = el.barcodes[0];
    if (searchQuery) {
      search(searchQuery, 'barcode')
        .then((res) => {

          // Read the remaining rate limit
          if (res && res.headers) {
            rateLimitRemaining = res.headers.get('X-Discogs-Ratelimit-Remaining');
            console.log(`Remaining rate limit: ${rateLimitRemaining}`);
          }

          res.json().then((response) => {
            // Check that any results were found
            if (response.pagination.items > 0) {
              console.log(`Search term: ${searchQuery} `);
              const searchResults = response.results.map((result) => {

                // Indicates whether at least one of the barcodes matches the original
                barcodeMatches = false;

                // Most resources have multiple barcodes
                result.barcode.map((resultCode) => {
                  if (normalizeBarcode(resultCode) === normalizeBarcode(searchQuery)) {
                    console.log(`Matching result: ${resultCode}`);
                    barcodeMatches = true;
                  }
                });

                if (barcodeMatches) {
                  output.push({
                    original: el,
                    discogs: result
                  });
                }
              });
            }  
          }).catch((err) => console.error(err));
        });
    }
  });
}

const normalizeBarcode = (string) => {
  // Remove any special characters or spaces
  return string.replace(/[^a-zA-Z0-9]/g, '');
}

const rateLimit = (queue, result) => {
  if (config.rateLimit) {
    // If the queue is already paused we don't need any further checks.
    if (queue.isPaused) {
      return result;
    }

    const val = ratelimitValues;
    const limitingInterval = 60000;

    if (!val.lastReset) {
      // First run only
      val.lastReset = Date.now();
    }
    
    let timeSinceReset = Date.now() - val.lastReset;

    if (timeSinceReset > limitingInterval) {
      val.lastReset = Date.now();
      val.currentRate = 0;
      timeSinceReset = 0;
    }

    val.currentRate++;

    // Whenever the rate exceeds 50, pause the queue and 
    if (val.currentRate > 50 && timeSinceReset < limitingInterval) {
      queue.pause();
      console.log(`Queue paused due to rate limits. Please wait ${(limitingInterval - timeSinceReset)/1000}s`);
      setTimeout(() => {
        queue.start();
        console.log('Queue re-started.');
      }, limitingInterval - timeSinceReset);
    }
  }
  return result;
}

queue.onIdle().then(() => {
  console.log('Queue finished');
  writeOutputFile(output);
});

const writeOutputFile = (json) => {
  const filename = `./data/output/${Date.now()}.csv`;
  
  fs.writeFile(filename, json, 'utf8', () => {
    console.log(`Finished writing file: ${filename}`);
  });
}