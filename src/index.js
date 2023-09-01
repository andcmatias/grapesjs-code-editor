import commands from './commands';
import styles from './styles.scss'

export default (editor, opts = {}) => {
    const style = (styles).replaceAll("#{$prefix}",editor.getConfig('stylePrefix'))
    const styleEl     = document.createElement("style");
    styleEl.type      = 'text/css';
    styleEl.appendChild(document.createTextNode(style));
    document.head.appendChild(styleEl);

    var blocksPage = {
        get: function(query) {
            var el;

            if (query === document) {
                return document;
            }

            if (!!(query && query.nodeType === 1)) {
                return query;
            }

            if (el = document.getElementById(query)) {
                return el;
            } else if (el = document.getElementsByTagName(query)) {
                return el[0];
            } else if (el = document.getElementsByClassName(query)) {
                return el[0];
            } else {
                return null;
            }
        },
        addClass: function(el, className) {
            if (!el || typeof className === 'undefined') {
                return;
            }

            var classNames = className.split(' ');

            if (el.classList) {
                for (var i = 0; i < classNames.length; i++) {
                    if (classNames[i] && classNames[i].length > 0) {
                        el.classList.add(blocksPage.trim(classNames[i]));
                    }
                }
            } else if (!blocksPage.hasClass(el, className)) {
                for (var i = 0; i < classNames.length; i++) {
                    el.className += ' ' + blocksPage.trim(classNames[i]);
                }
            }
        },
        actualWidth: function(el, cache) {
            return blocksPage.actualCss(el, 'width', cache);
        },
        actualCss: function(el, prop, cache) {
            if (el instanceof HTMLElement === false) {
                return;
            }

            if (!el.getAttribute('m-hidden-' + prop) || cache === false) {
                var value;

                // the element is hidden so:
                // making the el block so we can meassure its height but still be hidden
                el.style.cssText = 'position: absolute; visibility: hidden; display: block;';

                if (prop == 'width') {
                    value = el.offsetWidth;
                } else if (prop == 'height') {
                    value = el.offsetHeight;
                }

                el.style.cssText = '';

                // store it in cache
                el.setAttribute('m-hidden-' + prop, value);

                return parseFloat(value);
            } else {
                // store it in cache
                return parseFloat(el.getAttribute('m-hidden-' + prop));
            }
        },
        remove: function(el) {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        },
        trim: function(string) {
            return string.trim();
        },
        hasClass: function(el, className) {
            if (!el) {
                return;
            }

            return el.classList ? el.classList.contains(className) : new RegExp('\\b' + className + '\\b').test(el.className);
        },
        css: function(el, styleProp, value) {
            el = blocksPage.get(el);

            if (!el) {
                return;
            }

            if (value !== undefined) {
                el.style[styleProp] = value;
            } else {
                var value, defaultView = (el.ownerDocument || document).defaultView;
                // W3C standard way:
                if (defaultView && defaultView.getComputedStyle) {
                    // sanitize property name to css notation
                    // (hyphen separated words eg. font-Size)
                    styleProp = styleProp.replace(/([A-Z])/g, "-$1").toLowerCase();
                    return defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
                } else if (el.currentStyle) { // IE
                    // sanitize property name to camelCase
                    styleProp = styleProp.replace(/\-(\w)/g, function(str, letter) {
                        return letter.toUpperCase();
                    });
                    value = el.currentStyle[styleProp];
                    // convert other units to pixels on IE
                    if (/^\d+(em|pt|%|ex)?$/i.test(value)) {
                        return (function(value) {
                            var oldLeft = el.style.left,
                                oldRsLeft = el.runtimeStyle.left;
                            el.runtimeStyle.left = el.currentStyle.left;
                            el.style.left = value || 0;
                            value = el.style.pixelLeft + "px";
                            el.style.left = oldLeft;
                            el.runtimeStyle.left = oldRsLeft;
                            return value;
                        })(value);
                    }
                    return value;
                }
            }
        },
        block: function(target, options) {
            var el = $(target);
    
            options = $.extend(true, {
                opacity: 0.03,
                overlayColor: '#000000',
                state: 'brand',
                type: 'loader',
                size: 'lg',
                centerX: true,
                centerY: true,
                message: '',
                shadow: true,
                width: 'auto'
            }, options);
    
            var skin;
            var state;
            var loading;
            var size;
            var html;
    
            if (options.type == 'spinner') {
                skin = options.skin ? 'm-spinner--skin-' + options.skin : '';
                state = options.state ? 'm-spinner--' + options.state : '';
                loading = '<div class="m-spinner ' + skin + ' ' + state + '"></div';
            } else {
                skin = options.skin ? 'm-loader--skin-' + options.skin : '';
                state = options.state ? 'm-loader--' + options.state : '';
                size = options.size ? 'm-loader--' + options.size : '';
                loading = '<div class="m-loader ' + skin + ' ' + state + ' ' + size + '"></div';
            }
    
            if (options.message && options.message.length > 0) {
                var classes = 'm-blockui ' + (options.shadow === false ? 'm-blockui-no-shadow' : '');
    
                html = '<div class="' + classes + '"><span>' + options.message + '</span><span>' + loading + '</span></div>';
    
                var el = document.createElement('div');
                blocksPage.get('body').prepend(el);
                blocksPage.addClass(el, classes);
                el.innerHTML = '<span>' + options.message + '</span><span>' + loading + '</span>';
                options.width = blocksPage.actualWidth(el) + 10;
                blocksPage.remove(el);
    
                if (target == 'body') {
                    html = '<div class="' + classes + '" style="margin-left:-'+ (options.width / 2) +'px;"><span>' + options.message + '</span><span>' + loading + '</span></div>';
                }
            } else {
                html = loading;
            }
    
            var params = {
                message: html,
                centerY: options.centerY,
                centerX: options.centerX,
                css: {
                    top: '30%',
                    left: '50%',
                    border: '0',
                    padding: '0',
                    backgroundColor: 'none',
                    width: options.width
                },
                overlayCSS: {
                    backgroundColor: options.overlayColor,
                    opacity: options.opacity,
                    cursor: 'wait',
                    zIndex: '10'
                },
                onUnblock: function() {
                    if (el && el[0]) {
                        blocksPage.css(el[0], 'position', '');
                        blocksPage.css(el[0], 'zoom', '');
                    }
                }
            };
    
            if (target == 'body') {
                params.css.top = '50%';
                $.blockUI(params);
            } else {
                var el = $(target);
                el.block(params);
            }
        },
    
        unblock: function(target) {
            if (target && target != 'body') {
                $(target).unblock();
            } else {
                $.unblockUI();
            }
        },
    
        blockPage: function(options) {
            return blocksPage.block('body', options);
        },
    
        unblockPage: function() {
            return blocksPage.unblock('body');
        }
    }

    const block = {
        block: (el) => {
            el = el || '';
            const blockConf = {
                 opacity: 0.5,
                 overlayColor: '#000000',
                 type: 'loader',
                 state: 'info',
                 message: 'Aguarde...'
            };
          
            if(el == '')
            {
                blocksPage.blockPage(blockConf);
            } else if(typeof el === 'object') {
                blocksPage.block(el, blockConf);
            } else {
                if (String(el).substr(0,1) != "#")
                {
                     el = "#" + el;
                }
                blocksPage.block(el, blockConf);
            }
        },
        unblock: (el) => {
            el = el || '';
            
            if(el == '')
            {
                blocksPage.unblockPage();
            } else if(typeof el === 'object') {
                blocksPage.unblock(el);
            } else {
                if (String(el).substr(0,1) != "#")
                {
                    el = "#" + el;
                }
                blocksPage.unblock(el);
            }
        }
    };

    window.blocksPage = blocksPage;


    const options = {
        ...{
            panelId: 'views-container', //Panel to append the code editor
            appendTo: '', //Append to element instead of views-container
            openState: { //State when open
              cv: '65%',
              pn: '35%'
            },
            closedState: { //State when closed
              cv: '85%',
              pn: '15%'
            },
            classOpenCode: { // Use class on open
                cv: "code-editor-aberto",
                pn: "code-editor-aberto"
            }, 
            preserveWidth: false, //Stop resizing openState and closedState
            editJs: false, //Allow editing of javascript, set allowScripts to true for this to work
            htmlBtnText: 'Aplicar', //Save HTML button text
            cssBtnText: 'Aplicar', //Save CSS button text
            blockPage: block, // Object loading
            acceptJS: false, // Accept JS in html code
            configEditor: {
                wordWrap: "on",
                minimap: { enabled: false },
                //lineNumbers: 'off',
                scrollBeyondLastLine: false,
                contextmenu: false,
                fixedOverflowWidgets: true, // Render widgets outside of the container
                showFoldingControls: 'always',
                suggestOnTriggerCharacters: true,
                lineDecorationsWidth: 0,
                //renderLineHighlight: 'none',
                tabSize: 3,
                formatOnType: true,
                formatOnPaste: true,
                autoIndent: true,
                autoClosingBrackets: true,
                autoClosingPairs: true,
                fontSize: "12px",
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontal: 'hidden',
                  // alwaysConsumeMouseWheel: false, ?
                },
            }
        },
        ...opts
    };

    // Load commands
    commands(editor, options);
};
