/*
 * requires jquery.js, datatables.js, datatables.input.js
 */

var DataTableBuilder = function (container, table) {
    var tableObject = jQuery(table);
    var containerDiv = jQuery(container);

    // toolbar constants
    var filterBtn = '<div class="dtbl-filter-btn dtbl-toolbar-btn">Filter</div>';
    var refreshBtn = '<div class="dtbl-reload-btn dtbl-toolbar-btn">Refresh</div>';

    var filterMenu = '<div class="dtbl-filter-menu">' +
                         '<div style="height: 25px; width: inherit; margin: 10px 15px 10px 30px;">' + 
                             '<label for="dtbl-filter-list">Filter By: </label>' +
                             '<select id="dtbl-filter-list" style="margin-right: 20px;"></select>' +
                             '<label for="dtbl-filter-entry">Keyword: </label>' +
                             '<input type="text" id="dtbl-filter-entry" autocomplete="off">' +
                         '</div>' +
                         '<div style="margin: 5px 10px; clear: both;"><button id="add-filter">Add Filter</button></div>'+
                         '<div style="margin: 10px 10px 5px 20px;">' +
                             '<span style="position: relative; bottom: 9px;">Filter Text: </span>' +
                             '<textarea id="dtbl-filter-text-list" autocomplete="off" readonly></textarea>' +
                         '</div>' +
                         '<div style="margin: 0 10px 5px 10px;">' +
                             '<button id="clear-filter" style="left: calc(100% - 190px);">Clear Filter</button>' + 
                             '<button id="submit-filter" style="left: calc(100% - 180px);">Ok</button>'+
                         '</div>' +
                     '</div>';

    this.dataTableGrid = null;

    this.getTable = function (){
        return tableObject;
    };

    this.getContainer = function (){
        return containerDiv;
    };

    var constructOptionsToolbar = function (options) {
        if (!Array.isArray(options)) {
            throw new TypeError('options must be of the type array', 'filename.js', 21);
        }
        if (options === null || options.length === 0){
            return '';
        }

        var toolbar = '<div class="dtbl-toolbar">';

        if (options.indexOf('filter') !== -1){
            toolbar = toolbar + filterBtn;
        }
        if (options.indexOf('refresh') !== -1){
            toolbar = toolbar + refreshBtn;
        }
        if (options.indexOf('filter') !== -1){
            toolbar = toolbar + filterMenu;
        }
        toolbar = toolbar + '</div>';

        return toolbar;
    };

    var constructTable = function (tableId, columns){
        var table = '<table id=' + tableId + '>'; 
        for (var idx = 0; idx < columns.length; idx++){
            table = table + '<th>' + columns[idx].header + '</th>';
        }
        table += '</table>';

        return table;
    };

    this.defaultFilters = {};
    this.addedFilters = {};

    this.renderTable = function (parameters) {
        // create table toolbar
        var toolbarDiv = constructOptionsToolbar(parameters.options);
        // create table
        var table = constructTable(parameters.id, parameters.columns);
        tableObject = tableObject === null ? jQuery('#' + parameters.id) : tableObject;
        // add toolbar to container div
        containerDiv.append(toolbarDiv).append(table);
        // initialize event handlers
        this.initializeEventHandlers(parameters.options, parameters.id);
        //construct table grid
        var pLength = isNaN(parseInt(parameters.pageLength)) && parseInt(parameters.pageLength) > 0 ? 10 : parameters.pageLength;

        this.defaultFilters = parameters.data;

        this.setBeforeRender(parameters.beforeRender);
        this.setAfterRender(parameters.afterRender);
        /*
        this.dataTableGrid = tableObject.DataTable({
            serverSide : true,
            pageLength : pLength,
            lengthChange : false,
            searching : false,
            ajax : {
                url : parameters.url,
                data : parameters.data,
                type : 'GET',
                dataType: 'json',
                dataSrc : function (json){
                    return JSON.parse(json.rows);
                }
            },
            columns: parameters.columns,
            columnDefs : parameters.columnDefs
        });

        return this.dataTableGrid;*/
    };

    this.enableRowHighlight = function(handler, enableMultiSelect){
        var util = this.dataTableGrid;
        enableMultiSelect = enableMultiSelect || false;
        tableObject.on('click', 'tr', function(){
            var selected = this; // this event function
            var selectedRows = util.rows('.selected').data();
            var selectedRowsCount = selectedRows.length;
            if (selectedRowsCount > 0 && !enableMultiSelect){
            	util.rows('.selected').deselect();
            }
            jQuery(selected).toggleClass('.selected');
            handler(selectedRows);
        });

        return this.dataTableGrid;
    };

    this.enableRowSelect = function (handler){
        tableObject.on('dblclick', 'tr', function(){
            handler();
        });

        return this.dataTableGrid;
    };

    this.reload = function (dataParameters) {
        if (this.dataTableGrid === null){
            throw new ReferenceError('Data table is not yet rendered', 'filename.js', 117);
        }

        Object.assign(this.dataTableGrid.context[0].ajax.data, dataParameters);
        this.dataTableGrid.draw();

        return this.dataTableGrid;
    };

    this.setBeforeRender = function(handler){
        var util = this;
        tableObject.on('preXhr.dt', function(e, settings, data){
            delete data.columns;
            delete data.order;
            delete data.search;

            if (Object.keys(util.addedFilters).length === 0 && obj.constructor === Object){
                data = {};
                Object.assign(data, util.defaultFilters);
            } else {
                Object.assign(data, util.addedFilters);
            }

            handler(data, e, settings);
        });
    };

    this.setAfterRender = function(handler){
        tableObject.on('xhr.dt', function(e, settings, json, xhr){
            // if filter list has no options
            if (containerDiv.find('#dtbl-filter-list option').length === 0){
                jQuery.each(JSON.parse(json.filters), function(index, value){
                    containerDiv.find('#dtbl-filter-list').append('<option value="' + value + '">' + value.replace('_', ' ') + '</option>');
                });
            }
            handler(json, xhr, e, settings);
        });
    };

    this.initializeEventHandlers = function (options, id){
        if (!Array.isArray(options)){
            throw new TypeError('Options should be of array type', 'filename.js', 43);
        }

        var util = this; // this "library"

        // filter event handlers
        if (options.indexOf('filter') !== -1){
            containerDiv.on('click', '#add-filter', function(event) {
                var filterBy = containerDiv.find('#dtbl-filter-list').val();
                var filterKeyword = containerDiv.find('#dtbl-filter-entry').val().trim();
                if (filterKeyword) {
                    containerDiv.find('#dtbl-filter-text-list')
                        .val(containerDiv.find('#dtbl-filter-text-list').val() + filterBy + '=' + filterKeyword + ';');
                    
                    util.addedFilters[filterBy] = filterKeyword;
                }
            }).on('click', '#submit-filter', function(event) {
                // trigger reload using filters added; if filters are empty, don't reload
                containerDiv.find('.dtbl-filter-menu').toggle();
            }).on('click', '#clear-filter', function(event) {
                containerDiv.find('#dtbl-filter-text-list').val('');
                util.addedFilters = {};
            }).on('click', '.dtbl-filter-btn', function(event) {
                containerDiv.find('.dtbl-filter-menu').toggle();
            });
        }

        // reload event handlers
        if (options.indexOf('reload') !== -1){
            containerDiv.on('click', '.reload-btn', function(event) {
                util.reload();
            });
        }
    };
};

/*
function renderTable : 
parameters: {
	id : ''    				// table id
	url : '',  				// request url
	data : {}, 				// request parameters
	pageLength : 10 		// number of rows per page
	columns : [				// column detail array of objects
		{
			data : '',		// name of property from json
			header : '',    // column header / title to be used
			render : function (data, type, row){
				// data : see above data property
				// type :
				// row : the whole row of data / an object in the json data source
			}
		}, 
		{}
	],
	columnDefs : [], //
	options : [filter, refresh],
	enableMultiSelection : true | false,
	beforeRender : function(data, e, settings){},
	afterRender : function(json, xhr, e, settings){}
}
*/