angular.module('ethExplorer.address', ['ngRoute','ui.bootstrap']).controller 'addressInfoCtrl', ($rootScope, $scope, $location, $routeParams, $q) ->
    return if not $routeParams.addressId?
    $scope <<<< $routeParams
    web3 = $rootScope.web3
    $rootScope.loading = yes
    getAddressInfos = (cb)->
      err, balance <- web3.eth.getBalance $scope.addressId
      return cb err if err?
      err, code <- web3.eth.getCode $scope.addressId
      return cb err if err?
      err, transactions <- web3.eth.getTransactionCount $scope.addressId
      balanceInEther = web3.utils.fromWei(balance, 'ether')
      $rootScope.loading = false
      cb null, { balance, balanceInEther, code, transactions }

    err, res <- getAddressInfos
    return alert err if err?
    <- $rootScope.safe-apply
    $scope <<<< res
