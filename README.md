mock-server-for-bdd
===================

node.js based server that works as an intercepting proxy with mocking feature

Major features:

1. Configure the server to proxy to any API
1. Execute server simulataniously on multiple ports to work with multiple APIs
1. Any requests with mocked output will return the mock payload
1. Any requests that do not match will be forwarded to the API
1. Any forwarded request will be saved in order to provider a starting point for mocking

#Usage

##Configuration
Configuration is done through config.xml file

```
wikipedia.org:
  url: http://en.wikipedia.org
  port: 2100
  mockListFile: wikipedia_mocks.txt
```

Each API being proxied requires a name, url, port to start the proxy on and the file listing all the payloads being mocked

##Mocked files
Mocked files are stored in directory with the name matching the API. Each file consists of the expected headers plus the payload.
There are two special headers expected by the mocking proxy
```
X-Name: search-for-cplusplus.txt
X-Path: /w/api.php?format=json&action=query&titles=C++&prop=revisions&rvprop=content&continue
```

X-Name: matches the name of the file, also acts as descriptive name
X-Path: needs to match the full GET query

#Running
To start the mock proxy on its own use

node mockserver.js -api [api name]

For example:

node mockserver.js -api wikipedia.org

#Using with BDDs

##Behat

