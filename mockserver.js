/**
 * Mock server.
 * Handles requests on port 2100. Will use mock file if it finds one in the mocklist file. If not, will forward to the real api.
 * Will check mock files for "X-Path:" header and create a mapping from that path to the mock file.
 *
 * Starting mockserver will default port 2100
 * mockfiles should be stored in correct directory (corresponding to the name of the api in the configuration file)
 *
 * Usage:
 * node mockserver.js
 *
 * -p <port>        specifies port          (default is 2100)
 * -l <filename>    specifies mocklist file (default is wikipedia_mocks.txt)
 * -nl              no mocklist file
 * -api [api name from the config.yml] specifies api           (default is wikipedia)
 *
 *
 * Created by Lawrence Bautista on 2014-10-09
 */

var http = require('http'),
    fileSystem = require('fs'),
    path = require('path'),
    URL = require('url'),
    yaml = require('js-yaml');


const HEADER_PATH = "X-Path: ";
const VERIFIED_FILE = "verified_mocklist.txt";

var mockListFile = "wikipedia_mocks.txt";
var port = 2100;
var mocks = {}; // maps urls to files.
var api = "http://en.wikipedia.org";
var apiName = "wikipedia.org";

var i = 0;
// Process the flags
while (i < process.argv.length) {
    if (process.argv[i] == "-p") {
        port = process.argv[++i];
    } else if (process.argv[i] == "-l") {
        mockListFile = process.argv[++i];
    } else if (process.argv[i] == "-nl") {
        mockListFile = null;
    } else if (process.argv[i] == "-api") {
	i++;
	apiName = process.argv[i];

        try {

            var config = yaml.safeLoad(fileSystem.readFileSync(__dirname + "/config.yml", 'utf8'));
            apiConfig = config[apiName];
        } catch (e) {
            console.log('Error reading configuration file');
            //exit process
        }

        if (apiConfig) {
            api = apiConfig['url'];
            port = apiConfig['port'];
            mockListFile = apiConfig['mockListFile'];
        } else {
            console.log('Configuration not found')
        }
    }
    i++;
}



// get mocks from mocklist file
if (mockListFile) {
    var mockListString = fileSystem.readFileSync(__dirname + "/" + mockListFile, {encoding: 'utf8'});
    var mockList = mockListString.split('\n');

    mockList.forEach(function (mockFile) {
        if (mockFile == '') {
            return;
        }
        // Add the file to our mocks map - Async because that's the cool way to do it.
        // Inefficient because reads entire file, but only grabs X-Path header. Unfortunately reading
        // only a few lines from a file in node.js is not that trivial (require('readLine') is currently unstable)
        fileSystem.readFile(__dirname + "/" + mockFile, {encoding: 'utf-8'}, function (err, mock) {
            if (err) {
                throw err;
            }
            // find the X-Path
            var pathStart = mock.indexOf(HEADER_PATH) + HEADER_PATH.length;
            var pathEnd = findPositiveMinimum(mock.indexOf('\n', pathStart), mock.indexOf('\r', pathStart));
            var path = mock.substring(pathStart, pathEnd);

            mocks[path] = mockFile;
        });
    });

    // Clear the verified mocklist file
    fileSystem.writeFile(VERIFIED_FILE, "");
}

