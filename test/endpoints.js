process.env.NODE_ENV = 'test'
var fs = require('fs')
var test = require('ava')
var servertest = require('servertest')
var path = require('path')
const { BufferListStream } = require('bl')

var server = require('../lib/server')
const { content, contentNegative, contentNotPresent } = require('../lib/testContants')
const { POST_TARGET, GET_TARGET, ROUTE } = require('../lib/urlContants')

const fileData = [content, contentNegative, contentNotPresent]

const files = ['content', 'contentNegative', 'contentNotPresent']

files.forEach((element, index) => {
  console.log(element, fileData[index])
  try {
    fs.writeFileSync(path.resolve(__dirname, `${element}.json`), JSON.stringify(fileData[index]))
    // file written successfully
  } catch (err) {
    console.error(err)
  }
})

// Common function to test using serverStream
function testPostMethod (details, t) {
  const { url, method, fileName, testData } = details
  var serverStream = servertest(server(), url, { method: method })
  fs.createReadStream(path.resolve(__dirname, fileName), 'UTF-8').pipe(serverStream)
  serverStream.pipe(BufferListStream(function (err, data) {
    t.falsy(err, 'no error')

    const res = JSON.parse(data.toString())
    testData.forEach(element => {
      t.is(res[element.field], element.data, element.message)
    })
    t.end()
  }))
}

test.serial.cb('healthcheck', function (t) {
  var url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('Create Target', function (t) {
  const details = {
    url: POST_TARGET,
    method: 'POST',
    fileName: 'target_data.json',
    testData: [
      { field: 'response', data: 'Target has been created', message: 'Target has been created' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('Create Target Alredy Exists', function (t) {
  const details = {
    url: POST_TARGET,
    method: 'POST',
    fileName: 'target_data.json',
    testData: [
      { field: 'response', data: 'Target already exists', message: 'Target already exists' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('Create Target id not present in post data', function (t) {
  const details = {
    url: POST_TARGET,
    method: 'POST',
    fileName: 'target_no_id_data.json',
    testData: [
      { field: 'response', data: 'ID required to find/update', message: 'ID required to find/update' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('get Target id 1', function (t) {
  var url = GET_TARGET + '1'
  servertest(server(), url, { encoding: 'json' }, function (error, res) {
    t.falsy(error, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.response.id, '1', 'Id is 1')
    t.end()
  })
})

test.serial.cb('get Target id does not exist', function (t) {
  var url = GET_TARGET + '2'
  servertest(server(), url, { encoding: 'json' }, function (error, res) {
    t.falsy(error, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.response, 'Target doesn"t exists', 'Target doesn"t exists')
    t.end()
  })
})

test.serial.cb('Get all targets', function (t) {
  var url = POST_TARGET
  servertest(server(), url, { encoding: 'json' }, function (error, res) {
    t.falsy(error, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.response.length, 1, 'total is 1')
    t.end()
  })
})

test.serial.cb('update Target', function (t) {
  const details = {
    url: GET_TARGET + '1',
    method: 'POST',
    fileName: 'update_target_data.json',
    testData: [
      { field: 'response', data: 'Target has been updated', message: 'Target has been updated' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('update Target which does not exist', function (t) {
  const details = {
    url: GET_TARGET + '2',
    method: 'POST',
    fileName: 'update_target_data.json',
    testData: [
      { field: 'response', data: 'Target doesn"t exists', message: 'Target doesn"t exists' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('positive route Target', function (t) {
  const details = {
    url: ROUTE,
    method: 'POST',
    fileName: 'content.json',
    testData: [
      { field: 'value', data: '0.50', message: 'Value is 0.50' },
      { field: 'url', data: 'http://example.com', message: 'Valid url' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('positive route Target second time to return decision reject ', function (t) {
  const details = {
    url: ROUTE,
    method: 'POST',
    fileName: 'content.json',
    testData: [
      { field: 'decision', data: 'reject', message: 'Decision is rejected' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('route Target decision reject', function (t) {
  const details = {
    url: ROUTE,
    method: 'POST',
    fileName: 'contentNegative.json',
    testData: [
      { field: 'decision', data: 'reject', message: 'Decision is rejected' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('route Target not present in redis stoe', function (t) {
  const details = {
    url: ROUTE,
    method: 'POST',
    fileName: 'contentNotPresent.json',
    testData: [
      { field: 'decision', data: 'reject', message: 'Decision is rejected' }
    ]
  }
  testPostMethod(details, t)
})
