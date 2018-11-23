
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const SingleLineLog = require('single-line-log').stdout;
const { rootPath } = require('../config');

function removeWhite(text) {
  return text.replace(/\n/g, "").replace(/\s/g, "");
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
      chalk.redBright(` => [${e.code}]: ${e.message} ${stackRegex.exec(e.stack)[0]}`)
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
  }
}


function writeJSON(data, filename) {
  return new Promise((resolve, reject) => {
    const dataUrl = path.resolve(rootPath, `./data/${filename}.json`);
    fs.writeFile((dataUrl), JSON.stringify(data), function (err) {
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







module.exports = {
  removeWhite,
  filterHTML,
  filterArray,
  keeperArray,
  log,
  writeJSON,
}