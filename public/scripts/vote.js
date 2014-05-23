function getAndroidVersion(ua) {
    var ua = navigator.userAgent;
    var match = ua && ua.match(/Android\s([0-9\.]*)/);
    return match ? match[1] : false;
};


$(document).ready(function () {
    var input = document.createElement('input');
    input.setAttribute('type', 'range');

    var sendBoaringLevel = function() {
        var scope = $('body').scope();
        scope.sendBoaringLevel();

        window.setTimeout(sendBoaringLevel, 3000);
    };

    var reduceBoaringLevel = function () {
        var $boaringRange = $('#boaringRange'),
            $boaringSelect = $('#boaringSelect'),
            $range = $('#rangeGroup'),
            $select = $('#selectGroup'),
            scope = $("body").scope();

        scope.boaringLevel = parseInt(scope.boaringLevel) || 0;
        scope.boaringLevel = scope.boaringLevel > 100 ? 100 : scope.boaringLevel;

        if (scope.boaringLevel > 4) {
            scope.boaringLevel -= 5;
        }

        //range supported browser
        if (input.type === "range" && (!getAndroidVersion() || parseFloat(getAndroidVersion()) > 4.0 )) {
            $select.remove();
            $boaringRange.val(scope.boaringLevel);
            $boaringRange.change();
        } else {
            $range.remove();
            $boaringSelect.val(scope.boaringLevel);
        }
        window.setTimeout(reduceBoaringLevel, 5000);
    };

    sendBoaringLevel();
    reduceBoaringLevel();
});


var App = angular.module('App', []);

App.controller('voteMachineCtrl', function ($scope, $http) {
    $scope.loading = false;
    $scope.boaringLevel = 0;
    
    $scope.castVote = function (option) {
        $scope.loading = true;

        var data = {};
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
    

    $scope.sendBoaringLevel = function () {
        $scope.boaringLevel = parseInt($scope.boaringLevel) || 0;
        console.log($scope.boaringLevel);
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