http.createServer(function(request, response) {
    console.log(request.method + " " + request.url);
    if (mocks[request.url]) {
        var mock = mocks[request.url];
        console.log("Found mock file!");
        var filePath = path.join(__dirname, mock);

        var readStream = fileSystem.createReadStream(filePath);
        // read the file into a buffer
        var fileChunks = [];
        var chunksLength = 0;
        readStream.on('data', function (chunk) {
            fileChunks.push(chunk);
            chunksLength += chunk.length;
        });
        readStream.on('end', function() {
            var responseData = Buffer.concat(fileChunks, chunksLength);
            var fileString = responseData.toString();

           // parse the headers.
           // Find header division: (either \n\r\n\r, \n\n, or \r\n\r\n)
            var headerEnd = findPositiveMinimum(fileString.indexOf("\n\n"), fileString.indexOf("\r\n\r\n"), fileString.indexOf("\n\r\n\r"));
            var bodyStart = headerEnd + 2;
            var allHeaders = fileString.substring(0, headerEnd);
            var headersArray = allHeaders.split('\n');
            var headerObj = {};
            var responseCode = 0;
            var isFirst = true;
            headersArray.forEach(function(header)  {
                // Get the response code from first line
                if (isFirst) {
                    var firstLine = header.split(" ");
                    responseCode = firstLine[1];
                    isFirst = false;
                    return; // continue
                }

                var tokens = header.split(": ");
                headerObj[tokens[0]] = tokens[1];
            });

            // write the headers
            response.writeHead(responseCode, headerObj);

            // write the body
            // get the position of the body start in the byte buffer
            var beforeBody = fileString.substring(0,bodyStart);
            var bodyStartIndexInBuffer = Buffer.byteLength(beforeBody);
            response.write(responseData.slice(bodyStartIndexInBuffer));
            response.end();
        });

        // Also mark the mock file as verified
        fileSystem.appendFile(VERIFIED_FILE, mock + "\n", function (err) {
            if (err) throw err;
        });

    }
    else {
        // Forward the api call to DCR
        console.log(api + request.url);
        var options = URL.parse(api + request.url);
        options['method'] = request.method;

        //keep all the headers from the original request
        options['headers'] =  request.headers;

        //set proper host, otherwise we are sending the host of the mock server
        options['headers']['host']=options['host'];

        //clear accept-encoding, if set to compress will come back unreadable
        //there is probably a better solution for this
        options['headers']['accept-encoding']='';

        var forwardReq = http.request(options, function(apiResponseStream) {

            var parts = [];
            var partLength = 0;
            apiResponseStream.on('data',function(buffer){
                parts.push(buffer);
                partLength += buffer.length;
            });

            apiResponseStream.on('end',function(){
                var apiResponsePayload = Buffer.concat(parts, partLength);
                response.writeHead(apiResponseStream.statusCode, apiResponseStream.headers);
                response.write(apiResponsePayload);
                response.end();


                // Also generate a mockfile
                fileSystem.mkdir('generated', undefined, function(err) {
                    if (err) {
                        if (err.code != 'EEXIST')
                            console.log(err);
                    }
                    // successfully created folder
                    var mockfile = fileSystem.createWriteStream("generated"+processUrl(request.url));
                    var headers = "HTTP/1.1 "+ apiResponseStream.statusCode + " " + getStatusText(apiResponseStream.statusCode) + "\n";
                    for (var key in apiResponseStream.headers) {
                        if (key != 'content-length') {
                            var obj = apiResponseStream.headers[key] + "\n";
                            headers += key + ": " + obj;
                        }
                    }
                    headers = headers + "X-Name: " + processUrl(request.url) +"\n";
                    headers = headers + "X-Path: " + request.url +"\n\n";

                    mockfile.write(headers);
                    mockfile.write(apiResponsePayload);
                    console.log("Generated mockfile");
                });
            });

        });
        forwardReq.on('error', function(e) {
            console.log("Error: can't forward request: " + e.message);
        });
        request.pipe(forwardReq);
    }
})
.listen(port);
console.log("Started mock server on port " + port);

function getStatusText(statusCode) {
    switch (statusCode) {
        case 200: return "OK";
        case 201: return "Created";
        case 302: return "Found";
        case 303: return "See Other";
        case 304: return "Not Modified";
        case 400: return "Bad Request";
        case 401: return "Unauthorized";
        case 403: return "Forbidden";
        case 404: return "Not Found";
        case 500: return "Internal Server Error";
        default: return "Unknown";
    }
}

function findPositiveMinimum() {
    var positives = [];
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] >= 0) {
            positives.push(arguments[i]);
        }
    }
    return Math.min.apply(Math, positives);
}

function processUrl(url) {
    var sub = url.substring(1);
    sub = sub.replace(/\//g, "-");
    sub = sub.replace(/\?/g, "-");
    //if the request is too long cut it
    sub = sub.substring(0, 254);
    return "/" + sub;

}
