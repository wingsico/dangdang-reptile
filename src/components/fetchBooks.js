const cheerio = require('cheerio');
const request = require('../utils/request');
const Async = require('async');
const { log } = require('../utils/utils');

const {
  requestConfig: {
    timeout,
    charset,
    buffer,
  },
} = require('../config');

function fetchBooks(bookTypes) {
  return new Promise((resolve, reject) => {
    const allTypeBooks = [];
    const newBookTypes = bookTypes.map(type => ({
      ...type,
      allTypeBooks,
    }))

    const queue = Async.queue((task, callback) => {
      fetchBooksByType(task, callback)
    }, 20);

    queue.push(newBookTypes)
    
    queue.drain = () => {
      resolve(allTypeBooks)
    }
  })
}


async function fetchBooksByType(task, callback) {
  const { type, href, allTypeBooks } = task;

  log.process(` => 开始爬取 ${type}类`)
  let currentPage = 1;
  const books = {
    type,
    data: [],
  }
  const { text } = await request.get(href).timeout(timeout).charset(charset).buffer(buffer);
  const totalPage = parseInt(cheerio.load(text)('.paginating .next').prev().find('a').text().trim());


  const queue = Async.queue((task, callback) => {
    fetchBooksByPage(task, callback);
  }, 10);

  const pageTasks = Array.from(new Array(totalPage - 1), () => ({
    href,
    page: ++currentPage,
    books,
  }));

  queue.push(pageTasks)

  queue.drain = () => {
    log.succuss(` <= ${type}类 爬取成功`) 
    allTypeBooks.push(books);
    callback();
  }
}

async function fetchBooksByPage(task, callback) {
  // log.default(`开始爬取图书: ${type} 类 第 ${page} 页`)
  const { href, page, books = {} } = task;
  const pageHref = page === 1 ? href : `${href}&page_index=${page}`
  try {
    const { text: html } = await request.get(pageHref).timeout(timeout).charset(charset).buffer(buffer);

    const $ = cheerio.load(html);

    $("#bd_auto .list_aa li").each((index, element) => {
      const $this = $(element);
      const title = $this.find('.name a').text().trim();
      const coverUrl = $this.find('a.img img').attr('data-original');
      const detialUrl = $this.find('a.img').attr('href');
      const price = $this.find('.button > span').text().slice(1); // 去除 ￥ 符号

      books.data.push({
        title,
        coverUrl,
        detialUrl,
        price,
      })
    })

  } catch (e) {
    log.error(e);
    callback(e);
    return;
  }
  callback(undefined);
}


module.exports = fetchBooks;
