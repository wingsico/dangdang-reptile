const fetchBookInfo = require('./fetchBookInfo');
const Async = require('async');
const { log, writeJSON, readJSON } = require('../utils/utils')
const sleep = require('sleep');

const {
  resultDir,
} = require('../config');


function getAllBooksInfo(allTypeBooks) {
  return new Promise(async (resolve, reject) => {
    const allBooksInfo = [];

    const queue = Async.queue((p_task, p_callback) => {
      (async (task, callback) => {
        const booksInfo = await getBooksInfoByType(task, callback)
        allBooksInfo.push(booksInfo);
      })(p_task, p_callback);
    }, 4)

    queue.push(allTypeBooks);

    queue.drain = () => {
      resolve(allBooksInfo)
    }

    queue.error = (e) => {
      log.error(e);
      resolve(allBooksInfo)
    }
  })
}

function fetchBooksInfoByType(p_task, p_callback) {
  return new Promise((resolve, reject) => {
    const { type, data } = p_task;

    const booksInfoByType = [];

    const newData = data.map((dat, index) => ({ ...dat, size: data.length, index }));

    const queue = Async.queue((task, callback) => {
      (async (_task, _cb)=> {
        const bookInfo = await fetchBookInfo(_task, _cb)
        booksInfoByType.push(bookInfo);
      })(task, callback)
    }, 100)

    queue.push(newData);

    queue.drain = () => {
      p_callback();
      resolve({
        type,
        data: booksInfoByType,
      })
    }
  })
}

async function getBooksInfoByType(task, callback) {
  const { type } = task;
  let booksInfoByType = {};
  log.process(` => 开始获取${type}类书籍详细信息`)
  try {
    booksInfoByType = await readJSON(`${resultDir}/${type}`);
    callback()
  } catch (e) {
    booksInfoByType = await fetchBooksInfoByType(task, callback);
    const fileInfo = await writeJSON(booksInfoByType,`${resultDir}/${type}`);
  }

  log.succuss(` <= ${type}类书籍详细信息获取成功`)

  return booksInfoByType;
}

module.exports = getAllBooksInfo;