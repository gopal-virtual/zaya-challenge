var fs = require("fs");
var utility = {
    getMetaFile : getMetaFile,
    setMetaFile : setMetaFile
}
function setMetaFile(file, content, callback) {
    fs.writeFile(file, content, 'utf8', function(err) {
        callback && callback(err)
    })
}
function getMetaFile(file, callback) {
    fs.readFile(file, 'utf8', function(err, data) {
        callback && callback(data)
    });
}

exports.utility = utility
