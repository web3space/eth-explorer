angular.module('ethExplorer')
    .controller('addressInfoCtrl', function ($rootScope, $scope, $location, $routeParams, $q) {

      var web3 = $rootScope.web3;
	
      $scope.init=function(){
        $scope.addressId=$routeParams.addressId;

        if($scope.addressId!==undefined) {
          getAddressInfos().then(function(result){
            $scope.balance = result.balance;
            $scope.balanceInEther = result.balanceInEther;
            $scope.code = result.code;
            console.log($scope.code);
          });
        }


        function getAddressInfos(){
          var deferred = $q.defer();

          web3.eth.getBalance($scope.addressId,function(error, result) {
            if(!error) {
                
                web3.eth.getCode($scope.addressId,function(error, code) {
              
                    deferred.resolve({
                      balance: result,
                      balanceInEther: web3.fromWei(result, 'ether'),
                      code: code
                    });
                
                });
                
            } else {
                deferred.reject(error);
            }
          });
          return deferred.promise;
        }


      };
      
      $scope.init();

    });
