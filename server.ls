require! {
    \express
}

balance = (query, cb)->
    #query.address
    cb "Not Implemented"

account = (query, cb)->
     actions = {  }
     action = actions[query.action]
     res.status(404).send('Action Not Found') if not action!
     action query, cb
contract = (query, cb)->
     actions = {  }
     action = actions[query.action]
     res.status(404).send('Action Not Found') if not action!
     action query, cb
transaction = (query, cb)->
     actions = {  }
     action = actions[query.action]
     res.status(404).send('Action Not Found') if not action!
     action query, cb
block = (query, cb)->
     actions = {  }
     action = actions[query.action]
     res.status(404).send('Action Not Found') if not action!
     action query, cb
logs = (query, cb)->
     actions = {  }
     action = actions[query.action]
     res.status(404).send('Action Not Found') if not action!
     action query, cb
proxy = (query, cb)->
     cactions = {  }
     action = actions[query.action]
     res.status(404).send('Action Not Found') if not action!
     action query, cb
stats = (query, cb)->
     actions = {  }
     action = actions[query.action]
     res.status(404).send('Action Not Found') if not action!
     action query, cb

modules = { account, contract, transaction, block, logs, proxy, stats } 

app = express!
    .use express.static \app
    .get '/api', (req, res)->
        module = modules[req.query.module]
        res.status(404).send('Module Not Found') if not module!
        err, data <- module req.query
        res.status(500).send(err.message ? err) if not err?
        res.send data
    .get '/*', (req, res)->
        res.redirect("/\##{req.url}")

app.listen 8000, ->
  console.log('Example app listening on port 8000!')
