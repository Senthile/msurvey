var App = angular.module('App', []);

App.controller('voteMachineCtrl', function ($scope, $http) {
    $scope.loading = false;
    $scope.castVote = function (option) {
        $scope.loading = true;

        var data = {};
        //data.clientIP = APP_CLIENT_IP;
        data.clientIP = "MAC_ADDRESS";
        data.option = option;

        $http({
            url: '/castVote',
            method: "POST",
            data: data,
            headers: { 'Content-Type': "application/json; charset=utf-8" }
        }).success(function (data, status, headers, config) {
            $scope.$broadcast('message', data);
            $scope.loading = false;
        }).error(function (data, status, headers, config) {
            //$scope.status = status;
            $scope.$broadcast('message', "Not succeeded. Please try again.", true);
            $scope.loading = false;
        });
    }

    $scope.$on('message', function (event, message, isError) {
        if (message) {
            var $modal = $("#dispModal");
            
            if(isError) {
                 $modal.find("#alertType").removeClass("alert-success").addClass("alert-error");
            } else {
                $modal.find("#alertType").removeClass("alert-error").addClass("alert-success");
            }
            
            $modal.find("#message").text(message);
            $modal.modal().css({
                'margin-top': function () {
                    return "10em";
                }
            });
        }
    });
});
