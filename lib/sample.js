const { SchemaFieldTypes, AggregateGroupByReducers, AggregateSteps } = require('redis')

var redis = require('./redis')
async function searchJSON () {
  await redis.connect()
  // Create an index.
  try {
    await redis.ft.create('users-idx', {

      '$.age': {
        type: SchemaFieldTypes.NUMERIC,
        AS: 'age'
      },
      '$.name': {
        type: SchemaFieldTypes.TEXT,
        SORTABLE: 'UNF'
      },
      '$.coins': {
        type: SchemaFieldTypes.NUMERIC,
        AS: 'coins'
      },
      '$.email': {
        type: SchemaFieldTypes.TAG,
        AS: 'email'
      }
    }, {
      ON: 'JSON',
      PREFIX: 'users'
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

  // Add some users.
  await Promise.all([
    redis.json.set('users:1', '$', {
      name: 'Alice',
      age: 32,
      coins: 100,
      email: 'alice@nonexist.com'
    }),
    redis.json.set('users:2', '$', {
      name: 'Bob',
      age: 23,
      coins: 15,
      email: 'bob@somewhere.gov'
    })
  ])

  // Search all users under 30
  console.log('Users under 30 years old:')
  console.log(
    // https://oss.redis.com/redisearch/Commands/#ftsearch
    JSON.stringify(
      await redis.ft.search('users-idx', '@age:[30 40]'),
      null,
      2
    )
  )
  // {
  //   "total": 1,
  //   "documents": [
  //     {
  //       "id": "noderedis:users:2",
  //       "value": {
  //         "name": "Bob",
  //         "age": 23,
  //         "coins": 15,
  //         "email": "bob@somewhere.gov"
  //       }
  //     }
  //   ]
  // }

  // Find a user by email - note we need to escape . and @ characters
  // in the email address.  This applies for other punctuation too.
  // https://oss.redis.com/redisearch/Tags/#including_punctuation_in_tags
  console.log('Users with email "bob@somewhere.gov":')
  const emailAddress = 'bob@somewhere.gov'.replace(/[.@]/g, '\\$&')
  console.log(
    JSON.stringify(
      await redis.ft.search('users-idx', `@email:{${emailAddress}}`),
      null,
      2
    )
  )
  // {
  //   "total": 1,
  //   "documents": [
  //     {
  //       "id": "noderedis:users:2",
  //       "value": {
  //         "name": "Bob",
  //         "age": 23,
  //         "coins": 15,
  //         "email": "bob@somewhere.gov"
  //       }
  //     }
  //   ]
  // }

  // Some aggregrations, what's the average age and total number of coins...
  // https://oss.redis.com/redisearch/Commands/#ftaggregate
  console.log('Aggregation Demo:')
  console.log(
    JSON.stringify(
      await redis.ft.aggregate('users-idx', '*', {
        STEPS: [{
          type: AggregateSteps.GROUPBY,
          REDUCE: [{
            type: AggregateGroupByReducers.AVG,
            property: 'age',
            AS: 'averageAge'
          }, {
            type: AggregateGroupByReducers.SUM,
            property: 'coins',
            AS: 'totalCoins'
          }]
        }]
      }),
      null,
      2
    )
  )
  // {
  //   "total": 1,
  //   "results": [
  //     {
  //       "averageAge": "27.5",
  //       "totalCoins": "115"
  //     }
  //   ]
  // }

  await redis.quit()
}

module.exports = searchJSON
