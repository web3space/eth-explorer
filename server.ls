require! {
    \express
    \cors
    \express-rate-limit
    \express-http-proxy : proxy
    \greenlock-express : { create }
}

limit-config =
  windowMs: 150 * 60 * 1000
  max: 1000000

limiter = express-rate-limit limit-config


app =
    express!
        .use limiter
        .use cors!
        .use \/tx/:id , express.static(\./)
        .use \/address/:id , express.static(\./)
        .use \/block/:id , express.static(\./)
        .use \/api, proxy("http://78.47.205.180:8545")
        .use \/ , express.static(\./)

greenlock =
        create do
          email: \denis@gmail.com
          agreeTos: yes          
          config-dir: \./config/acme/
          community-member: no
          telemetry: no
          app: app
          debug: yes

#app.listen 80
greenlock.listen(80, 443)

