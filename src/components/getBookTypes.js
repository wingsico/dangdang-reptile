const cheerio = require('cheerio');
const request = require('../utils/request');
const { filterArray, keeperArray, log, writeJSON, readJSON } = require('../utils/utils')
const {
  baseUrl,
  typesPath,
  requestConfig: {
    timeout,
    charset,
    buffer,
  },
  bookTypesFileName,
  tempDir
} = require('../config');

const typesUrl = `${baseUrl}/${typesPath}`;

const filters = ['当当出版', '童书', '电子书', '中小学教辅']



async function fetchBookTypes() {
  const { text } = await request.get(typesUrl).charset(charset).timeout(timeout).buffer(buffer);

  const $ = cheerio.load(text);

  const typeDOMs = $("#bd .silide_ban div a");

  /**
   * slice(0, -3) 去除最后的电子书分类，中小学辅导和当当分类（url不一致）
   */
  const typesFilter = filterArray(filters, 'type');
  const bookTypes = typeDOMs.map(function (index) {
    return {
      type: $(this).text(),
      index,
    };
  }).get().filter(typesFilter);

  const hrefsKeeper = keeperArray(bookTypes.map(type => type.index), 'index');
  const bookTypeHrefs = $('.fenlei_ban').not('[id]').map(function (index) {
    return {
      href: $(this).find('a').attr('href'),
      index,
    }
  }).get().filter(hrefsKeeper);

  return bookTypes.map(({type, index}) => {
    return {
      type,
      href: bookTypeHrefs.filter(({index: i}) => i === index)[0].href,
    }
  })
}

async function getBookTypes(updateForce = false) {
  let bookTypes = [];
  try {
    if (updateForce) {
      throw new Error("强制重新爬取");
    }
    bookTypes = await readJSON(bookTypesFileName);
  } catch (e) {
    log.set('yellowBright')(`==== 暂未存储 ${bookTypesFileName}.json 或存储有误 ====`);
    log.default('==== 开始爬取图书分类 ====')
    bookTypes = await fetchBookTypes();
    log.succuss('==== 爬取图书分类成功 ====')
    log.default('==== 开始写入图书分类 ====')
    const fileInfo = await writeJSON(bookTypes, `${tempDir}/${bookTypesFileName}`);
    log.process(` => 写入路径为：${fileInfo.dataUrl}`)
    log.succuss(`==== 图书信息写入成功 ==== `);
  }
  return bookTypes;
}

module.exports = getBookTypes;
