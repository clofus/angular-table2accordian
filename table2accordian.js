'use strict';

$.fn.tableToJSON = function(opts) {

    // Set options
    var defaults = {
      ignoreColumns: [],
      onlyColumns: null,
      ignoreHiddenRows: true,
      ignoreEmptyRows: false,
      headings: null,
      allowHTML: false,
      includeRowId: false,
      textDataOverride: 'data-override',
      extractor: null,
      textExtractor: null
    };
    opts = $.extend(defaults, opts);

    var notNull = function(value) {
      return value !== undefined && value !== null;
    };

    var ignoredColumn = function(index) {
      if( notNull(opts.onlyColumns) ) {
        return $.inArray(index, opts.onlyColumns) === -1;
      }
      return $.inArray(index, opts.ignoreColumns) !== -1;
    };

    var arraysToHash = function(keys, values) {
      var result = {}, index = 0;
      $.each(values, function(i, value) {
        // when ignoring columns, the header option still starts
        // with the first defined column
        if ( index < keys.length && notNull(value) ) {
          result[ keys[index] ] = value;
          index++;
        }
      });
      return result;
    };

    var cellValues = function(cellIndex, cell, isHeader) {
      var $cell = $(cell),
        // extractor
        extractor = opts.extractor || opts.textExtractor,
        override = $cell.attr(opts.textDataOverride),
        value;
      // don't use extractor for header cells
      if ( extractor === null || isHeader ) {
        return $.trim( override || ( opts.allowHTML ? $cell.html() : cell.textContent || $cell.text() ) || '' );
      } else {
        // overall extractor function
        if ( $.isFunction(extractor) ) {
          value = override || extractor(cellIndex, $cell);
          return typeof value === 'string' ? $.trim( value ) : value;
        } else if ( typeof extractor === 'object' && $.isFunction( extractor[cellIndex] ) ) {
          value = override || extractor[cellIndex](cellIndex, $cell);
          return typeof value === 'string' ? $.trim( value ) : value;
        }
      }
      // fallback
      return $.trim( override || ( opts.allowHTML ? $cell.html() : cell.textContent || $cell.text() ) || '' );
    };

    var rowValues = function(row, isHeader) {
      var result = [];
      var includeRowId = opts.includeRowId;
      var useRowId = (typeof includeRowId === 'boolean') ? includeRowId : (typeof includeRowId === 'string') ? true : false;
      var rowIdName = (typeof includeRowId === 'string') === true ? includeRowId : 'rowId';
      if (useRowId) {
        if (typeof $(row).attr('id') === 'undefined') {
          result.push(rowIdName);
        }
      }
      $(row).children('td,th').each(function(cellIndex, cell) {
        result.push( cellValues(cellIndex, cell, isHeader) );
      });
      return result;
    };

    var getHeadings = function(table) {
      var firstRow = table.find('tr:first').first();
      return notNull(opts.headings) ? opts.headings : rowValues(firstRow, true);
    };

    var construct = function(table, headings) {
      var i, j, len, len2, txt, $row, $cell,
        tmpArray = [], cellIndex = 0, result = [];
      table.children('tbody,*').children('tr').each(function(rowIndex, row) {
        if( rowIndex > 0 || notNull(opts.headings) ) {
          var includeRowId = opts.includeRowId;
          var useRowId = (typeof includeRowId === 'boolean') ? includeRowId : (typeof includeRowId === 'string') ? true : false;

          $row = $(row);

          var isEmpty = ($row.find('td').length === $row.find('td:empty').length) ? true : false;

          if( ( $row.is(':visible') || !opts.ignoreHiddenRows ) && ( !isEmpty || !opts.ignoreEmptyRows ) && ( !$row.data('ignore') || $row.data('ignore') === 'false' ) ) {
            cellIndex = 0;
            if (!tmpArray[rowIndex]) {
              tmpArray[rowIndex] = [];
            }
            if (useRowId) {
              cellIndex = cellIndex + 1;
              if (typeof $row.attr('id') !== 'undefined') {
                tmpArray[rowIndex].push($row.attr('id'));
              } else {
                tmpArray[rowIndex].push('');
              }
            }

            $row.children().each(function(){
              $cell = $(this);
              // skip column if already defined
              while (tmpArray[rowIndex][cellIndex]) { cellIndex++; }

              // process rowspans
              if ($cell.filter('[rowspan]').length) {
                len = parseInt( $cell.attr('rowspan'), 10) - 1;
                txt = cellValues(cellIndex, $cell);
                for (i = 1; i <= len; i++) {
                  if (!tmpArray[rowIndex + i]) { tmpArray[rowIndex + i] = []; }
                  tmpArray[rowIndex + i][cellIndex] = txt;
                }
              }
              // process colspans
              if ($cell.filter('[colspan]').length) {
                len = parseInt( $cell.attr('colspan'), 10) - 1;
                txt = cellValues(cellIndex, $cell);
                for (i = 1; i <= len; i++) {
                  // cell has both col and row spans
                  if ($cell.filter('[rowspan]').length) {
                    len2 = parseInt( $cell.attr('rowspan'), 10);
                    for (j = 0; j < len2; j++) {
                      tmpArray[rowIndex + j][cellIndex + i] = txt;
                    }
                  } else {
                    tmpArray[rowIndex][cellIndex + i] = txt;
                  }
                }
              }

              txt = tmpArray[rowIndex][cellIndex] || cellValues(cellIndex, $cell);
              if (notNull(txt)) {
                tmpArray[rowIndex][cellIndex] = txt;
              }
              cellIndex++;
            });
          }
        }
      });
      $.each(tmpArray, function( i, row ){
        if (notNull(row)) {
          // remove ignoredColumns / add onlyColumns
          var newRow = notNull(opts.onlyColumns) || opts.ignoreColumns.length ?
            $.grep(row, function(v, index){ return !ignoredColumn(index); }) : row,

            // remove ignoredColumns / add onlyColumns if headings is not defined
            newHeadings = notNull(opts.headings) ? headings :
              $.grep(headings, function(v, index){ return !ignoredColumn(index); });

          txt = arraysToHash(newHeadings, newRow);
          result[result.length] = txt;
        }
      });
      return result;
    };

    // Run
    var headings = getHeadings(this);
    return construct(this, headings);
  };
  
