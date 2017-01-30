var express = require('express');
var app = express();
app.get('/', home);

app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(__dirname + '/bower_components'));
app.use(express.static(__dirname + '/templates'));
app.use(express.static(__dirname + '/script'));
app.use(express.static(__dirname + '/assets'));
app.use(express.static(__dirname + '/font'));
app.use(express.static(__dirname + '/css'));

var server = app.listen(8062, 'localhost', function() {

    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)

})

function home(req, res) {
    res.sendFile(__dirname + "/index.html");
}
