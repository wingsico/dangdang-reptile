const cheerio = require('cheerio');
const charset = require('superagent-charset');
const superagent = require('superagent');
const request = charset(superagent);
const path = require('path');
const config = require('./config');
const fs = require('fs');

const { removeWhite, filterHTML } = require('./utils/utils');


const { reptileUrl } = config;

const _path = '20181116_qsoj';


/**
 * 
 */

request
  .get(`${reptileUrl}${_path}`)
  .charset('gb2312')
  .timeout({
    response: 5000,  // Wait 5 seconds for the server to start sending,
    deadline: 60000, // but allow 1 minute for the file to finish loading.
  })
  .buffer(true)
  .end((err, res) => {
    if (err) {
      return console.error(`${reptileUrl} get failed.`);
    }

    let $ = cheerio.load(res.text);
    let books = [];
    let id = 1;

    $("#bd .silide_ban div a").each((i, ele) => {
      const _this = $(ele);
      const book_type = removeWhite(_this.text());

      $(`#bd div[name=${book_type}] .body .list_aa li`).each((i, ele) => {
        const item = $(ele);
        const book = {
          title: item.find("a.img").attr("title"),
          href: item.find("a.img").attr("href"),
          cover: item.find("a.img img").attr("data-original"),
          price: item.find(".price .rob .num").text() + item.find(".price .rob .tail").text(),
          e_price: item.find(".ebookprice_n .num").text() + item.find(".ebookprice_n .tail").text(),
          type: book_type,
          id: id++,
        }

        books.push(book);
      })
    })

    console.log('分类爬取完毕，准备进行下一步: 爬取书本详细信息');

    getBooksDetial(books);
  })

function getBooksDetial(books) {
  const bookPromises = books.map(book => getBookDetial(book));

  Promise.all(bookPromises).then((books) => {
    console.log('爬取书本详细信息完成，准备写入文件');
    writeJSON(books);
  })
}

function getBookDetial(book) {
  return new Promise((resolve, reject) => {
    const { href, id } = book;
    request
      .get(href)
      .charset('gb2312')
      .timeout({
        response: 5000,  // Wait 5 seconds for the server to start sending,
        deadline: 60000, // but allow 1 minute for the file to finish loading.
      })
      .buffer(true)
      .end(async (err, res) => {
        if (err) {
          reject(`book-${id} get failed.`);
          return;
        }

        let $ = cheerio.load(res.text);

        // 获取样本图片
        const sample_picture_urls = [];
        $("#main-img-slide #main-img-slider li").each((i, ele) => {
          const _this = $(ele);
          const sample_picture_url = _this.find('a').attr('data-imghref');
          sample_picture_urls.push(sample_picture_url);
        })


        // 获取评价
        const evaluate = $(".name_info .head_title_name").attr("title");

        let html = $.html();
        let regex = /prodSpuInfo\s*?=\s*?({.*})/g;
        let prodInfo = {};

        if (regex.test(html)) {
          try {
            // console.log(RegExp.$1.toString());
            prodInfo = JSON.parse(RegExp.$1);
          } catch (e) {
            throw e;
          }

          const query = {
            r: 'callback/detail',
            productId: prodInfo.productId,
            templateType: prodInfo.template,
            describeMap: prodInfo.describeMap,
            shopId: prodInfo.shopId,
            categoryPath: prodInfo.categoryPath,
          }


          try {
            const res = await request.get('http://product.dangdang.com/index.php').query(query).timeout({
              response: 5000,  // Wait 5 seconds for the server to start sending,
              deadline: 60000, // but allow 1 minute for the file to finish loading.
            })
            const html = JSON.parse(res.text).data.html;
            let $detial = cheerio.load(html);
            const content_brief = $detial("#content .descrip") && filterHTML($detial("#content .descrip").text());
            const author_brief = $detial("#authorIntroduction .descrip") && filterHTML($detial("#authorIntroduction .descrip").text());
            const extract = $detial("#extract .descrip") && filterHTML($detial("#extract .descrip").text());
            const praise_rate = $detial(".nei #comment_percent.num") && $detial(".nei #comment_percent.num").text();

            resolve({
              ...book,
              evaluate,
              content_brief,
              sample_picture_urls,
              author_brief,
              extract,
              praise_rate
            })
          } catch (e) {
            reject(`${href} 获取detials 失败: ${e}`);
          }

        } else {
          resolve({
            ...book,
            evaluate,
            sample_picture_urls,
          })
        }
      })
  }).catch(err => {
    console.log(err)
  })

}

function writeJSON(books) {
  fs.writeFile(path.resolve(__dirname, '../data/books.json'), JSON.stringify({
    length: books.length,
    data: books,
  }), function (err) {
    if (err) throw err;
    console.log('写入完成');
  });
}