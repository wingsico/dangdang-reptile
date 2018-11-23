const cheerio = require('cheerio');
const charset = require('superagent-charset');
const superagent = require('superagent');
const request = charset(superagent);
const path = require('path');
const config = require('./config');
const fs = require('fs');

const { reptileUrl } = config;

/**
 * 爬取热门书籍32本
 * 写入 data/books.json
 */
request
  .get(reptileUrl)
  .charset('gb2312')
  .end((err, res) => {
    if (err) {
      return console.error(`${reptileUrl} get failed.`);
    }


    let $ = cheerio.load(res.text);

    let data = [];
    $('.book_online .list_aa li[type=rollitem]').each((i, ele) => {
      let bookFrame = $(ele);

      bookFrame.find('.product_ul li').each((i, ele) => {
        let book = $(ele);
        data.push({
          href: book.find('a.img').attr('href'),
          cover: book.find('a.img img').attr('src'),
          title: book.find('p.name a').text(),
          author: book.find('p.author').text(),
          price: book.find('.price .rob .num').text() + book.find('.price .rob .tail').text()
        })
      })
    })

    fs.writeFile(path.resolve(__dirname, '../data/hot_books.json'), JSON.stringify({
      length: data.length,
      data: data,
    }), function (err) {
      if (err) throw err;
      console.log('写入完成');
    });
  })


