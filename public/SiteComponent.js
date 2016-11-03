var SiteComponentScript = document.currentScript;

function SiteComponent(component_name, options){	
	// data is either a string URL or data object
	var _this = this;

	// defaults, override with options
	_this.data_url = null;
	_this.templates = {};
	_this.data = null;
// 	_this.domselector = null;
	_this.domtarget = null;
	_this.domtarget_index = null; // can be "first", "last", or a numeric index from the returned collection
	_this.dataTransformer = null; // can be function that converts returned data
	_this.dataFromDOM = null; // can be function that parses existing DOM to provide data
	_this.trigger_event = null;
	_this.on_event = null;
	_this.file_version = file_version || '1';
	_this.required_templates = {
		'index': 'index.hbs?v='+_this.file_version,
	};
	
	// 	apply user defined options
	if(options && typeof options == "object")
		for(var i in options) 
			if(typeof _this[i] !== "undefined") 
				_this[i] = options[i];	
				
	_this.namespace = component_name;	
	_this.script = SiteComponentScript;
	_this.directory = _this.script.getAttribute('src').split('SiteComponent.js')[0] + component_name;
	_this.directory_url = _this.script.src.split('SiteComponent.js')[0] + component_name;	
	_this.pathArray = _this.directory.split('/');
	

	// Init the script
	_this.run = function(){
		_this.wait(function(){			
			$.getScript(_this.directory_url + '/index.js?v='+_this.file_version, function(){
				_this.getData(function(){
					// call CSS by itself, runs async
					_this.putCSS(function(){});	
						
					if(_this.dataTransformer) _this.dataTransformer();	
					console.log(_this.data);
					_this.required_js_length = Object.keys(_this.required_js).length;				
					_this.required_css_length = Object.keys(_this.required_css).length;
					_this.required_templates_length = Object.keys(_this.required_templates).length;
					_this.getTemplates(function(){
						var completed = 0;
						if(!_this.required_js_length) {
							var event = document.createEvent('Event');
							event.initEvent('mdc_components_loaded', true, true);
							document.dispatchEvent(event);	        		    
							_this.callback(_this.data);							    
// 							$('.mdc_component--loading').removeClass('.mdc_component--loading');
						}
						_this.getScripts(function(textStatus){
							if(textStatus === 'success') completed++;
							if(completed == _this.required_js_length){
								var event = document.createEvent('Event');
								event.initEvent('mdc_components_loaded', true, true);
								document.dispatchEvent(event);	        		    
								 _this.callback(_this.data);								    								 
// 								$('.mdc_component--loading').removeClass('.mdc_component--loading');
							}
						});
					});
				});	
			})
			.done(function(data){
				//alert(data);
			})
			.fail(function(resp, b, c) {
				console.log('index.js load error');
				console.log(resp);
				console.log(b);
				console.log(c);
			})
			.always(function() {
				console.log("script always");
			});
			
		});		
	}



	//!  FUNCTIONS
	
	_this.wait = function(callback){
		if(_this.on_event){
			document.addEventListener(_this.on_event, function() {
				callback();
			});
		}
		else callback();
	}
	
	
	_this.getData = function(callback){
		if(_this.data || (!_this.domselector && !_this.data_url)) callback();
		else if(typeof _this.dataFromDOM == 'function') {
			_this.data = _this.dataFromDOM();
			callback();
		}
		else {
			_this.data_url = (_this.data_url[0] == '/' || _this.data_url.slice(0,4) == 'http') ? _this.data_url : _this.directory+'/'+_this.data_url;
			$.getJSON(_this.data_url, {'component_name': _this.namespace}, function(data){			
				console.log(data);
				_this.data = data;
				callback();
			})
			.fail(function(resp) {
				console.log(resp);
			})
			.always(function() {
				console.log("always");
			});			
		}
	}
	
	
	
/*
	_this.dataFromDOM = function(selector, callback){
		var data = $(selector).map(function() {
			var url = $(this).find('.headline a').attr('href');
			var article_id = url.split('/').slice(-1)[0];
		    return {
		        article_id: article_id,
		        url: url,
		        photo_hash: $(this).find('.lead-photo img').data('image'),
		        content: $(this).find('.headline :header').text()
		    };
		}).get();	
		dataobject = {
			createdFromDom: true,
			party: ($('body').attr('class').indexOf('rnc') !== -1) ? 'rnc' : 'dnc',
			articles: {
				videos: data,
				// podcasts: data,
				// interviews: data,
			}
		};
		callback(dataobject);	
	}
*/
	
	
	
	_this.putCSS = function(callback){
		var returnedcss = '<style>';
		for(var key in _this.required_css){
			var val = _this.required_css[key];
			var path = (val[0] == '/' || val.slice(0,4) == 'http') ? val : _this.directory+'/'+val;
			if(path.indexOf('?') === -1) path = path + '?v=' + _this.file_version;
			else path = path + '&v=' + _this.file_version;
			var completed = 0;
			$.get(path, function(css){
				completed++;
				returnedcss += css;
				if(completed == _this.required_css_length) {
					returnedcss = returnedcss + '</style>';
					$('head').append(returnedcss);
					callback();
				}
			});
		}
	}
	
	
	
	_this.getTemplates = function(callback){
		if(!_this.required_templates) callback();
		 
	    else require(["bootstrap"], function () {
		    
			require(["handlebars"], function (Handlebars) {
				window.Handlebars = Handlebars;
				var completed = 0;
				var template_requests = {};
				for(var key in _this.required_templates){
					var val = _this.required_templates[key];
					var path = val[0] == '/' ? val : _this.directory+'/'+val;
					if(path.indexOf('?') === -1) path = path + '?v=' + _this.file_version;
					else path = path + '&v=' + _this.file_version;					
					var key = key;					
					template_requests[key] = $.get(path, function(hb, textStatus, xhr){
						completed++;
					}).done(function(data, textStatus, xhr){
						if(completed === _this.required_templates_length) {
							
							for(var i in template_requests){
								// to include as a partial instead of a template, use the following format in the key name
								if(i.indexOf('_partial') !== -1) Handlebars.registerPartial(i, template_requests[i].responseText);
								else _this.templates[i] = Handlebars.compile(template_requests[i].responseText);
							}	
							var $targetdiv = _this.domtarget;
							if(_this.domtarget && typeof _this.domtarget === "string")
								var $targetdiv = $(_this.domtarget);
// 							var $rendered = $(_this.templates.index(_this.data));	
							var rendered = _this.templates.index(_this.data);	
							if($targetdiv[0].tagName.toLowerCase() == "script"){
								$targetdiv.before(rendered);
							}
							else{
								if(_this.domtarget_index != null){
									if(_this.domtarget_index == 'last') _this.domtarget_index = -1;
									else if(_this.domtarget_index == 'first') _this.domtarget_index = 0;
									else _this.domtarget_index = parseInt(_this.domtarget_index);
									$targetdiv = $targetdiv.eq(_this.domtarget_index);
								}
								$targetdiv.html(rendered);
							}
							_this.container = $targetdiv;
							$targetdiv.add(rendered);
							$targetdiv.removeClass('hidden hide mdc_component--loading')
								.addClass('mdc_component--loaded')
								.show();					
							
							callback();								
						}
					})
					.fail(function(hb, textStatus, xhr){
						console.log("SiteComponent failed to load template file: " + xhr);
					});
				};			    
			});
		});
	}
	
	
	
	_this.getScripts = function(callback){
		
		for(var key in _this.required_js){
			var val = _this.required_js[key];
			var path = val[0] == '/' ? val : _this.directory+'/'+val;
			if(path.indexOf('?') === -1) path = path + '?v=' + _this.file_version;
			else path = path + '&v=' + _this.file_version;		
			
			if(val.indexOf('handle') !== -1){
				var myScript = document.createElement('script');
				myScript.src = path;				
				document.head.appendChild(myScript);
				callback("success");
			}
			else
				$.getScript(path)
					.done(function(script, textStatus){
						callback(textStatus);
				});
		};	
	};
	
	
	
};


document.addEventListener('mdc_components_loaded', function(e){
	$("[data-mdc_component]").not('.mdc_component--loading, .mdc_component--loaded').each(function(){
		var component_name = $(this).data('mdc_component');
		window[component_name];
		var data = $(this).data();
		delete data.mdc_component;
		if(!data.domtarget) data.domtarget = $(this);
		console.log(data);
		window[component_name] = new SiteComponent(component_name, data);
		window[component_name].run();		
	});
});

