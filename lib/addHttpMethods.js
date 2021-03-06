var http = require('http')

module.exports = function() {
  var base
  http.IncomingMessage.prototype.$json = function $json(cb) {
    var jsonString
    jsonString = ''
    this.on('readable', function() {
      var data
      data = this.read()
      if (data) jsonString += data.toString()
    })
    this.on('end', function() {
      cb(null, JSON.parse(jsonString))
    })
  }
  base = http.ServerResponse.prototype
  base.$send = function(err, json) {
    var output
    this.headers || (this.headers = {})
    if (!this.headers['Content-Type']) {
      this.headers['Content-Type'] = 'application/json'
    }
    if (err) {
      this.writeHead(err.statusCode || 502, this.headers)
      return this.end(JSON.stringify(err))
    }
    if (!json) {
      json = {
        type: 'null'
      }
    }
    if (json.stream) {
      return json.stream.pipe(this)
    } else {
      if (json.data) {
        output = json.data
      } else {
        output = JSON.stringify(json)
      }
      this.headers['Content-Length'] = output.length
      this.writeHead(json.statusCode || 200, this.headers)
      this.write(output)
      return this.end()
    }
  }
}
