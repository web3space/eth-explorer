require! {
    \express
}

create-module = (actions)-> (query, cb)->
     action = actions[query.action]
     return cb 'Action Not Found' if not action?
     action query, cb

balance = (query, cb)->
    #query.address
    cb "Not Implemented"

account     = create-module { balance }
contract    = create-module { }
transaction = create-module { }
block       = create-module { }
logs        = create-module { }
proxy       = create-module { }
stats       = create-module { }

modules = { account, contract, transaction, block, logs, proxy, stats } 

app = express!
    .use express.static \app
    .get '/api', (req, res)->
        console.log JSON.stringify req.query
        module = modules[req.query.module]
        res.status(404).send('Module Not Found') if not module?
        err, data <- module req.query
        res.status(500).send(err.message ? err) if not err?
        res.send data
    .get '/*', (req, res)->
        res.redirect("/\##{req.url}")

app.listen 8000, ->
  console.log('Example app listening on port 8000!')
