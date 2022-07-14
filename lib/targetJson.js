const { SchemaFieldTypes } = require('redis')
var redis = require('./redis')

module.exports = createTargetIndex

async function createTargetIndex () {
  // Create an index.
  try {
    await redis.ft.create('idx', {
      '$.id': {
        type: SchemaFieldTypes.TEXT,
        SORTABLE: 'UNF'
      },
      '$.url': {
        type: SchemaFieldTypes.TEXT,
        AS: 'url'
      },
      '$.value': {
        type: SchemaFieldTypes.TEXT,
        AS: 'value',
        SORTABLE: 'UNF'
      },
      '$.maxAcceptsPerDay': {
        type: SchemaFieldTypes.TEXT,
        AS: 'maxAcceptsPerDay'
      },
      '$.accept.geoState.$in[*]': {
        type: SchemaFieldTypes.TAG,
        AS: 'geoState'
      },
      '$.accept.hour.$in[*]': {
        type: SchemaFieldTypes.TAG,
        AS: 'hour'
      }
    }, {
      ON: 'JSON',
      PREFIX: 'targets'
    })
  } catch (e) {
    if (e.message === 'Index already exists') {
      console.log('Index exists already, skipped creation.')
    } else {
      // Something went wrong, perhaps RediSearch isn't installed...
      console.error(e)
      process.exit(1)
    }
  }
}
