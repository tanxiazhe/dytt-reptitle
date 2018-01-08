var cheerio = require('cheerio');
var http = require('http');
var iconv = require('iconv-lite');

const url = 'http://www.ygdy8.net/html/gndy/dyzz/index.html';
var items = [];
var index = 1;
var urls = [];
var btLink = [];

var mongo_url = 'mongodb://localhost:27017/catchPic';

function getItems(url, i) {
    http.get(url, function (sres) {
        var chunks = [];
        sres.on('data', function (chunk) {
            chunks.push(chunk);
        });
        // chunks里面存储着网页的 html 内容，将它zhuan ma传给 cheerio.load 之后
        // 就可以得到一个实现了 jQuery 接口的变量，将它命名为 `$`
        // 剩下就都是 jQuery 的内容了
        sres.on('end', function () {

            //由于咱们发现此网页的编码格式为gb2312，所以需要对其进行转码，否则乱码
            //依据：“<meta http-equiv="Content-Type" content="text/html; charset=gb2312">”
            var html = iconv.decode(Buffer.concat(chunks), 'gb2312');
            var $ = cheerio.load(html, {
                decodeEntities: false
            });
            $('.co_content8 .ulink').each(function (idx, element) {
                var $element = $(element);
                var url = $element.attr('href')
                items.push({
                    title: $element.text(),
                    url: url
                })
                urls.push({
                    url: url
                })
            })
            if (i < 2) { //为了方便只爬了两页
                getItems(url, ++index); //递归执行，页数+1
            } else {
                console.log("items获取完毕！");
                write_to_file_in_JSON(items, './', 'urls')
                getBtLink(urls, 0)
            }

        });
    });
}

function getBtLink(urls, n) { //urls里面包含着所有详情页的地址
    console.log("正在获取第" + n + "个url的内容" + urls[n].url);
    http.get('http://www.ygdy8.net' + urls[n].url, function (sres) {
        var chunks = [];
        sres.on('data', function (chunk) {
            chunks.push(chunk);
        });
        sres.on('end', function () {
            var html = iconv.decode(Buffer.concat(chunks), 'gb2312'); //进行转码
            var $ = cheerio.load(html, {
                decodeEntities: false
            });
            $('#Zoom td').children('a').each(function (idx, element) {
                var $element = $(element);
                btLink.push({
                    bt: $element.attr('href')
                })
            })
            if (n < urls.length - 1) {
                getBtLink(urls, ++n); //递归
            } else {
                console.log("btlink获取完毕！");
                write_to_file_in_JSON(btLink, './', 'bturls')
                save(btLink);
            }
        });
    });
}



function write_to_file_in_JSON(items, dir, filename) {
    var fs = require('fs');
    var dirname = dir + filename + '.json';
    var path = require('path');
    console.log('准备写入文件' + dirname);
    fs.writeFile(dirname, JSON.stringify(items));
    console.log(dirname + '写入' + items.length + '条记录');
}

function save(btLink) {
    var MongoClient = require('mongodb').MongoClient; //导入依赖
    MongoClient.connect(mongo_url, function (err, db) {
        if (err) {
            console.error(err);
            return;
        } else {
            console.log("成功连接数据库");
            const myAwesomeDB = db.db('catchPic')
            var collection = myAwesomeDB.collection('nodeReptitle');
            collection.insertMany(btLink, function (err, result) { //插入数据
                if (err) {
                    console.error(err);
                } else {
                    console.log("保存数据成功");
                }
            })
            db.close();
        }
    });
}

function del() {
    var MongoClient = require('mongodb').MongoClient; //导入依赖
    MongoClient.connect(mongo_url, function (err, db) {
        if (err) {
            console.error(err);
            return;
        } else {
            console.log("成功连接数据库");
            const myAwesomeDB = db.db('catchPic')
            myAwesomeDB.dropCollection('nodeReptitle', function (err, result) { //删除数据
                if (err) {
                    console.error(err);
                } else {
                    console.log(result);
                }
            })
            db.close();
        }
    });

}

function testConnection() {
    var fs = require('fs'); // 引入fs模块

    // 异步读取
    fs.readFile('bturls.json', function (err, data) {
        // 读取文件失败/错误
        if (err) {
            throw err;
        }
        // 读取文件成功        
        save(JSON.parse(data.toString()));
    });
}

function main() {
    console.log("开始爬取");
    //del();
    //testConnection();
    getItems(url, index);
}

main(); //运行主函数