const fetch = require('node-fetch');
const config = require('./config.json');
const pThrottle = require('p-throttle');
const verbose = config.verbose;

// Set metadata
const meta = {
  method: "GET",
  compress: true,
  headers: {
    "Authorization": `Discogs key=${config.authKey}, secret=${config.authSecret}`,
    "Content-Type": "application/json",
    "User-Agent": "PersonalResearchApplication/0.1 contact: zakiwa@gmail.com"
  }
};

// Require input file
let input = require(config.inputFile);

// Only process a subset of input file
if (config.offset || config.limit) {
  input = input.slice(config.offset || 0, config.limit || input.length);
}

/**
 * Perform a throttled search.
 * @param {string} query
 * @param {string} type
 */
const search = pThrottle((query, type = 'q') => {
  const url = `${config.apiUrl}//database/search?${type}=${query}`;
  verbose && console.log(`Fetching: ${url}`);
  return fetch(url, meta).then(response => {
    return response.json().then((record) => {
      return Promise.resolve({
        query,
        ...record
      });
    }).catch((err) => `Parsing json failed: ${err}`);
  }).catch((err) => `Fetch failed: ${err}`);;
}, 0.9, 1000);
//}, config.rateLimit.requestsAllowed, config.rateLimit.timeWindow);


/**
 * Searches and handles barcodes so that only exact matches are returned.
 * @param {string} query
 */
const searchBarcode = (query) => {
  return search(query, 'barcode').then(response => {
      let results = [];
      response.results.map((result) => {
        // Discogs API search is *very* fuzzy so we must verify that the
        // barcode is an exact match before proceeding.
        if (compareBarcodes(response.query, result.barcode)) {
          results.push(result);
        }
      });
      return {
        query: response.query,
        results
      }
    }
  ).catch(err => { 
    console.error(`searchBarcode failed: ${err}`)
  });
}

/**
 * Iterate over input file and search Discogs for matching barcodes.
 */
const output = input.map(el=> {
  if (el.barcodes[0]) {
    return searchBarcode(el.barcodes[0], 'barcode');
  }
});

/**
 * Print out processed output.
 */
Promise.all(output).then((output) => {
  console.log(JSON.stringify(output, null, 2));
}).catch(err => console.error(`Promise.all failed: ${err}`));


/**
 * Remove any special characters or spaces.
 * @param {string} string 
 */
const normalizeBarcode = (string) => {
  if (typeof string !== 'string') {
    return string;
  }
  
  return string.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Will take a source barcode and compare it to an array of destination barcodes
 * all of which have been stripped from special characters.
 * @param {string} source 
 * @param {array} destinations 
 */
const compareBarcodes = (source, ...destinations) => {
  return destinations.reduce((match, destination) => {
    return normalizeBarcode(source) === normalizeBarcode(destination) || match;
  }, false);
}

module.exports = { compareBarcodes };