const request = require('superagent');
const cheerio = require('cheerio');
const { writeJSON, log, randomUserAgent, getProxy } = require('./utils');
const { proxyFileName } = require('../config');
const Sleep = require('sleep');
const Async = require('async');

require('superagent-proxy')(request);

const proxy_url = 'https://www.kuaidaili.com/free/inha/';

(async () => {
  const ips = {
    proxy: [],
  };
  log.default('==== 开始爬取代理ip池 ====')
  const maxCount = 100;
  let errTimes = 0;
  const pages = Array.from(new Array(maxCount), (_, index) => index + 1);
  const queue = Async.queue((_task, _cb) => {
    (async (page, p_cb) => {
      Sleep.msleep(900);
      try {
        const res = await request.get(proxy_url + page).set({
          'user-agent': randomUserAgent(),
        });
        
        const $ = cheerio.load(res.text);

        const proxys = $('#list tr').slice(1).map((index, element) => {
          const td = $(element).children('td');
          return `${td[3].children[0].data.toLowerCase()}://${td[0].children[0].data}:${td[1].children[0].data}`
        }).get();
        const ip_queue = Async.queue((task, callback) => {
          (async (proxy, cb) => {
            try {
              // 代理IP请求，设置超时为2000ms，返回正确即当可用
              const testip = await request.get('http://ip.cip.cc').proxy(proxy).timeout(3000).retry(3);
              // 存入数据库
              ips.proxy.push(proxy);
              log.succuss(' => Successfully Get One: ' + proxy)

              cb()
            } catch (error) {
              cb(error)
            }
          })(task, callback)
        }, 20)

        ip_queue.push(proxys)


        ip_queue.drain = () => {
          p_cb();
        }
      } catch (e) {
        log.set('red')(`503：${++errTimes}`)
        p_cb(e)
      }


    })(_task, _cb)
  }, 5)

  queue.push(pages)

  queue.drain = async () => {
    log.succuss(`==== 代理ip池爬取完成(${ips.proxy.length}) ====`);
    const { dataUrl } = await writeJSON(ips, '_' + proxyFileName);
    log.succuss(` => ip池文件路径 ${dataUrl}`);
  }

})();
