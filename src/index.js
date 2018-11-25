const getBookTypes = require('./components/getBookTypes');
const getAllBooks = require('./components/getAllBooks');
const getAllBooksInfo = require('./components/getAllBooksInfo');
const { log, writeJSON } = require('./utils/utils');
const { resultFileName } = require('./config');

const Book = [
  "title",
  "coverUrl",
  "price",
  "publish_date",
  "publish_house",
  "content",
  "author",
  "author_intro",
  "sample_picture_urls",
];

(async () => {
  try {

    /**
     * bookTypes: {
     *   [type]: [href]
     * }
     */
    log.default('==== 开始获取图书分类 ====')
    const bookTypes = await getBookTypes();
    log.succuss('==== 获取图书分类成功 ====')

    log.default('\n==== 开始获取所有图书信息 ====')
    const allTypeBooks = await getAllBooks(bookTypes);
    log.succuss('==== 获取所有图书信息成功 ====')


    log.default('\n==== 开始获取所有图书详细信息 ====')
    const allBooksInfo = await getAllBooksInfo(allTypeBooks);
    log.succuss('==== 获取所有图书详细信息成功 ====')

    log.default('\n==== 开始过滤出错数据 ====')
    const result = filterErrorBookInfo(allBooksInfo);
    log.succuss(`==== 出错数据过滤完成 (${result.length} 条有效数据) ====`)

    log.default('\n==== 开始写入结果 ====')
    const { dataUrl } = await writeJSON(result, resultFileName);
    log.succuss(`==== 写入结果完成完成，路径为: ${dataUrl} ====`)

  } catch (e) {
    log.error(e);
  }
})()

function filterErrorBookInfo(allBooksInfo = [{}]) {
  const data = allBooksInfo.map(({ type, data = [] }, index) => {
    return {
      type,
      data: data.filter(filterBook).map(book => ({...book, type: index + 1})),
    }
  })
  const length = data.reduce((acc, cur) => acc + cur.data.length, 0);
  return  {
    data,
    length,
  }
}

function filterBook(book) {
  return !hasAttrIsEmpty(book) && hasAllBookAttrs(book) && !isFutureBook(book);
}

function hasAttrIsEmpty(object) {
  return Object.keys(object).filter(key => !object[key]).length > 0;
}

function hasAllBookAttrs(book) {
  return Object.keys(book).length === Book.length;
}

function isFutureBook(book) {
  return Date.now() < new Date(book.publish_date)
}
