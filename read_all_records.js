var levelup = require('levelup')
var leveldown = require('leveldown')
var DATABASE = levelup(leveldown('./tokenDatabase'))

var stream = DATABASE.createReadStream()
stream.on('data', function (data) 
    {
        console.log(data.key.toString('utf-8'), '=', data.value.toString('utf-8'))
    }
)
stream.on('end', function(){
    console.log('Stream ended')
})