angular.module('clofus', [])
.directive('table', function() {
  return {
    restrict: 'E',
    controller: function($scope, $element, $attrs, $compile, $timeout, $http) {

      var accordian = "";
      $element.wrap("<div class='tablecontainer'></div>");
      $scope.template = "";
      $scope.tabledata = [];
      $scope.windowWidth = $(window).width();
      
      $scope.fetchFirstValue = function(obj) {
        for (var key in obj) {
          return [key, obj[key]];
        }
      }


      function table2json(table) {
        var $table = table
        var rows = [];
        var header = [];

        $table.find("thead th").each(function() {
          header.push($(this).html());
        });

        $table.find("tbody tr").each(function() {
          var row = {};

          $(this).find("td").each(function(i) {
            var key = header[i],
              value = $(this).html();

            row[key] = value;
          });

          rows.push(row);
        });
        return rows;
      }

      function replaceTabletoAccordian(force) {
        if ($scope.windowWidth < 500 && (accordian == "" || force)) {
          $scope.tabledata = table2json($element);
		  $scope.tabledata = $($element).tableToJSON({ignoreHiddenRows: false, allowHTML: true}); // Convert the table into a javascript object
		  
          var target = $($element).parent();
          var html = '<div class="panel-group" id="accordion" role="tablist" aria-multiselectable="true">'+
		    '<div class="panel panel-default" ng-repeat="tr in tabledata track by $index">'+
		      '<div class="panel-heading" role="tab" id="headingOne">'+
		        '<h4 class="panel-title">'+
		         ' <a href="javascript:;" data-target="#collapseOne{{$index}}" role="button" data-toggle="collapse" data-parent="#accordion" '+
		  	  		' aria-expanded="false" aria-controls="collapseOne"  style="text-overflow: ellipsis;overflow: hidden;" ng-bind-html="fetchFirstValue(tr)[1]">'+		          
		         ' </a>'+
		        '</h4>'+
		      '</div>'+
		     ' <div id="collapseOne{{$index}}" class="panel-collapse collapse" role="tabpanel" aria-labelledby="headingOne">'+
		      '  <div class="panel-body">'+
		         ' <dl class="col-lg-6 col-md-6 col-sm-6 col-xs-6" ng-repeat="(key, value) in tr track by $index">'+
		          '  <dt class="text-capitalize" data-row="{{$parent.$index}}" data-col="{{$index}}" style="text-overflow: ellipsis;overflow: hidden;">{{key}}</dt>'+
		           ' <dd class="text-capitalize" data-row="{{$parent.$index}}" data-col="{{$index}}" style="text-overflow: ellipsis;overflow: hidden;" ng-bind-html="value" compile></dd>'+
		          '</dl>'+
		       ' </div>'+
		     ' </div>'+
		    '</div>'+
		  '</div>';
		  
          if (accordian) {
            $(accordian).empty();
          }
		  
		  accordian = $compile(html)($scope)[0];
		  target.append(accordian);
		  
		  $timeout(function(){
		  	$scope.$digest();	
		  })
		  
		  $element.hide();
		  
		  $(accordian).on("click", "dd", function (e) {
		      console.log('a');
			  var rowindex = $(e.currentTarget).attr("data-row");
			  var colindex = $(e.currentTarget).attr("data-col");
			  var tdelement = $(e.currentTarget).closest("#accordion").prev().find("tr").eq(rowindex+1).find("td").eq(colindex).html();
			  
			  var invoke_ngclick = $(e.target).closest("#accordion").prev().find("tr").eq(rowindex+1).find("td").eq(colindex).find('[ng-click]');
			  
			  $timeout(function() {
			     $(invoke_ngclick).filter(function() {
   			        return $(this).text() === $(e.target).text();
   			  	 }).triggerHandler('click');
			  });
			  
		  	  e.stopPropagation(); 
		  });
		  

        } else if ($scope.windowWidth < 500) {
          $(accordian).show();
          $element.hide();
        } else {
          if (accordian != "") {
            $element.show();
            $(accordian).hide();
          }
        }
      }
	  

		  var waitForFinalEvent = (function () {
		    var timers = {};
		    return function (callback, ms, uniqueId) {
		      if (!uniqueId) {
		        uniqueId = "Don't call this twice without a uniqueId";
		      }
		      if (timers[uniqueId]) {
		        clearTimeout (timers[uniqueId]);
		      }
		      timers[uniqueId] = setTimeout(callback, ms);
		    };
		  })();
	
	
	
		// Trigger on Resize Event
		  $(window).resize(function () {
		      waitForFinalEvent(function(){
	            $scope.windowWidth = $(window).width();
	            replaceTabletoAccordian();
		      }, 500, "unique_string");
		  });

		// Trigger on DOM change event
        $scope.$watch(function() {
          return $element.html().length;
        }, function(newValue, oldValue) {
          if (newValue !== oldValue) {
            replaceTabletoAccordian(true);
          }
        });
		
    }
  }
});
