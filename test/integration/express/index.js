'use strict'

var http = require('http')
var express = require('express')

var protection = require('../../..')
var test = require('tap').test

function sleep (msec) {
  var start = Date.now()
  while (Date.now() - start < msec) {}
}

test('sends 503 when event loop is overloaded, per maxEventLoopDelay', function (t) {
  var protect = protection('express', {
    maxEventLoopDelay: 1
  })

  var app = express()
  app.use(protect)
  var server = http.createServer(function (req, res) {
    sleep(500)
    app(req, res)
  })

  server.listen(3000, function () {
    var req = http.get('http://localhost:3000')
    req.on('response', function (res) {
      t.is(res.statusCode, 503)
      protect.stop()
      server.close()
      t.end()
    }).end()
  })
})

test('sends 503 when heap used threshold is passed, as per maxHeapUsedBytes', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxHeapUsedBytes: 40
  })

  var app = express()
  app.use(protect)
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('sends 503 when heap used threshold is passed, as per maxRssBytes', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40
  })

  var app = express()
  app.use(protect)
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('sends Client-Retry header as per clientRetrySecs', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    clientRetrySecs: 22
  })

  var app = express()
  app.use(protect)
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        t.is(res.headers['retry-after'], '22')
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('does not set Client-Retry header when clientRetrySecs is 0', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    clientRetrySecs: 0
  })

  var app = express()
  app.use(protect)
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        t.is('retry-after' in res.headers, false)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('errorPropagationMode:false (default)', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: false
  })

  var app = express()
  app.use(protect)
  app.use(function () {
    t.fail()
  })
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('errorPropagationMode:true', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: true
  })

  var app = express()
  app.use(protect)
  app.use(function (err, req, res, next) {
    t.ok(err)
    t.is(err.statusCode, 503)
    res.end('err message')
  })
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('in default mode, production:false leads to high detail client response message', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    production: false,
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: false
  })

  var app = express()
  app.use(protect)
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        res.once('data', function (msg) {
          msg = msg.toString()
          t.is(msg, 'Server experiencing heavy load: (rss)')
          server.close()
          protect.stop()
          process.memoryUsage = memoryUsage
          t.end()
        })
      }).end()
    }, 6)
  })
})

test('in default mode, production:true leads to standard 503 client response message', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    production: true,
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: false
  })

  var app = express()
  app.use(protect)
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        res.once('data', function (msg) {
          msg = msg.toString()
          t.is(msg, 'Service Unavailable')
          server.close()
          protect.stop()
          process.memoryUsage = memoryUsage
          t.end()
        })
      }).end()
    }, 6)
  })
})

test('in errorPropagationMode production:false sets expose:true on error object', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    production: false,
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: true
  })

  var app = express()
  app.use(protect)
  app.use(function (err, req, res, next) {
    t.ok(err)
    t.is(err.expose, true)
    res.end('err message')
  })
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('in errorPropagationMode production:true sets expose:false on error object', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    production: true,
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    errorPropagationMode: true
  })

  var app = express()
  app.use(protect)
  app.use(function (err, req, res, next) {
    t.ok(err)
    t.is(err.expose, false)
    res.end('err message')
  })
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }).end()
    }, 6)
  })
})

test('resumes usual operation once load pressure is reduced under threshold', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40
  })

  var app = express()
  app.use(protect)
  app.get('/', function (req, res) { res.end('content') })
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      var req = http.get('http://localhost:3000')
      req.on('response', function (res) {
        t.is(res.statusCode, 503)
        process.memoryUsage = function () {
          return {
            rss: 10,
            heapTotal: 9999,
            heapUsed: 999,
            external: 99
          }
        }
        setTimeout(function () {
          http.get('http://localhost:3000').on('response', function (res) {
            t.is(res.statusCode, 200)
            server.close()
            protect.stop()
            process.memoryUsage = memoryUsage
            t.end()
          })
        }, 6)
      }).end()
    }, 6)
  })
})

test('if logging option is a string, when overloaded, writes log message using req.log as per level in string', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    logging: 'warn'
  })

  var app = express()
  app.use(function (req, res, next) {
    req.log = {
      warn: function (msg) {
        t.is(msg, 'Server experiencing heavy load: (rss)')
        server.close()
        protect.stop()
        process.memoryUsage = memoryUsage
        t.end()
      }
    }
    next()
  })
  app.use(protect)
  app.get('/', function (req, res) { res.end('content') })
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      http.get('http://localhost:3000').end()
    }, 6)
  })
})

test('if logging option is a function, when overloaded calls the function with heavy load message', function (t) {
  var memoryUsage = process.memoryUsage
  process.memoryUsage = function () {
    return {
      rss: 99999,
      heapTotal: 9999,
      heapUsed: 999,
      external: 99
    }
  }
  var protect = protection('express', {
    sampleInterval: 5,
    maxEventLoopDelay: 0,
    maxRssBytes: 40,
    logging: function (msg) {
      t.is(msg, 'Server experiencing heavy load: (rss)')
      server.close()
      protect.stop()
      process.memoryUsage = memoryUsage
      t.end()
    }
  })

  var app = express()
  app.use(protect)
  app.get('/', function (req, res) { res.end('content') })
  var server = http.createServer(app)

  server.listen(3000, function () {
    setTimeout(function () {
      http.get('http://localhost:3000').end()
    }, 6)
  })
})
