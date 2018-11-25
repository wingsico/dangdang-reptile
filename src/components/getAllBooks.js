const cheerio = require('cheerio');
const request = require('../utils/request');
const Async = require('async');
const { log, writeJSON, readJSON } = require('../utils/utils')

const {
  requestConfig: {
    timeout,
    charset,
    buffer,
  },
  tempDir,
} = require('../config');

function getAllBooks(bookTypes) {
  return new Promise((resolve) => {
    const allTypeBooks = [];

    const queue = Async.queue((p_task, p_callback) => {
      (async (task, callback) => {
        const books = await getBooksByType(task, callback)
        allTypeBooks.push(books)
      })(p_task, p_callback);
    }, 100);

    queue.push(bookTypes)

    queue.drain = () => {
      resolve(allTypeBooks)
    }
  })
}


function fetchBooksByType(task, callback) {
  return new Promise(async (resolve, reject) => {
    const { type, href } = task;
    let currentPage = 1;

    const books = {
      type,
      data: [],
    };
    const { text } = await request.get(href).timeout(timeout).charset(charset).buffer(buffer);
    const totalPage = parseInt(cheerio.load(text)('.paginating .next').prev().find('a').text().trim());


    const queue = Async.queue((task, callback) => {
      fetchBooksByPage(task, callback);
    }, 40);

    const pageTasks = Array.from(new Array(totalPage - 1), () => ({
      href,
      page: ++currentPage,
      books,
    }));

    queue.push(pageTasks)

    queue.error = (e) => {
      reject(e);
    }

    queue.drain = () => {
      resolve(books);
      callback();
    }
  })

}

async function fetchBooksByPage(task, callback) {
  const { href, page, books = {} } = task;
  const pageHref = page === 1 ? href : `${href}&page_index=${page}`
  try {
    const { text: html } = await request.get(pageHref).timeout(timeout).charset(charset).buffer(buffer);

    const $ = cheerio.load(html);

    $("#bd_auto .list_aa li").each(async (index, element) => {
      const $this = $(element);
      const title = $this.find('.name a').text().trim();
      const coverUrl = $this.find('a.img img').attr('data-original');
      const infoUrl = $this.find('a.img').attr('href');
      const price = $this.find('.button > span').text().slice(1); // 去除 ￥ 符号

      books.data.push({
        title,
        coverUrl,
        price,
        infoUrl,
      })
    })

  } catch (e) {
    log.error(e);
    callback(e);
    return;
  }
  callback(undefined);
}

async function getBooksByType(task, callback) {
  const { type } = task;
  let bookTypes = [];
  log.process(` => 开始获取 ${type}类`)
  try {
    bookTypes = await readJSON(`${tempDir}/${type}`);
    callback();
  } catch (e) {
    bookTypes = await fetchBooksByType(task, callback);
    const fileInfo = await writeJSON(bookTypes,`${tempDir}/${type}`);
  }
  log.succuss(` <= ${type}类 获取成功`)

  return bookTypes;
}



module.exports = getAllBooks;
