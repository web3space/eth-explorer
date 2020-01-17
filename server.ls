require! {
    \express
    \cors
    \express-rate-limit
    \express-http-proxy : proxy
    \greenlock-express : { create }
}

limit-config =
  windowMs: 150 * 60 * 1000
  max: 10000

limiter = express-rate-limit limit-config


app =
    express!
        .use limiter
        .use cors!
        .use \/api, proxy("http://localhost:8545")
        .use \/ , express.static(\./)

#greenlock =
#        create do
#          email: \a.stegno@gmail.com
#          agreeTos: yes          
#          config-dir: \./config/acme/
#          community-member: no
#          telemetry: no
#          app: app
#          debug: yes

app.listen 80
#server = greenlock.listen(80, 443)

