const {compareBarcodes} = require('./index.js');

// test('adds 1 + 2 to equal 3', () => {
//   expect(sum(1, 2)).toBe(3);
// });
test('Expect two barcodes to match', () => {
  expect(compareBarcodes('WA-123.22', 'WA-123.22')).toBeTruthy();
});
