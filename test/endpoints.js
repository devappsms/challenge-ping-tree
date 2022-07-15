process.env.NODE_ENV = 'test'
var fs = require('fs')
var test = require('ava')
var servertest = require('servertest')
var path = require('path')
const { BufferListStream } = require('bl')

var server = require('../lib/server')

const content = {
  geoState: 'ca',
  publisher: 'abc',
  timestamp: new Date().toUTCString().replace(new Date(new Date().toUTCString()).getUTCHours(), 13)
}

const contentNegative = {
  geoState: 'ca',
  publisher: 'abc',
  timestamp: new Date().toUTCString().replace(new Date(new Date().toUTCString()).getUTCHours(), 23)
}

const contentNotPresent = {
  geoState: 'nh',
  publisher: 'abc',
  timestamp: new Date().toUTCString().replace(new Date(new Date().toUTCString()).getUTCHours(), 23)
}

try {
  fs.writeFileSync(path.resolve(__dirname, 'route_data.json'), JSON.stringify(content))
  // file written successfully
} catch (err) {
  console.error(err)
}

try {
  fs.writeFileSync(path.resolve(__dirname, 'negative_route_data.json'), JSON.stringify(contentNegative))
  // file written successfully
} catch (err) {
  console.error(err)
}

try {
  fs.writeFileSync(path.resolve(__dirname, 'not_present_route_data.json'), JSON.stringify(contentNotPresent))
  // file written successfully
} catch (err) {
  console.error(err)
}

test.serial.cb('healthcheck', function (t) {
  var url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    console.log('error ', err)
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('Create Target', function (t) {
  var url = '/api/targets'
  var serverStream = servertest(server(), url, { method: 'POST' })

  fs.createReadStream(path.resolve(__dirname, 'target_data.json'), 'UTF-8').pipe(serverStream)

  serverStream.pipe(BufferListStream(function (err, data) {
    t.falsy(err, 'no error')
    const res = JSON.parse(data.toString())
    t.is(res.response, 'Target has been created', 'Target has been created')
    t.end()
  }))
})

test.serial.cb('Create Target Alredy Exists', function (t) {
  var url = '/api/targets'
  var serverStream = servertest(server(), url, { method: 'POST' })

  fs.createReadStream(path.resolve(__dirname, 'target_data.json'), 'UTF-8').pipe(serverStream)

  serverStream.pipe(BufferListStream(function (err, data) {
    t.falsy(err, 'no error')
    const res = JSON.parse(data.toString())
    t.is(res.response, 'Target already exists', 'Target already exists')
    t.end()
  }))
})

test.serial.cb('Create Target id not present in post data', function (t) {
  var url = '/api/targets'
  var serverStream = servertest(server(), url, { method: 'POST' })

  fs.createReadStream(path.resolve(__dirname, 'target_no_id_data.json'), 'UTF-8').pipe(serverStream)

  serverStream.pipe(BufferListStream(function (err, data) {
    t.falsy(err, 'no error')
    const res = JSON.parse(data.toString())
    t.is(res.response, 'ID required to find/update', 'ID required to find/update')
    t.end()
  }))
})

test.serial.cb('get Target id 1', function (t) {
  var url = '/api/target/1'
  servertest(server(), url, { encoding: 'json' }, function (error, res) {
    t.falsy(error, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.response.id, '1', 'Id is 1')
    t.end()
  })
})

test.serial.cb('get Target id does not exist', function (t) {
  var url = '/api/target/2'
  servertest(server(), url, { encoding: 'json' }, function (error, res) {
    t.falsy(error, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.response, 'Target doesn"t exists', 'Target doesn"t exists')
    t.end()
  })
})

test.serial.cb('Get all targets', function (t) {
  var url = '/api/targets'
  servertest(server(), url, { encoding: 'json' }, function (error, res) {
    t.falsy(error, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.response.length, 1, 'total is 1')
    t.end()
  })
})

test.serial.cb('update Target', function (t) {
  var url = '/api/target/1'
  var serverStream = servertest(server(), url, { method: 'POST' })

  fs.createReadStream(path.resolve(__dirname, 'update_target_data.json'), 'UTF-8').pipe(serverStream)

  serverStream.pipe(BufferListStream(function (err, data) {
    t.falsy(err, 'no error')
    const res = JSON.parse(data.toString())
    t.is(res.response, 'Target has been updated', 'Target has been updated')
    t.end()
  }))
})

test.serial.cb('update Target which does not exist', function (t) {
  var url = '/api/target/2'
  var serverStream = servertest(server(), url, { method: 'POST' })

  fs.createReadStream(path.resolve(__dirname, 'update_target_data.json'), 'UTF-8').pipe(serverStream)

  serverStream.pipe(BufferListStream(function (err, data) {
    t.falsy(err, 'no error')
    const res = JSON.parse(data.toString())
    t.is(res.response, 'Target doesn"t exists', 'Target doesn"t exists')
    t.end()
  }))
})

test.serial.cb('positive route Target', function (t) {
  var url = '/route'
  var serverStream = servertest(server(), url, { method: 'POST' })

  fs.createReadStream(path.resolve(__dirname, 'route_data.json'), 'UTF-8').pipe(serverStream)

  serverStream.pipe(BufferListStream(function (err, data) {
    t.falsy(err, 'no error')
    const res = JSON.parse(data.toString())

    t.is(res.value, '0.50', 'Value is 0.50')
    t.is(res.url, 'http://example.com', 'Valid url')
    t.end()
  }))
})

test.serial.cb('positive route Target second time to return decision reject ', function (t) {
  var url = '/route'
  var serverStream = servertest(server(), url, { method: 'POST' })

  fs.createReadStream(path.resolve(__dirname, 'route_data.json'), 'UTF-8').pipe(serverStream)

  serverStream.pipe(BufferListStream(function (err, data) {
    t.falsy(err, 'no error')
    const res = JSON.parse(data.toString())
    t.is(res.decision, 'reject', 'Decision is rejected')
    t.end()
  }))
})

test.serial.cb('route Target decision reject', function (t) {
  var url = '/route'
  var serverStream = servertest(server(), url, { method: 'POST' })

  fs.createReadStream(path.resolve(__dirname, 'negative_route_data.json'), 'UTF-8').pipe(serverStream)

  serverStream.pipe(BufferListStream(function (err, data) {
    t.falsy(err, 'no error')
    const res = JSON.parse(data.toString())

    t.is(res.decision, 'reject', 'Decision is rejected')
    t.end()
  }))
})

test.serial.cb('route Target not present in redis stoe', function (t) {
  var url = '/route'
  var serverStream = servertest(server(), url, { method: 'POST' })

  fs.createReadStream(path.resolve(__dirname, 'not_present_route_data.json'), 'UTF-8').pipe(serverStream)

  serverStream.pipe(BufferListStream(function (err, data) {
    t.falsy(err, 'no error')
    const res = JSON.parse(data.toString())

    t.is(res.decision, 'reject', 'Decision is rejected')
    t.end()
  }))
})
