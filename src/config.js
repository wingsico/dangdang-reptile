const path = require('path');

module.exports = {
  baseUrl: "http://book.dangdang.com",
  typesPath: "20181116_qsoj",
  rootPath: path.resolve(__dirname, '../'),
  requestConfig: {
    timeout: {
      response: 1000 * 60 * 4,
      deadline: 1000 * 60 * 5,
    },
    buffer: true,
    charset: 'gb2312',
  },
}