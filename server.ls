require! {
    \express
}

app = express!
    .use express.static \app
    .get '/api/*', (req, res)->
        res.status(500).send('Not Implemented');
    .get '/*', (req, res)->
        res.redirect("/\##{req.url}")

app.listen 8000, ->
  console.log('Example app listening on port 8000!')
