var sendJson = require('send-data/json')

var redis = require('./redis')
var createTargetIndex = require('./targetJson')
const messages = require('./messages')

module.exports = {
  createTarget,
  updateTargetById,
  getTargetById,
  getAllTargets,
  routeTarget
}

async function createTarget (req, res, opts, onError) {
  if (opts.body.id) {
    try {
      await redis.connect()
      await createTargetIndex()
      const key = `targets:${opts.body.id}`
      const doc = await redis.json.get(key)
      const targetResult = {}
      if (doc === null) {
        const result = await redis.json.set(key, '$', { ...opts.body })
        if (result === 'OK') {
          targetResult.message = messages.TARGET_CREATED_MSG
        }
      } else {
        targetResult.message = messages.TARGET_ALREADY_EXISTS_MSG
      }
      await redis.quit()
      sendJson(req, res, { response: targetResult })
    } catch (e) {
      onError(e)
    }
  } else {
    sendJson(req, res, { response: messages.TARGET_ID_REQUIRED_MSG })
  }
}

async function updateTargetById (req, res, opts, onError) {
  if (opts.params.id) {
    try {
      await redis.connect()
      const key = 'targets:' + opts.params.id
      const doc = await redis.json.get(key)
      const targetResult = {}
      if (doc === null) {
        targetResult.message = messages.TARGET_DOESNOT_EXISTS_MSG
      } else {
        const result = await redis.json.set(key, '$', { ...doc, ...opts.body })
        if (result === 'OK') {
          targetResult.message = messages.TARGET_UPDATED_MSG
        }
      }
      await redis.quit()
      sendJson(req, res, { response: targetResult })
    } catch (e) {
      onError(e)
    }
  } else {
    sendJson(req, res, { response: messages.TARGET_ID_REQUIRED_MSG })
  }
}

async function getTargetById (req, res, opts, onError) {
  if (opts.params.id) {
    try {
      await redis.connect()
      const key = 'targets:' + opts.params.id
      const doc = await redis.json.get(key)
      let targetResult = {}
      if (doc === null) {
        targetResult.message = messages.TARGET_DOESNOT_EXISTS_MSG
      } else {
        targetResult = {}
        targetResult.message = messages.TARGET_FOUND_MSG
        targetResult.data = doc
      }
      await redis.quit()
      sendJson(req, res, { response: targetResult })
    } catch (e) {
      onError(e)
    }
  } else {
    sendJson(req, res, { response: messages.TARGET_ID_REQUIRED_MSG })
  }
}

async function getAllTargets (req, res, opts, onError) {
  try {
    await redis.connect()
    const targetResult = {}
    const result = await redis.ft.search('idx', '*')
    await redis.quit()
    targetResult.total = result.total
    targetResult.documents = result.documents.map(data => {
      return data.value
    })
    sendJson(req, res, { response: targetResult })
  } catch (e) {
    onError(e)
  }
}

async function routeTarget (req, res, opts, onError) {
  try {
    await redis.connect()
    var targetResult = {}
    const result = await redis.ft.search('idx', `@geoState:{${opts.body.geoState}}`, { SORTBY: { BY: 'value', DIRECTION: 'DESC' } })
    const requestHour = new Date(new Date(opts.body.timestamp).toUTCString()).getUTCHours()
    if (result.total > 0) {
      const docs = result.documents.filter(data => {
        const hours = JSON.parse(data.value.$).accept.hour.$in
        return requestHour >= parseInt(hours[0]) && requestHour <= (parseInt(hours[hours.length - 1]) + 1)
      })
      for (const doc in docs) {
        const rec = JSON.parse(docs[doc].value.$)
        const reqRec = await redis.json.get(`requests:${rec.id}`)
        const newDate = new Date(new Date().toUTCString()).getDate()
        const reqDate = new Date(new Date(opts.body.timestamp).toUTCString()).getDate()
        if (reqRec === null || (reqRec && reqRec.date < newDate && newDate === reqDate)) {
          const reqData = { date: newDate, count: 1 }
          await redis.json.set(`requests:${rec.id}`, '$', reqData)
          targetResult = { url: rec.url, value: rec.value }
          break
        } else if (reqRec.count !== parseInt(rec.maxAcceptsPerDay) && newDate === reqDate) {
          await redis.json.numIncrBy(`requests:${rec.id}`, 'count', 1)
          targetResult = { url: rec.url, value: rec.value }
          break
        } else {
          targetResult = { decision: 'reject' }
        }
      }
      if (!targetResult.decision && !targetResult.value) targetResult = { decision: 'reject' }
    } else {
      targetResult = { decision: 'reject' }
    }
    await redis.quit()
    sendJson(req, res, targetResult)
  } catch (e) {
    onError(e)
  }
}
