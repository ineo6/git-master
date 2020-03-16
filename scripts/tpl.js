const path = require('path');
const fs = require('fs');
const html2js = require('html2js');

const templatePath = path.resolve(path.join(__dirname, '../src/common/template/'));
const template = path.resolve(path.join(templatePath, 'template.html'));
const target = path.resolve(path.join(templatePath, 'template.js'));

const source = fs.readFileSync(template, 'utf8');

const output = html2js(source, {
  mode: 'default',
  wrap: 'commonjs',
});

fs.writeFile(target, output, (err) => {
  if (err) {
    console.log('生成模板失败');
  } else {
    console.log('生成模板成功');
  }
});
