var URL = require('url')
var http = require('http')
var cuid = require('cuid')
var Corsify = require('corsify')
var sendJson = require('send-data/json')
var ReqLogger = require('req-logger')
var healthPoint = require('healthpoint')
var HttpHashRouter = require('http-hash-router')

var redis = require('./redis')
var version = require('../package.json').version

var router = HttpHashRouter()
var logger = ReqLogger({ version: version })
var health = healthPoint({ version: version }, redis.healthCheck)
var cors = Corsify({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, accept, content-type'
})
var { createTarget, getTargetById, getAllTargets, updateTargetById, routeTarget } = require('./target')
const { POST_TARGET, GET_TARGET, ROUTE } = require('./constants/urlContants')

router.set('/favicon.ico', empty)

router.set(POST_TARGET,
  {
    POST: createTarget,
    GET: getAllTargets
  })

router.set(GET_TARGET + '/:id',
  {
    GET: getTargetById,
    POST: updateTargetById
  })

router.set(ROUTE, {
  POST: routeTarget
})

console.log(new Date(new Date().toUTCString()).getUTCHours())
module.exports = function createServer () {
  return http.createServer(cors(handler))
}

async function handler (req, res) {
  if (req.url === '/health') return health(req, res)
  req.id = cuid()
  logger(req, res, { requestId: req.id }, function (info) {
    info.authEmail = (req.auth || {}).email
    console.log(info)
  })
  const body = await getBody(req)
  router(req, res, { query: getQuery(req.url), body: body }, onError.bind(null, req, res))
}

function onError (req, res, err) {
  if (!err) return

  res.statusCode = err.statusCode || 500
  logError(req, res, err)

  sendJson(req, res, {
    error: err.message || http.STATUS_CODES[res.statusCode]
  })
}

function logError (req, res, err) {
  if (process.env.NODE_ENV === 'test') return

  var logType = res.statusCode >= 500 ? 'error' : 'warn'

  console[logType]({
    err: err,
    requestId: req.id,
    statusCode: res.statusCode
  }, err.message)
}

function empty (req, res) {
  res.writeHead(204)
  res.end()
}

function getQuery (url) {
  return URL.parse(url, true).query // eslint-disable-line
}

async function getBody (req) {
  const buffers = []

  for await (const chunk of req) {
    buffers.push(chunk)
  }

  var data = Buffer.concat(buffers).toString()
  data = data ? JSON.parse(data) : {}
  return data
}
