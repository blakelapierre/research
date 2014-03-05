var page = require('webpage').create();


page.onError = function(msg, trace) {

  var msgStack = ['ERROR: ' + msg];

  if (trace && trace.length) {
    msgStack.push('TRACE:');
    trace.forEach(function(t) {
      msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
    });
  }

  console.error(msgStack.join('\n'));

};

page.onResourceRequested = function(requestData, networkRequest) {
  //console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
};

page.onResourceError = function(resourceError) {
  console.log('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
  console.log('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
};

page.onConsoleMessage = function(msg) { console.log(msg); };

page.open('http://localhost:3007/readPDFJob.html', function(status) {
	console.log(status);
	//phantom.exit();
});