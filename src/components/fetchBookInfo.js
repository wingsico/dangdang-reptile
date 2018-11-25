
const cheerio = require('cheerio');
const request = require('../utils/request');
const { log, filterHTML, randomUserAgent, removeWhite, getProxy } = require('../utils/utils');

const {
  requestConfig: {
    timeout,
    charset,
    buffer,
  },
} = require('../config');

const useProxy = true;


function fetchBookInfo(task, callback) {
  return new Promise(async (resolve, reject) => {
    const { infoUrl, size, index, ...rest } = task;
  
    log.oneLine(`  => 该分类爬取进度: ${index}/${size}.`)

    let sample_picture_urls = new Set(); // 样品图片
    let author = ""; // 书籍作者
    let publish_house = ""; // 出版社
    let publish_date = ""; // 出版时间
    let content = ""; // 内容
    let author_intro = ""; // 内容

    try {
      const { text: html } = await request.get(infoUrl).proxy(useProxy? getProxy(): undefined).set('User-Agent', randomUserAgent()).timeout(timeout).charset(charset).buffer(buffer).retry(2, 800, [401, 404]);
      
      const $ = cheerio.load(html);
      // 获取样品图片
      $("#main-img-slide #main-img-slider li").filter((i, ele) => {
        return $(ele).has('a');
      }).each((i, ele) => {
        const _this = $(ele);
        const sample_picture_url = _this.find('a').attr('data-imghref');
        sample_picture_urls.add(sample_picture_url);
      })


      author = $(".messbox_info #author > a").text();
      publish_house = $(".messbox_info .t1[dd_name=出版社] > a").text();
      publish_date = filterPublishDate($(".messbox_info .t1").not("[dd_name]").text());

      const { content:_content, author_intro: a_u } = await fetchBookDetial(getBookProdInfo($.html()), infoUrl);
      callback();

      content = _content;
      author_intro = a_u;
      
    } catch (e) {
      // log.error(e)
      callback(e);
    }

    resolve({
      ...rest,
      sample_picture_urls: [...sample_picture_urls],
      author,
      publish_date,
      publish_house,
      content,
      author_intro,
    })
  })
}

async function fetchBookDetial(query, infoUrl) {
  const res = await request.get(infoUrl).query(query).timeout(timeout).proxy(useProxy? getProxy(): undefined).buffer(buffer).set('User-Agent', randomUserAgent()).retry(2, 500, [401, 404]);

  const html = JSON.parse(res.text).data.html;
  const $ = cheerio.load(html, { decodeEntities: false });

  let content = ""; // 内容简介
  let author_intro = "" // 作者简介

  content = removeWhite(filterHTML($("#content .descrip").html()).trim());
  author_intro = removeWhite(filterHTML($("#authorIntroduction .descrip").html()).trim());

  return {
    content,
    author_intro,
  }
}

/**
 * 
 * @param {String} str 
 * @template "出版时间:2018年08月"
 * @returns "2018-08"
 * @summary 由于获取的是初始格式含有多余文字，需要进行过滤
 */
function filterPublishDate(str = "") {
  const dateRegex = /\S*:(\d{4})\S*(\d{2})\S*?/;
  const dateExec = dateRegex.exec(str);
  return `${dateExec[1]}-${dateExec[2]}`;
}


function getBookProdInfo(html) {
  const prodRegex = /prodSpuInfo\s*?=\s*?({.*})/g;
  const prodExec = prodRegex.exec(html);
  const prodInfo = JSON.parse(prodExec[1]);
  return {
    r: 'callback/detail',
    productId: prodInfo.productId,
    templateType: prodInfo.template,
    describeMap: prodInfo.describeMap,
    shopId: prodInfo.shopId,
    categoryPath: prodInfo.categoryPath,
  }
}

module.exports = fetchBookInfo;