# Ethereum Explorer (Opensource)

Nodejs Ethereum Explorer

Features: 

1. Urls compatible with Etherscan
2. API compatible with Etherscan (in progress)

![EthExplorer Screenshot](http://res.cloudinary.com/nixar-work/image/upload/v1529716647/Screen_Shot_2018-06-23_at_04.17.01.png)

## License

GPL

## Installation

Install [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git "Git installation") if you haven't already

Clone the repo

`git clone https://github.com/ethnamed/explorer`

npm i bower -g

Download [Nodejs and npm](https://docs.npmjs.com/getting-started/installing-node "Nodejs install") if you don't have them

## Run GETH or Ganache

Install [geth](https://github.com/ethereum/go-ethereum/wiki/Building-Ethereum "Geth install") if you don't already have it, then run the above command.

Or Ganache

```
npm i ganache-cli -g

ganache-cli \
  --hostname="0.0.0.0" \
  --port=8545 \
  --networkId=777 \
  --accounts=50 \
  --defaultBalanceEther=1000000 \
  --mnemonic="xmr bch btg ltc eth eos xem ada dash btc zec"
```

Edit the connection to the ethereum `explorer/app/app.js` -> `var eth_node_url = 'http://0.0.0.0:8545';`

Start the program. All dependencies will be automatically downloaded


```
npm install

bower install

npm start
```



Open http://0.0.0.0:8000


## API

http://0.0.0.0:8000/api 

Documentation: https://etherscan.io/apis