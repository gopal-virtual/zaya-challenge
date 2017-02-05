var api = require('./api.js').API;
var data = require('./variables.js');
var test_data = data.test;
var meta = data.meta;

function test(){
	return api.processQuiz(test_data.quiz, test_data.pointList, meta.current_date, meta.range, meta.threshold);

}

test();
