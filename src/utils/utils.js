
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const SingleLineLog = require('single-line-log').stdout;
const { rootPath, requestConfig: { userAgents }, proxyFileName } = require('../config');
const ips = require('../../data/proxy.json');
const mkdirp = require('mkdirp');

function removeWhite(text) {
  return text.replace(/\s+/g, "");
}

function removeHTMLTag(text) {
  return text.replace(/<[^>]+>/g, "");
}

function remindOneWhite(text) {
  return text.replace(/[\\s]+/, " ")
}


function filterHTML(html) {
  return remindOneWhite(removeHTMLTag(html)).trim();
}

function filterArray(filters, attr) {
  return function (item) {
    return !filters.includes(item[attr]);
  }
}
function keeperArray(keepers, attr) {
  return function (item) {
    return keepers.includes(item[attr]);
  }
}

const log = {
  default(msg) {
    console.log(
      chalk.white(msg)
    )
  },
  error(e) {
    const stackRegex = /at\s*(.*\s*?)/;
    console.log(
      chalk.redBright(`\n => [${e.code}]: ${e.message} \n => ${e.stack}`)
    )
  },
  succuss(msg) {
    console.log(
      chalk.greenBright(msg)
    )
  },
  process(msg) {
    console.log(
      chalk.blueBright(msg)
    )
  },
  oneLine(msg) {
    SingleLineLog(chalk.blueBright(msg))
  },
  clear() {
    SingleLineLog.clear();
  },
  set(color) {
    return (msg) => {
      console.log(chalk[color](msg))
    }
  }
}


function writeJSON(data, filename, options = {}) {
  return new Promise((resolve, reject) => {
    const dataUrl = path.resolve(rootPath, `./data/${filename}.json`);
    const { dir } = path.parse(dataUrl);
    mkdirp.sync(dir);
    fs.writeFile(dataUrl, JSON.stringify(data), options, function (err) {
      if (err) {
        reject(err)
        return;
      }
      resolve({
        filename,
        dataUrl,
      });
    });
  })
}

function readJSON(filename) {
  return new Promise((resolve, reject) => {
    const dataUrl = path.resolve(rootPath, `./data/${filename}.json`);
    fs.readFile(dataUrl, 'utf-8', (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(JSON.parse(res));
    })
  })
}


function randomUserAgent() {
  return userAgents[parseInt(Math.random() * userAgents.length)];
}

const getProxy = (function loopProxy() {
  const { proxy } = ips;
  let num = 0;
  return () => {
    const order = num >= proxy.length ? num = 0 : num++;
    return proxy[order];
  }
})()











module.exports = {
  removeWhite,
  filterHTML,
  filterArray,
  keeperArray,
  log,
  writeJSON,
  randomUserAgent,
  readJSON,
  getProxy,
}