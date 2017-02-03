fs              = require 'fs'
url             = require 'url'
path            = require 'path'
http            = require 'http'
assert          = require 'assert'
coffee          = require 'coffee-script'
socketIo        = require 'socket.io'

{loggerConf, info, note, log, warn} = require './logger'
addHttpMethods = require './addHttpMethods'
addHttpMethods()
apiCommand = require './apiCommand'

Api = require './Api'

class Server
  constructor: (@conf) ->
    assert @conf.url,  "Need conf.url"
    assert @conf.mimeTypes, "Need mime types"

    loggerConf @conf

    {@url, @mimeTypes, @mimeAdd} = @conf
    {@hostname, @port} = url.parse @url

    @port or= '80'
    @port = parseInt @port, 10

    headers =
      'Cache-Control': 'private, max-age=0, must-revalidate'

    @httpServer = http.createServer (req, res) =>
      res.headers = headers
      # Control API
      if Api.match req.url
        return Api.handle req, res

      # Serve files
      fileName = req.url.replace /\?.*/, ''
      if fileName[fileName.length - 1] == '/'
        fileName += 'index.html'
      log "#{req.method} #{fileName}"

      filePath = "#{@conf.root}/#{fileName.slice 1}"
      suffix = /(\w*)$/.exec(fileName)[1]
      fs.readFile filePath, (err, data) =>
        if err
          warn err + ''
          res.headers['Content-Type'] = 'text/plain'
          res.writeHead 400, res.headers
          return res.end err.toString()
        if /html?$/i.test(suffix) and @injector
          data = @injector data
        res.headers['Content-Type'] = @conf.mimeTypes[suffix] || 'text/plain'
        res.writeHead 200, res.headers
        res.end data

    @wsServer = socketIo.listen @httpServer, {
      log: true
      'log level': 1
      transports: ['websocket', 'xhr-polling', 'htmlfile']
    }

    @wsServer.on 'connection', (socket) ->
      log "Connection accepted"

  start: (next) ->
    maxTries = 20
    listen = =>
      @httpServer.listen @port, @hostname, (err) =>
        if err
          return next err

    @httpServer.on 'listening', =>
      msgListen = "Listening to #{@url}"
      if maxTries < 20
        urlObj = url.parse @url
        url2 = "#{urlObj.protocol}//#{urlObj.hostname}:#{@port}"
        msgListen = "Listening to #{url2} (changed from #{@url})"
        @url = url2

      if @conf.inject
        scripts = ([ \
          "../node_modules/socket.io/node_modules/socket.io-client/dist/" +
          "socket.io.min.js",
          "../node_modules/socket.io-client/dist/socket.io.min.js"
        ].map (js) -> path.normalize "#{__dirname}/#{js}")
          .filter (fullPath) -> return fs.existsSync fullPath
        if scripts.length == 0
          return (next or ->) "No socket.io client"
        @injector = @makeCoffeeInjector [scripts[0],
          path.normalize "#{__dirname}/../lib/script.coffee"]
      note msgListen
      (next or ->) 0

    @httpServer.removeAllListeners 'error'
    @httpServer.on 'error', (err) =>
      error = err.toString()
      if error
        if /EADDRINUSE/.test error
          warn error
          @port += 1
          maxTries -= 1
          if maxTries > 0
            return listen()
        return next error

    listen()

  stop: (next) ->
    @httpServer.close =>
      @httpServer = null

  send: (data) ->
    info "Sending #{data} to client(s)"
    @wsServer.sockets.emit 'msg', data

  makeCoffeeInjector: (filesToInject) ->
    js = ''
    for fileToInject in filesToInject
      # info "Reading #{fileToInject}"
      cs = fs.readFileSync(fileToInject).toString().replace '<<URL>>', @url
      if /\.coffee$/.test fileToInject
        cs = coffee.compile cs, bare: true
      js += """<script>\n#{cs}\n</script>\n"""
    return (data) ->
      lines = data.toString().split /\r\n|\n/g
      lastBody = -1
      for line, i in lines
        if /<\/body>/i.test line
          lastBody= i
      if lastBody > -1
        lines[lastBody] = lines[lastBody].replace /<\/body>/i, "#{js}</body>"
      return lines.join '\n'

module.exports = Server
