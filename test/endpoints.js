process.env.NODE_ENV = 'development'

var test = require('ava')
var servertest = require('servertest')

var server = require('../lib/server')

// test.serial.cb('healthcheck', function (t) {
//   var url = '/health'
//   servertest(server(), url, { encoding: 'json' }, function (err, res) {
//     console.log('error ', err)
//     t.falsy(err, 'no error')

//     t.is(res.statusCode, 200, 'correct statusCode')
//     t.is(res.body.status, 'OK', 'status is ok')
//     t.end()
//   })
// })

test.serial.cb('Create Target', function (t) {
  var url = '/api/targets'
  var serverStream = servertest(server(), url, { method: 'POST' })
  serverStream.write(JSON.stringify({ id: '1' }))

  serverStream.on('data', function (err, data) {
    console.log(err)
    t.falsy(err, 'no error')
    console.log(data)
    if (data.message === 'Target already exists') {
      t.is(data.message, 'Target already exists', 'Target already exists')
      t.end()
    } else {
      // t.is(res.statusCode, 200, 'correct statusCode')
      t.is(data.message, 'Target has been created', 'Target has been created')
      t.end()
    }
  })
})

test.serial.cb('get Target id 1', function (t) {
  var url = '/api/target/1'
  servertest(server(), url, { encoding: 'json' }, function (error, res) {
    t.write()
    t.falsy(error, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.response.data.id, '1', 'Id is 1')
    t.end()
  })
})

test.serial.cb('Get all targets', function (t) {
  var url = '/api/targets'
  servertest(server(), url, { encoding: 'json' }, function (error, res) {
    t.falsy(error, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.response.total, 3, 'total is 3')
    t.end()
  })
})
