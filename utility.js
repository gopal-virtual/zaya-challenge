var fs = require("fs");
var utility = {
    getMetaFile : getMetaFile, // alias to read file
    setMetaFile : setMetaFile, // alias to write to file
    writeFile : setMetaFile,
    getFile : getMetaFile
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
