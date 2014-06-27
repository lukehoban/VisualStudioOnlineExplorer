(function () {
    "use strict";

    var app = angular.module('app', ['ionic']);

    app.config(function ($stateProvider, $urlRouterProvider) {
        $stateProvider.
            state('home', { url: '/home', templateUrl: 'partials/home.html', controller: 'HomeCtrl' }).
            state('user', { url: '/user', templateUrl: 'partials/user.html', controller: 'UserCtrl' }).
            state('workitems', { url: '/workitems', templateUrl: 'partials/workitems.html', controller: 'WorkItemsCtrl' }).
            state('repos', { url: '/repos', templateUrl: 'partials/repos.html', controller: 'ReposCtrl' }).
            state('repo', { url: '/repo/:id', templateUrl: 'partials/repo.html', controller: 'RepoCtrl' }).
            state('changes', { url: '/changes/:repoId/:commitId', templateUrl: 'partials/changes.html', controller: 'ChangesCtrl' });
        $urlRouterProvider.otherwise('/home');
    });

    app.service("vsoRESTAPI", function ($http, account) {
        $http.defaults.cache = true;
        return function (path, body) {
            return $http({
                method: body ? 'POST' : 'GET',
                url: 'https://' + account.account + '.VisualStudio.com/DefaultCollection/_apis/' + path,
                headers: { 'Authorization': 'Basic ' + btoa(account.username + ':' + account.password), 'Content-Type': 'application/json' },
                data: body
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

    app.controller("HomeCtrl", function ($scope, account, $location) {
        account.load();
        $scope.account = account;
        $scope.login = function () {
            account.save();
            $location.path('/user');
        }
    });

    app.controller("UserCtrl", function ($scope, account) {
        $scope.$parent.user = account.username;
    });

    app.controller("WorkItemsCtrl", function ($scope, $ionicLoading, vsoRESTAPI) {
        $ionicLoading.show({ template: "Loading...", noBackdrop: true });
        var body = {
            "wiql": "Select [System.WorkItemType],[System.Title],[System.State],[Microsoft.VSTS.Scheduling.Effort],[System.IterationPath] FROM WorkItemLinks WHERE Source.[System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory' AND Target.[System.WorkItemType] IN GROUP 'Microsoft.RequirementCategory' AND Target.[System.State] IN ('New','Approved','Committed') AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward' ORDER BY [Microsoft.VSTS.Common.BacklogPriority] ASC,[System.Id] ASC MODE (Recursive, ReturnMatchingChildren)"
        }
        vsoRESTAPI('wit/queryresults', JSON.stringify(body)).then(function (res) {
            var data = res.data.results.map(function(item) { return item.sourceId; });
            return vsoRESTAPI('wit/workitems?ids=' + data.join(','));
        }).then(function(res) {
            $ionicLoading.hide();
            $scope.workitems = res.data.value.map(function (item) {
                var field = item.fields.filter(function (f) { return f.field.name == "Title"; })[0];
                return field.value;
            });;
            if (!$scope.workitems) {
                $scope.error = true;
                return;
            }
        }).then(null, function (err) {
            $ionicLoading.hide();
            console.log(err);
        });
    });

    app.controller("ReposCtrl", function ($scope, $ionicLoading, vsoRESTAPI) {
        $ionicLoading.show({ template: "Loading...", noBackdrop: true });
        vsoRESTAPI('git/repositories').then(function (res) {
            $ionicLoading.hide();
            $scope.repos = res.data.value;
            if (!$scope.repos) {
                $scope.error = true;
                return;
            }
            $scope.repos.forEach(function (repo) {
                vsoRESTAPI('git/repositories/' + repo.id + '/stats/branches').then(function (res) {
                    repo.branches = res.data.value;
                }, function (err) {
                    console.log(err);
                });
            });
        }, function (err) {
            $ionicLoading.hide();
            console.log(err);
        });
    });

    app.controller("RepoCtrl", function ($scope, $stateParams, $ionicLoading, vsoRESTAPI) {
        $ionicLoading.show({ template: "Loading...", noBackdrop: true });
        $scope.repoId = $stateParams.id;
        $scope.getHash = function (email) {
            return md5(email.trim().toLowerCase());
        }
        vsoRESTAPI('git/repositories/' + $scope.repoId + '/commits').then(function (res) {
            $ionicLoading.hide();
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