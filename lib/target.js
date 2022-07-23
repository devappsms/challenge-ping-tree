var sendJson = require('send-data/json')

var redis = require('./redis')
const messages = require('./constants/messages')

module.exports = {
  createTarget,
  updateTargetById,
  getTargetById,
  getAllTargets,
  routeTarget
}

function createTarget (req, res, opts, onError) {
  if (opts.body.id) {
    redis.hset('targets', opts.body.id, JSON.stringify(opts.body), function (err, result) {
      if (err) onError(err)

      if (result) {
        sendJson(req, res, { response: messages.TARGET_CREATED_MSG })
      } else {
        sendJson(req, res, { response: messages.TARGET_ALREADY_EXISTS_MSG })
      }
    })
  } else {
    sendJson(req, res, { response: messages.TARGET_ID_REQUIRED_MSG })
  }
}

function updateTargetById (req, res, opts, onError) {
  redis.hget('targets', opts.params.id, function (err, result) {
    if (err) onError(err)
    if (result) {
      const doc = JSON.parse(result)
      const newDoc = { ...doc, ...opts.body }
      redis.hset('targets', opts.params.id, JSON.stringify(newDoc), function (err, result) {
        if (err) onError(err)
        if (!result) {
          sendJson(req, res, { response: messages.TARGET_UPDATED_MSG })
        } else {
          sendJson(req, res, { response: 'Update failed' })
        }
      })
    } else {
      sendJson(req, res, { response: messages.TARGET_DOESNOT_EXISTS_MSG })
    }
  })
}

function getTargetById (req, res, opts, onError) {
  redis.hget('targets', opts.params.id, function (err, result) {
    if (err) onError(err)
    if (result) {
      sendJson(req, res, { response: JSON.parse(result) })
    } else {
      sendJson(req, res, { response: messages.TARGET_DOESNOT_EXISTS_MSG })
    }
  })
}

function getAllTargets (req, res, opts, onError) {
  redis.hgetall('targets', function (err, result) {
    if (err) onError(err)

    if (result) {
      var targets = []
      for (const key in result) {
        targets.push(JSON.parse(result[key]))
      }
      sendJson(req, res, { response: targets })
    } else {
      sendJson(req, res, { response: messages.TARGET_DOESNOT_EXISTS_MSG })
    }
  })
}

function routeTarget (req, res, opts, onError) {
  redis.hgetall('targets', function (err, result) {
    if (err) onError(err)

    if (result) {
      var targets = []
      for (const key in result) {
        targets.push(JSON.parse(result[key]))
      }
      const requestHour = new Date(new Date(opts.body.timestamp).toUTCString()).getUTCHours()
      var targetResult = {}
      const docs = targets.filter(target => {
        const hours = target.accept.hour.$in
        return target.accept.geoState.$in.includes(opts.body.geoState) && requestHour >= parseInt(hours[0]) && requestHour <= (parseInt(hours[hours.length - 1]) + 1)
      })

      if (docs.length > 0) {
        docs.sort((a, b) => {
          if (parseInt(a) < parseInt(b)) return -1
          if (parseInt(a) > parseInt(b)) return 1
          return 0
        })
        for (const doc in docs) {
          const rec = docs[doc]
          redis.get(`requests:${rec.id}`, function (err, reqRec) {
            if (err) onError(err)
            reqRec = JSON.parse(reqRec)
            const newDate = new Date(new Date().toUTCString()).getDate()
            const reqDate = new Date(new Date(opts.body.timestamp).toUTCString()).getDate()
            if (reqRec === null || (reqRec && reqRec.date < newDate && newDate === reqDate)) {
              const reqData = { date: newDate, count: 1 }
              redis.set(`requests:${rec.id}`, JSON.stringify(reqData))
              targetResult = { url: rec.url, value: rec.value }
              sendJson(req, res, targetResult)
            } else if (reqRec.count !== parseInt(rec.maxAcceptsPerDay) && newDate === reqDate) {
              reqRec.count = parseInt(reqRec.count) + 1
              redis.set(`requests:${rec.id}`, JSON.stringify(reqRec))
              targetResult = { url: rec.url, value: rec.value }
              sendJson(req, res, targetResult)
            } else {
              targetResult = { decision: 'reject' }
              sendJson(req, res, targetResult)
            }
          })
        }
      } else {
        sendJson(req, res, { decision: 'reject' })
      }
    } else {
      sendJson(req, res, { decision: 'reject' })
    }
  })
}
