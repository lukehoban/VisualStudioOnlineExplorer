(function () {
    "use strict";

    var app = angular.module('app', ['ionic']);

    app.config(function ($stateProvider, $urlRouterProvider) {
        $stateProvider.
            state('home', { url: '/home', templateUrl: 'partials/home.html', controller: 'HomeCtrl' }).
            state('user', { url: '/user', templateUrl: 'partials/user.html', controller: 'UserCtrl' }).
            state('repo', { url: '/repo/:id', templateUrl: 'partials/repo.html', controller: 'RepoCtrl' }).
            state('changes', { url: '/changes/:repoId/:commitId', templateUrl: 'partials/changes.html', controller: 'ChangesCtrl' });
        $urlRouterProvider.otherwise('/home');
    });

    app.service("vsoRESTAPI", function ($http, account) {
        $http.defaults.cache = true;
        return function (path) {
            return $http({
                method: "GET",
                url: 'https://' + account.account + '.VisualStudio.com/DefaultCollection/_apis/' + path,
                headers: { Authorization: 'Basic ' + btoa(account.username + ':' + account.password) }
            });
        };
    });

    app.factory("account", function () {
        return {
            username: null,
            password: null,
            account: null,
            save: function () {
                localStorage["account"] = JSON.stringify(this);
            },
            load: function () {
                var o = JSON.parse(localStorage["account"] || "{}");
                for (var k in o) if (o.hasOwnProperty(k)) this[k] = o[k];
            }
        };
    });

    app.controller("HomeCtrl", function ($scope, $window, account, $location) {
        var homeScope = $scope;
        account.load();
        $scope.account = account;
        $scope.login = function () {
            account.save();
            $location.path('/user');
        }
    });

    app.controller("UserCtrl", function ($scope, account, vsoRESTAPI) {
        $scope.$parent.user = account.username;
        vsoRESTAPI('git/repositories').then(function (res) {
            $scope.repos = res.data.value;
            $scope.repos.forEach(function (repo) {
                vsoRESTAPI('git/repositories/' + repo.id + '/stats/branches').then(function (res) {
                    repo.branches = res.data.value;
                }, function (err) {
                    console.log(err);
                });
            });
        }, function (err) {
            console.log(err);
        });
    });

    app.controller("RepoCtrl", function ($scope, $stateParams, vsoRESTAPI) {
        $scope.repoId = $stateParams.id;
        $scope.getHash = function (email) {
            return md5(email.trim().toLowerCase());
        }
        vsoRESTAPI('git/repositories/' + $scope.repoId + '/commits').then(function (res) {
            $scope.commits = res.data.value;
        }, function (err) {
            console.log(err);
        });
    });

    app.controller("ChangesCtrl", function ($scope, $stateParams, vsoRESTAPI) {
        var repoId = $stateParams.repoId;
        var commitId = $stateParams.commitId;
        vsoRESTAPI('git/repositories/' + repoId + '/commits/' + commitId).then(function (res) {
            $scope.commits = res.data.value;
        }, function (err) {
            console.log(err);
        });
    })

    document.addEventListener('deviceready', function () {
        document.addEventListener('pause', function () { }, false);
        document.addEventListener('resume', function () { }, false);
    }, false);

})();