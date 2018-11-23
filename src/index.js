const fetchBookTypes = require('./components/fetchBookTypes');
const fetchBooks = require('./components/fetchBooks');
const { log, writeJSON } = require('./utils/utils');

(async () => {
  try {
    
    /**
     * bookTypes: {
     *   [type]: [href]
     * }
     */
    log.default('\n==== 开始爬取图书分类 ====')
    const bookTypes = await fetchBookTypes();
    bookTypes.forEach(bookType => log.process(`[${bookType.type}]: ${bookType.href}`))
    log.succuss('==== 爬取图书分类成功 ====')

    log.default('\n==== 开始爬取所有图书信息 ====')
    const allTypeBooks = await fetchBooks(bookTypes);
    log.succuss('==== 爬取所有图书信息成功 ====')

    log.default('\n==== 开始写入图书信息 ====')
    const fileInfo = await writeJSON(allTypeBooks, 'books');
    log.succuss(` => 写入路径为：${fileInfo.dataUrl}`)
    log.succuss(`==== 图书信息写入成功 ==== `);

  } catch (e) {
    log.error(e);
  }
})()



