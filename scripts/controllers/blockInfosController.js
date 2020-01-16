angular.module('ethExplorer.block', ['ngRoute','ui.bootstrap'])
    .controller('blockInfosCtrl', function ($rootScope, $scope, $location, $routeParams,$q) {

	var web3 = $rootScope.web3;
	

    $scope.init = function()
        {
            $rootScope.loading = true;
            $scope.blockId = $routeParams.blockId;
			
			var number = 0;
            if($scope.blockId!==undefined) {
				
				web3.eth.getBlockNumber().then(res => {
					number = res;
				}, err => console.log(err));
				
                getBlockInfos()
                  .then( function(result){
                    
					
                    $rootScope.loading = false;
                    $scope.result = result;

                    if(result.hash!==undefined){
                        $scope.hash = result.hash;
                    }
                    else{
                        $scope.hash ='pending';
                    }
                    if(result.miner!==undefined){
                        $scope.miner = result.miner;
                    }
                    else{
                        $scope.miner ='pending';
                    }
                    $scope.gasLimit = result.gasLimit;
                    $scope.gasUsed = (result.gasUsed !== null ? result.gasUsed : 0);
                    $scope.nonce = (result.nonce === null ? 'null' : result.nonce);
                    $scope.difficulty = ("" + result.difficulty).replace(/['"]+/g, '');
                    $scope.gasLimit = result.gasLimit; // that's a string
                    $scope.number = result.number;
                    $scope.parentHash = result.parentHash;
                    $scope.blockNumber = result.number;
                    $scope.timestamp = result.timestamp;
                    $scope.extraData = (result.extraData === null ? 'null' : result.extraData);
                    $scope.dataFromHex = hex2a(result.extraData);
                    $scope.size = result.size;
					
					if(result.number!==undefined){
						$scope.conf = number - result.number + " Confirmations";
						if($scope.conf===0 + " Confirmations"){
							$scope.conf='Unconfirmed';
						}
						if ( (number - result.number) <= 0) {
							$scope.conf='Unconfirmed';
						}
					}

                    if($scope.blockNumber!==undefined){
                        var info = web3.eth.getBlock($scope.blockNumber);
                        if(info!==undefined){
                            var newDate = new Date();
                            newDate.setTime(info.timestamp*1000);
                            $scope.time = newDate.toUTCString();
                        }
                    }

                });

            } else {
                $location.path("/");
            }


            function getBlockInfos() {
                var deferred = $q.defer();
                
                web3.eth.getBlock($scope.blockId,function(error, result) {
                    if(!error) {
                        deferred.resolve(result);
                    } else {
                        deferred.reject(error);
                    }
                });
                return deferred.promise;

            }


        };
        $scope.init();

        // parse transactions
        $scope.transactions = []
        web3.eth.getBlockTransactionCount($scope.blockId, function(error, result){
          var txCount = result;
		  
          for (var blockIdx = 0; blockIdx < txCount; blockIdx++) {
			
            web3.eth.getTransactionFromBlock($scope.blockId, blockIdx, function(error, result) {

              var transaction = {
                id: result.hash,
                hash: result.hash,
                from: result.from,
                to: result.to,
                gas: result.gas,
                input: result.input,
                value: result.value
              }
              $scope.$apply(
                $scope.transactions.push(transaction)
              )
            })
          }
        })


function hex2a(hexx) {
	if (hexx === null) {
		return 'null';
	}
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}
});
