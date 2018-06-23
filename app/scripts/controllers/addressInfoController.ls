angular.module('ethExplorer').controller 'addressInfoCtrl', ($rootScope, $scope, $location, $routeParams, $q) ->
    return if not $routeParams.addressId?
    $scope <<<< $routeParams
    web3 = $rootScope.web3
    
    getAddressInfos = (cb)->
      err, balance <- web3.eth.getBalance $scope.addressId
      return cb err if err?
      err, code <- web3.eth.getCode $scope.addressId
      return cb err if err?
      err, transactions <- web3.eth.getTransactionCount $scope.addressId
      balanceInEther = web3.fromWei(balance, 'ether')
      cb null, { balance, balanceInEther, code, transactions }

    err, res <- getAddressInfos
    return alert err if err?
    console.log res
    <- $scope.$apply
    $scope <<<< res