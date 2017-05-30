var app = angular.module('demotable2accordian', ['clofus']);

app.controller('MainCtrl', function($scope, $timeout) {
  $scope.studentmarks = [];
  $scope.getmarks = function(subject, exam) {
    var ismatched = false;
    for (var i = 0; i < $scope.studentmarks.length; i++) {
      if ($scope.studentmarks[i].subject_id == subject.subject_id && $scope.studentmarks[i].exam_id == exam.exam_id) {
        ismatched = true;
        return $scope.studentmarks[i].mark
      }
    }
    if (!ismatched) {
      return 'N/A';
    }
  }

  $scope.allsubjects = [{
    subject_id: 1,
    subject_name: "English",
  }, {
    subject_id: 2,
    subject_name: "Tamil",
  }];

  $scope.allexams = [{
    exam_id: 1,
    exam_name: "Midterm"
  }, {
    exam_id: 2,
    exam_name: "Final"
  }];

  $timeout(function() {
    $scope.studentmarks = [{
      subject_id: 1,
      exam_id: 1,
      mark: 100
    }, {
      subject_id: 2,
      exam_id: 1,
      mark: 50
    }, {
      subject_id: 1,
      exam_id: 2,
      mark: 25
    }, {
      subject_id: 2,
      exam_id: 2,
      mark: 30
    }];
    console.log("data updated")
  }, 3000)




});