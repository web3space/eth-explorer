require! {
    \./app/config.json : { rpc-url }
    \web3 : Web3
}

web3 = new Web3
web3.setProvider(new web3.providers.HttpProvider(rpc-url))

module.exports = web3