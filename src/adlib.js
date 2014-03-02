/*

AdLibJS
An argument-based JavaScript framework

The MIT License - (c) 2014, Joshua Beam

joshua.a.beam@gmail.com
	
*/

//TODO: need .siblings()
//TODO: throw TypeErrors?
//TODO: potentially switch polyfills to just plain functions like I already have, or add them to AdLib (like extend)
//		^^^ the above would be similar to jQuery browser-stable methods, like $.inArray, etc., which are accessible
//		to the user.
//TODO: add animation methods? or as add-ons?
//TODO: add event delegation to event methods
//TODO: look into using GRUNT for automation
//TODO: add parameter documentation throughout source
//TODO: use observer pattern to link methods, setters, and states
//TODO: switch args to arguments; variable creation might cost more
//TODO: add _.each or _.forEach method
//TODO: add options to name events to be able to detach specific handlers

;(function(win,doc) {
	
//	Array.prototype.indexOf polyfill for IE<9
//	https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf#Polyfill
	if (!('indexOf' in Array.prototype)) {
		Array.prototype.indexOf = function (searchElement, fromIndex) {
			if ( this === undefined || this === null ) {
				throw new TypeError( '"this" is null or not defined' );
			}

			var length = this.length >>> 0; // Hack to convert object.length to a UInt32

			fromIndex = +fromIndex || 0;

			if (Math.abs(fromIndex) === Infinity) {
				fromIndex = 0;
			}

			if (fromIndex < 0) {
				fromIndex += length;
				if (fromIndex < 0) {
					fromIndex = 0;
				}
			}

			for (;fromIndex < length; fromIndex++) {
				if (this[fromIndex] === searchElement) {
					return fromIndex;
				}
			}

			return -1;
		};
	}
	
//	Selector engine
//	https://github.com/joshbeam/Zelektor
	var Zelekt = (function(){function e(e,t){t.parentElement.insertBefore(e,t)}function t(e,t){t.parentNode.insertBefore(e,t.nextSibling)}function n(e,t){t.appendChild(e)}function r(e,t){t.insertBefore(e,t.firstChild)}function i(e){var t=document.createElement("div"),n;t.innerHTML=e;n=t.firstChild;return n}return function(){var o=arguments,u=o.length,a=o[0],f,l,c,h,p,d;if(u<3){if(typeof a==="string"){l=o[1]?o[1][0]:document;f={"#":"getElementById",".":"getElementsByClassName","@":"getElementsByName","*":"querySelectorAll"}[a[0]]||"getElementsByTagName";a=f.indexOf("Tag")>-1?a:a.slice(1);d=l[f](a);d=d.nodeType===1?[d]:[].slice.call(d)}else if(a.nodeType===1){d=[a]}else if(a instanceof Array){d=a}}else if(u===3){c=o[1];h=o[2][0];p=i(a);switch(c){case"appendTo":n(p,h);break;case"prependTo":r(p,h);break;case"before":e(p,h);break;case"after":t(p,h);break}d=[p]}return d}})(),
	
	styles = doc.documentElement.style,
		
	styleAliases = {
		'float': 'cssFloat' in styles ? 'cssFloat' : 'styleFloat',
//		opacity ?
	},
	
	emptyArray = [];
	

/*

	Various 'helper' functions that are used throughout AdLib.prototype
	
*/
	
	
	function camelize(p) {
//		-moz-appearance => MozAppearance
//		background-color => backgroundColor
		return p.replace(/-(\w)/g,function(m,c) { return c.toUpperCase() });

	}
	
//	shortcut for i=0, i<len, etc.
//	look at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach#Polyfill
	function forEach(array,callback) {
		var i = 0, len = array.length;

		for(;i<len;i++) {
			callback.call(array[i], array[i], i);
		}
	}
	
//	similar to Array.prototype.filter
	function filter(array, callback) {
		var result = [];
		
//		if(!array) return result;
		
		forEach(array,function(item) {
			
			if(callback.call(item, item)) result.push(item);
			
		});
		
		return result;
		
	}
		
//	similar to String.prototype.trim
	function trim(string) {
		return string.replace(/^\s+|\s+$/g, '');
	}
	
//	check if an element has a specific class
	function hasClass(element,klass) {
		var classList = element.className.split(" ");

		return inArray(classList,klass); //classList.indexOf(klass) > -1;
	}
	
//	add a class to an element
	function addClass(element,klass) {
		var classList = element.className.split(" ");

		classList.push(klass);

		element.className = trim(classList.join(" "));
	}
	
	
//	remove a class from an element
	function removeClass(element,klass) {
		
		element.className = filter(element.className.split(' '), function(item) {
			return item !== klass;
		}).join(' ');
		
	}

//	used in AdLib.prototype.set()
	function setClass(el,newClass) {
		var method = /(add|remove|toggle):([\w\d-_]+)/,
			classes,
			prefix;

		if(method.test(newClass)) {
//			add, remove, or toggle
			prefix = RegExp.$1;
			classes = (RegExp.$2).split(' ');

			switch(prefix) {
				case 'add':
					forEach(classes, function(klass) {
						addClass(el,klass);
					});
					break;
				case 'remove':
					forEach(classes,function(klass) {
						removeClass(el,klass);
					});
					break;
				case 'toggle':
					var classList = el.className.split(" ");

					forEach(classes,function(klass) {
						if( inArray(classList,klass) /*classList.indexOf(klass) > -1*/ ) {
							removeClass(el,klass);
						} else {
							addClass(el,klass);
						}
					});		
					break;
			}
		} else {

			el.className = newClass;

		}

	}
	
//	return computed style
	function getStyle(object,prop) {
		var prop = camelize(prop);

//		returns the property, or 'undefined'
		return (win.getComputedStyle(object)||object.currentStyle)[styleAliases[prop]||prop]
	}
	
//	set a style for an element
	function setStyle(object,prop,val) {
		var prop = camelize(prop);

		if((prop in styles) || (prop in styleAliases)) {
			object.style[prop] = val;
			
			return true;
		}
		
		return false;
	}
	
//	get the text of an element
	function getText(object) {
		return object['textContent'||'innerText'];
	}

//	set the text of an element
	function setText(object,text) {
//		Use: _('element').set('text','hello world') => Text: 'hello world'
//			_('element').set('text'),'hello\n\nworld') => HTML: 'hello<br><br>world'
		var text = text.split('\n');

		object['textContent'||'innerText']='';

		forEach(text,function(item, i) {				
			var textNode = doc.createTextNode(item),
				lineBreak = doc.createElement('br');

			if(i!==text.length-1) {
				object.appendChild(textNode.cloneNode());
				object.appendChild(lineBreak.cloneNode());
			} else {
				object.appendChild(textNode.cloneNode());
			}
		});
	}

//	set the innerHTML of an element
	function setHTML(object,html) {
		object.innerHTML = html;	
	}

//	get the number of child elements of an element
	function countChildElements(object) {

		return object.hasChildNodes ? object.getElementsByTagName('*').length : 0;

	}
	
//	get the number of text nodes of an element
	function countTextNodes(object) {
		if(object.hasChildNodes) {
			var children = object.childNodes,
				num = 0;

			forEach(children,function(item) {
				if( isTextNode(item) ) num+=1;
			});

			return num;
		}

		return 0;
	}

//	Bitwise NOT (~) turns -1 (not present in array) to 0
//	Double logical NOT (!!) turns 0 into false
//	Therefore, if the object is not present in the array, this function will return false
	function inArray(array,object) {
		/* experimental */
		return !!(~array.indexOf(object));
	}
	
//	push a single element into an array if it is not an array, or
//	turn an array-like object into an array
	function makeArray(object) {
		/* experimental */
//		if( !isLikeArray(object) ) return [object];
		
		return emptyArray.slice.call(object,0);
	}

/*

	Various functions to check types

*/
	
	function hasHTMLChars(string) {
		return /[\<\>]+/.test(string);
	}
	
	function isPlainObject(object) {
		return !(object != null && object == object.win) && Object.getPrototypeOf(object) == Object.prototype;
	}

	function isArray(object) {
		return /*Array.isArray(object)||*/object instanceof Array;
	}
	
	function isLikeArray(object) {
		return isArray(object) || ( !(~object.length) && !isString(object) );
	}

	function isFunction(object) {
		return /*object instanceof Function||*/typeof(object) === 'function';
	}

	function isNumber(object) {
		return typeof object==='number';
	}

	function isBoolean(object) {
		return typeof object==='boolean';
	}

	function isString(string) {
		return /*string instanceof String||*/typeof string === 'string';
	}
	
	function isHTMLElement(object) {
		return object.nodeType===1;
	}

	function isTextNode(object) {
		return object.nodeType===3;
	}

	function isAdLib(object) {
		return object instanceof AdLib;	
	}
	
//	Checks definition of a declared or undeclared object
//	Does not throw a ReferenceError
	function defined(object) {
		/* experimental */
		return typeof(object)!=='undefined';
	}
	
//	Checks definition of declared object by typecasting to boolean
//	An object exists if it was declared, and has a value other than ("",undefined,NaN,0,null,false)
//	Throws ReferenceError if object was never declared
	function exists(object) {
		/* experimental */
		return !!object;	
	}
	
/*

	The selector/initialization function, which gets the element and returns an AdLib instance
	
*/
	
	function _() {
		var args = arguments,
			len = args.length,
			selector = args[0],
			element;

		if(len<3) {
//			Even if args[1] (context) is undefined, we can still pass it in (it just won't be used)
			element = Zelekt(selector,args[1]);
		} else if (len===3) {
//			We're passing in --
//				selector = HTMLString
//				args[1] = appendTo|prependTo|before|after
//				args[2] = location (DOMElement)
			element = Zelekt(selector,args[1],args[2]);	
		}
		
//		We're passing in --
//			element = array of 1 or more DOMElements
//			selector = original selector text passed into _() (AdLib will use it as a property)
		return new AdLib(element,selector);
	}

/*
	The following constructor takes the element that the initialization function passed into it,
	and then assigns each DOM element some properties, like 'selector', 'events', and 'states'
	which can all be used later by the different AdLib methods.
*/
	
	function AdLib(element,selector) {
		var that = this,
			classes;
				
		forEach(element,function(item,index) {
			if(/^<.+>$/.test(selector)) {
				classes = item.className.split(' ');

				selector = '.'+classes[0];
			}
						
			item.selector = item.selector || selector;
			item.events = item.events || {};
			item.states = item.states || {};
			
//			push each DOM element into the AdLib instance (which is an array-like object)
			that.push(item);
		});

	};
	

/*

	The prototype

*/
	_.fn = AdLib.prototype = {
//		An array-like object (Object[ ]) is much quicker than a plain object ({ })
//		Therefore, it's given several properties of an array
		length: 0,
		push: emptyArray.push,
		splice: emptyArray.splice,
		
//		Here begins all the useable methods

		/*
		
			Handle:
				_('div').filter(1) ==> returns the DIV element with an index of 1 in relation to its original matched set
				_('div').filter( _('.center') ) ==> returns all DIV elements with class 'center'
				_('div').filter( function(el) { return el.get('index') > 0 } ) ==> (next line)
					returns DIV elements with an index greater than 0 in relation to its original matched set
		*/
		
		filter: function() {
			var result = [],
				index,
				object,
				callback;
			
			if( isNumber(arguments[0]) ) {
				
				index = arguments[0];
				
				return _(this[index]);
				
			}
				
			if( isFunction(arguments[0]) ) {
				callback = arguments[0];
				
				forEach(this,function(el) {

					if( callback.call(el, _(el)) ) result.push(el);

				});		

			} else if ( isAdLib(arguments[0]) ) {
				object = arguments[0];
				
				forEach(this,function(el) {

					forEach(object,function(o) {
						if( el === o ) result.push(el);
					});
					
				});
				
			}
			
			return _(result);
		},
		get: function() {
			var el = this[0],
				args = arguments,
				len = args.length,
				type,
				prop;
			
//			Handle: _('div').get('color');
			if(len === 1) {
				prop = args[0];
				
				var map = {
					text: getText(el),
					tag: el.tagName,
					html: el.innerHTML,
					value: el.value,
					index: emptyArray.indexOf.call(makeArray(_(el.selector)),el),
					states: el.states
					//class
					//id
				}[prop.toLowerCase()];
								
				if( defined(map) ) return map;
				
				/***
					POSSIBLE BUG:

					getStyle(el,prop) ==> could return a falsy value?
					Thus, resorting to el.getAttribute(prop), which might not be intended
				***/				
				return getStyle(el,prop) || el.getAttribute(prop);	
				
//			Handle: _('div').get('style','color');
			} else if (len === 2) {
				type = args[0];
				prop = args[1];
				
				return {
					attr: el.getAttribute(prop),
					style: getStyle(el,prop),
					state: el.states[prop]
				}[type];				
			}
		},
		set: function(type,prop,val) {
			var args = arguments,
				len = args.length,
				object,
				type,
				prop,
				val;
//			Handle: _('div').set({
//				style: {
//					color: 'black'
//				},
//				
//				attr: {
//					title: 'foo'	
//				}
//			});
			forEach(this, function(el) {
				if(len===1) {
					object = args[0];

					if( isPlainObject(object) ) {	

						for(t in object) {
							for(v in object[t]) {

								val = object[t][v];

								switch(t) {
									case 'style':
										setStyle( el, v, (isNumber(val) ? val+'px' : val) );
										break;
									case 'attr': el.setAttribute(v,val);
										break;	
								}
							}
						}

					}

	//			Handle: _('div').set('text','hello\nworld');
				} else if (len===2) {
					type = args[0];
					prop = args[1];

					switch(type) {
						case 'text':
							setText(el,prop);
							break;
						case 'html':
							setHTML(el,prop);
							break;
						case 'class':
							setClass(el,prop);
							break;
						default:
							setStyle(el,type,prop) || el.setAttribute(type,prop);
							break;
					}
	//			Handle: _('div').set('style','color','red');
				} else if (len===3) {
					type = args[0];
					prop = args[1];
					val = args[2];

					switch(type) {
						case 'state':
							el.states[prop] = isBoolean(val) ? val : null;
							break;
						case 'style':
							setStyle(el,prop,val);
							break;
						case 'attr':
							el.setAttribute(prop,val);
							break;
					}
				}
			});

			return this;

		},
		has: function() {
			var el,
				args = arguments,
				len = args.length,
				type,
				prop,
				object,
				callback,
				limit;
			
			if(len === 1) {
				el = this[0];
				prop = args[0];
								
				var map = {
					children: countChildElements(el),
					text: countTextNodes(el) > 0
				}[prop];

				if ( defined(map) ) return map;
				
				if( isAdLib(prop) ) {	
					
					if( countChildElements(el) > 0) {
						object = prop;

						forEach(object,function(item) {
							if(el.contains(item) && item !== el) return true;
						});

					}
					
					return false;
						
				} else {
					
					return hasHTMLChars(prop) ?
						el.innerHTML.indexOf(prop) > -1 :
						getText(el).indexOf(prop) > -1;
					
				}

			} else if (len===2) {
				
				el = this[0];
				type = args[0];
				prop = args[1];

				return {
					attr: el.hasAttribute(prop),
					html: el.innerHTML.indexOf(prop) > -1,
					text: getText(el).indexOf(prop) > -1,
					'class': hasClass(el,prop)
				}[type];
					
			}
			// what about div.has('attr','id','someId') ?
		},
		is: function() {
			var el = this[0],
				state = arguments[0];
				
				if( !defined(state) ) {
					
//					return whether or not the element even exists
					return defined(el);
					
				} else {
					
					return el.states[state];
					
				}
		},
		each: function(fn) {
			var el = this;
			
			forEach(el,function(item,i) {
				fn.call(item,_(item),i);
			});
			
			return this;
		},
		on: function() {	
			var len = arguments.length,
				eventType = arguments[0],
				delegatedElement,
				event,
				target,
				node,
				handler;
			
			if(len === 2) {
				handler = arguments[1];
				
				forEach(this, function(el) {
					el.events['on'+eventType] = el.events['on'+eventType]||[];
					el.events['on'+eventType].push(handler);

	//				Update actual event handler
					for(type in el.events) {

						el[type] = function(e) {
							forEach(el.events['on'+eventType],function(fn,i,e) {
								event = e || window.event;
								
								fn.call(el,event);
							})
						}

					}
				});					
			} else if (len === 3) {
				delegatedElement = _(arguments[1]);
				handler = arguments[2];
				
				console.log(delegatedElement);
				
				forEach(this, function(el) {
					el.events['on'+eventType] = el.events['on'+eventType]||[];
					el.events['on'+eventType].push(function(e) {
						event = e || window.event;
						target = event.target || event.srcElement;
						
						forEach(delegatedElement,function(de,i) {
//							if target and delegatedElement are a reference to the same object
							if(target === de) {
								return handler(event);
							}
						});
					});

	//				Update actual event handler
					for(type in el.events) {

						el[type] = function(e) {
							forEach(el.events[type],function(fn,i,e) {
								event = e || window.event;
								fn.call(el,event);
							})

						}

					}
				});					
			}
			
			return this;
			
		},
		off: function(type) {
	
			forEach(this,function(item) {
				item.events['on'+type] = '';
				
				for(key in item.events) {
					item[key] = item.events[key];	
				}						
			});
			
			return this;
		},
	}

//	Give the user access to the initialization function in the window
	win._ = _;
	
})(this,this.document);