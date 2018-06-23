require! {
    \express
    \cors
    \./web3.js
}


create-module = (actions)-> (query, cb)->
     action = actions[query.action]
     return cb 'Action Not Found' if not action?
     action query, cb

balance = (query, cb)->
    return cb "Address is required" if not query.address?
    err, data <- web3.eth.get-balance query.address
    return cb err if err?
    cb null, data.to-string!

txlist = (query, cb)->
    cb null, []

account     = create-module { balance, txlist }
contract    = create-module { }
transaction = create-module { }
block       = create-module { }
logs        = create-module { }
proxy       = create-module { }
stats       = create-module { }

modules = { account, contract, transaction, block, logs, proxy, stats } 

api = (query, cb)->
    console.log JSON.stringify query
    module = modules[query.module]
    return cb('Module Not Found') if not module?
    err, data <- module query
    return cb err if err?
    cb null, data

responsity = (res)-> (err, result)->
    return res.send { status: "0", message: "ERROR", result: err.message ? err } if err?
    res.send { status: "1" , message: "OK", result }

app = express!
    .use cors!
    .use express.static \app
    .get '/api', (req, res)->
        api req.query, responsity(res)
    .get '/*', (req, res)->
        res.redirect("/\##{req.url}")

app.listen 8000, ->
  console.log('Example app listening on port 8000!')
