var api = require('./api.js').API;
var data = require('./variables.js');
var utility = require('./utility.js').utility;
var test_data = data.test;

function test(){
	utility.getMetaFile('./variables.json',function(meta){
		meta = JSON.parse(meta)
		return api.processQuiz(test_data.quiz, test_data.pointList, meta.current_date, meta.range, meta.threshold);
	})
}

test();

