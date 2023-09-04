import loader from '@monaco-editor/loader';

export class CodeEditor {
    constructor(editor, opts) {
        this.editor = editor;
        this.$ = editor.$;
        this.pfx = editor.getConfig('stylePrefix');
        this.opts = opts;
        this.canvas = this.findWithinEditor(`.${this.pfx}cv-canvas`);
        this.panelViews = opts.appendTo ? this.$(opts.appendTo) : this.findWithinEditor(`.${this.pfx}pn-${opts.panelId}`);
        this.isShowing = true;
        this.blockPage = () => {return false;};
        if (opts.blockPage && opts.blockPage.block) {
            this.blockPage = (el) => opts.blockPage.block.apply(null, [el]);
        }

        this.unblockPage = () => {return false;};
        if (opts.blockPage && opts.blockPage.unblock) {
            this.unblockPage = (el) => opts.blockPage.unblock.apply(null, [el]);
        }
        this.configEditor = opts.configEditor;
        this.acceptJS = opts.acceptJS;
        this.classOpenCode = opts.classOpenCode;
        this.htmlMonacoEditor = null;
        this.cssMonacoEditor = null;
    }

    findPanel() {
        const pn = this.editor.Panels;
        const id = this.opts.panelId;
        return pn.getPanel(id) || pn.addPanel({ id });
    }

    findWithinEditor(selector) {
        return this.$(selector, this.editor.getEl());
    }

    buildSection(type, codeViewer) {
        const { $, pfx, opts } = this;
        const section = $('<section></section>');
        const btnText = type === 'html' ? opts.htmlBtnText : opts.cssBtnText;
        section.append($(`
            <div class="codepanel-separator">
                <div class="codepanel-label">${type}</div>
                <div class="cp-btn-container">
                    <button class="cp-apply-${type} ${pfx}btn-prim">${btnText}</button>
                </div>
            </div>`));
        
        const codeViewerEl = codeViewer;
        codeViewerEl.style.height = 'calc(100% - 30px)';
        section.append(codeViewerEl);
        this.codePanel.append(section);
        return section.get(0);
    }

    buildCodePanel() {
        const { $, editor } = this;

        this.blockPage(null);

        this.codePanel = $('<div></div>');
        this.codePanel.addClass('code-panel');


        this.htmlCodeEditor = document.createElement("div");
        this.htmlCodeEditor.id = "editor-html";
        this.cssCodeEditor = document.createElement("div");
        this.cssCodeEditor.id = "editor-css";

        this.monacoEditorLoader = loader.init().then(monaco => {
            this.monacoEditor = monaco;

            this.criaCodePanel();
        });
    }
    
    criaCodePanel() {
        const { $, editor } = this;
        const panel = this.opts.panelId ? this.findPanel() : 0;
    
        const sections = [this.buildSection('html', this.htmlCodeEditor), this.buildSection('css', this.cssCodeEditor)];

        panel && !this.opts.appendTo && panel.set('appendContent', this.codePanel).trigger('change:appendContent');
        this.opts.appendTo && $(this.opts.appendTo).append(this.codePanel);

        this.htmlMonacoEditor = this.monacoEditor.editor.create(this.htmlCodeEditor, {
            value: '',
            language: 'html',
            ...this.configEditor,
        });

        this.createAutoClose(this.htmlMonacoEditor);
  
        this.cssMonacoEditor = this.monacoEditor.editor.create(this.cssCodeEditor, {
            value: '',
            language: 'css',
            ...this.configEditor,
        });

        this.htmlMonacoEditor.onDidChangeModelContent(e => {
            if (e.isFlush) {
                setTimeout(() => {
                    this.htmlMonacoEditor.getAction('editor.action.formatDocument').run().then(() => this.unblockPage(this.htmlCodeEditor));
                }, 300)
              // true if setValue call
            } else {
                this.unblockPage(this.htmlCodeEditor)
              // false if user input
            }
        });

        this.cssMonacoEditor.onDidChangeModelContent(e => {
            if (e.isFlush) {
                setTimeout(() => {
                    this.cssMonacoEditor.getAction('editor.action.formatDocument').run().then(() => this.unblockPage(this.cssCodeEditor));
                }, 300)
            } else {
                this.unblockPage(this.cssCodeEditor)
            }
        });

        this.updateEditorContents();

        this.codePanel.find('.cp-apply-html')
            .on('click', this.updateHtml.bind(this));

        this.codePanel.find('.cp-apply-css')
            .on('click', this.updateCss.bind(this));


        editor.on('component:update', model => this.updateEditorContents());
        editor.on('component:selected', model => this.updateEditorContents());
        editor.on('stop:preview', () => {
            if (this.isShowing && !this.opts.preserveWidth) {
                this.canvas.css('width', this.opts.openState.cv);
            }
        });

        this.unblockPage(null);
        this.unblockPage(this.htmlCodeEditor)
        this.unblockPage(this.cssCodeEditor)
    }

    createAutoClose(editor) {
        editor.onKeyDown((event) => {
            // select enabled languages
            const enabledLanguages = ["html"]; // enable js & ts for jsx & tsx
        
            const model = editor.getModel();
            if (!enabledLanguages.includes(model.getLanguageId())) {
              return;
            }
        
            const isSelfClosing = (tag) =>
              [
                "area",
                "base",
                "br",
                "col",
                "command",
                "embed",
                "hr",
                "img",
                "input",
                "keygen",
                "link",
                "meta",
                "param",
                "source",
                "track",
                "wbr",
                "circle",
                "ellipse",
                "line",
                "path",
                "polygon",
                "polyline",
                "rect",
                "stop",
                "use",
              ].includes(tag);

              const isReject = (tag) =>
              [
                "html",
                "head",
                "body",
                "script",
              ].includes(tag);
        
            // when the user enters '>'
            if (event.browserEvent.key === ">") {
              const currentSelections = editor.getSelections();
        
              const edits = [];
              const newSelections = [];
              // potentially insert the ending tag at each of the selections
              for (const selection of currentSelections) {
                // shift the selection over by one to account for the new character
                newSelections.push(
                  new monaco.Selection(
                    selection.selectionStartLineNumber,
                    selection.selectionStartColumn + 1,
                    selection.endLineNumber,
                    selection.endColumn + 1,
                  ),
                );
                // grab the content before the cursor
                const contentBeforeChange = model.getValueInRange({
                  startLineNumber: 1,
                  startColumn: 1,
                  endLineNumber: selection.endLineNumber,
                  endColumn: selection.endColumn,
                });
        
                // if ends with a HTML tag we are currently closing
                const match = contentBeforeChange.match(/<([\w-]+)(?![^>]*\/>)[^>]*$/);
                if (!match) {
                  continue;
                }
        
                const [fullMatch, tag] = match;

                if (isReject(tag)) {
                    return false;
                }

                // skip self-closing tags like <br> or <img>
                if (isSelfClosing(tag) || fullMatch.trim().endsWith("/")) {
                  continue;
                }
        
                // add in the closing tag
                edits.push({
                  range: {
                    startLineNumber: selection.endLineNumber,
                    startColumn: selection.endColumn + 1, // add 1 to offset for the inserting '>' character
                    endLineNumber: selection.endLineNumber,
                    endColumn: selection.endColumn + 1,
                  },
                  text: `</${tag}>`,
                });
              }
        
              // wait for next tick to avoid it being an invalid operation
              setTimeout(() => {
                editor.executeEdits(model.getValue(), edits, newSelections);
              }, 0);
            }
        });
    }

    showCodePanel() {
        this.isShowing = true;
        this.updateEditorContents();
        this.codePanel.css('display', 'block');
        // make sure editor is aware of width change after the 300ms effect ends

        if (this.opts.preserveWidth) return;

        if (this.opts.classOpenCode) {
            
            if (this.opts.classOpenCode.cv && this.opts.classOpenCode.pn) {
                this.panelViews.addClass(this.opts.classOpenCode.pn);
                this.canvas.addClass(this.opts.classOpenCode.cv);
                return;
            }
        }

        let pn = this.opts.openState.pn;
        if (typeof this.opts.openState.pn === "function") {
            pn = this.opts.openState.pn(this);
        }
        let cv = this.opts.openState.cv;
        if (typeof this.opts.openState.cv === "function") {
            cv = this.opts.openState.cv(this);
        }
        this.panelViews.css('width', pn);
        this.canvas.css('width', cv);

    }

    hideCodePanel() {
        if (this.codePanel) this.codePanel.css('display', 'none');
        this.isShowing = false;

        if (this.opts.preserveWidth) return;

        if (this.opts.classOpenCode) {
            if (this.opts.classOpenCode.cv && this.opts.classOpenCode.pn) {
                this.panelViews.removeClass(this.opts.classOpenCode.pn);
                this.canvas.removeClass(this.opts.classOpenCode.cv);
                return;
            }
        }

        let pn = this.opts.closedState.pn;
        if (typeof this.opts.closedState.pn === "function") {
            pn = this.opts.closedState.pn(this);
        }
        let cv = this.opts.closedState.cv;
        if (typeof this.opts.closedState.cv === "function") {
            cv = this.opts.closedState.cv(this);
        }

        this.panelViews.css('width', pn);
        this.canvas.css('width', cv);
    }

    updateHtml(e) {
        e?.preventDefault();
        const { editor} = this;
        const component = this.editor.getSelected();
        let htmlCode = this.htmlMonacoEditor.getValue().trim();
        if (htmlCode === this.previousHtmlCode || !component) {
            editor.em.logWarning('Código HTML não foi aplicado');
            return;
        }

        const re = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gm;
        const re2 = /<script+.*>/gm;
        const re3 = /<\/?body[^>]*>/gi;
        const re4 = /<\/?head[^>]*>/gi;
        const re5 = /<\/?html[^>]*>/gi;
        try {
            if (!this.acceptJS && (re.test(htmlCode) || re2.test(htmlCode))) {
                editor.em.logError('Não é permitido inserir conteúdo JavaScript, o conteúdo script não será aplicado');

                htmlCode = htmlCode.replace(re,"");
                htmlCode = htmlCode.replace(re2,"");

                this.htmlMonacoEditor.getModel().setValue(this.previousHtmlCode);
            }
        } catch(e) {}
        htmlCode = htmlCode.replace(re3,"");
        htmlCode = htmlCode.replace(re4,"");
        htmlCode = htmlCode.replace(re5,"");

        this.blockPage(null);

        try {
            this.previousHtmlCode = htmlCode;
            let idStyles = '';
            this.cssMonacoEditor
                .getValue()
                .split('}\n')
                .filter((el) => Boolean(el.trim()))
                .map((cssObjectRule) => {
                    if (!(/}$/.test(cssObjectRule))) {
                        //* Have to check closing bracket existence for every rule cause it can be missed after split and add it if it doesnt match
                        return `${cssObjectRule}}`;
                    }
                })
                .forEach(rule => {
                    if (/^#/.test(rule))
                        idStyles += rule;
                });
            if (idStyles != "") {
                htmlCode += `<style>${idStyles}</style>`;
            }
            if (component.attributes.type === 'wrapper') {
                editor.setComponents(htmlCode);
            } else {
                editor.select(component.replaceWith(htmlCode));
            }
        } catch(e) {
            this.unblockPage(null);
            editor.em.logError('Erro ao aplicar o código HTML: '+e.message);
            return htmlCode;    
        }
        this.unblockPage(null);

        editor.em.logInfo('Código HTML aplicado com sucesso');
        return;
    }

    updateCss(e) {
        e?.preventDefault();
        const { editor } = this;
        const cssCode = this.cssMonacoEditor.getValue().trim();
        if (cssCode === this.previousCssCode) {
            editor.em.logWarning('Código CSS não foi aplicado');
            return;
        }

        const component = this.editor.getSelected();
        this.blockPage(null);
        try {
            if (component.attributes.type === 'wrapper') {
                editor.Css.clear();
                this.editor.Css.addRules(cssCode);
            }
            else {
                const rule = this.editor.Styles.getSelected() || undefined;
                const css = this.editor.Css;
                const id = rule.getComponent().getId();
                const rules = css.getRules(`#${id}`);
                if (rules && rules.length > 1)
                {
                    this.editor.Css.remove(rules);
                }
    
                if (!cssCode) {
                    rules && rule?.setStyle('')
                }
                else {
                    let cssRule = editor.Parser.parseCss(cssCode);
                    cssRule.map((newRule) => newRule && rule?.setStyle(newRule));
                    this.editor.Css.addRules(cssCode);
                }
            }
            this.previousCssCode = cssCode;
        }
        catch(e) {
            this.unblockPage(null);
            editor.em.logError('Erro ao aplicar o código CSS: '+e.message);
            return;
        }

        this.unblockPage(null);
        editor.em.logInfo('Código CSS aplicado com sucesso');
        return cssCode;
    }

    updateEditorContents() {
        const { editor } = this;
        if (!this.isShowing) return;
        this.blockPage(this.htmlCodeEditor);
        this.blockPage(this.cssCodeEditor);
        setTimeout(() => {
            const component = this.editor.getSelected();
            if (component) {
                if (this.htmlMonacoEditor) {
                    this.previousHtmlCode = this.getComponentHtml(component);
                    this.htmlMonacoEditor.getModel().setValue(this.previousHtmlCode);
                }
                
                const rule = editor.Styles.getSelected() || undefined;
                if (this.cssMonacoEditor && rule) {
                    if (component.attributes.type === 'wrapper') 
                    {
                        this.previousCssCode = this.editor.CodeManager.getCode(component, 'css', {
                            cssc: this.editor.Css
                        });
                        this.cssMonacoEditor.getModel().setValue(this.previousCssCode);
                    }
                    else {
                        const css = editor.Css;
                        const id = rule.getComponent().getId();
                        const rules = css.getRules(`#${id}`);
                        this.previousCssCode = '';
                        for (const newRule of rules) {
                            this.previousCssCode += `${newRule.toCSS()} `;
                        }
                        this.previousCssCode = $.trim(this.previousCssCode);
                        if (this.previousCssCode == "")
                        { 
                            this.previousCssCode = rule ? this.cssFormat(rule?.toCSS({ allowEmpty: true })) : '';
                        }

                        component.getClasses().map((classe) => {
                            const prop = editor.Css.getRule(`.${classe}`)
                            if (prop) {
                                this.previousCssCode += `${prop.toCSS()} `;
                            }
                        });
                        this.cssMonacoEditor.getModel().setValue(this.previousCssCode);
                    }

                }
            }
        }, 10);

    }

    getComponentHtml(component) {
        const { pfx, opts } = this;
        let result = '';
        const componentEl = component.getEl();

        !opts.clearData && componentEl.classList.remove(`${pfx}selected`);
        const html = opts.clearData ? component.toHTML() : (component.attributes.type === 'wrapper' ? componentEl.innerHTML : componentEl.outerHTML);
        !opts.clearData && componentEl.classList.add(`${pfx}selected`);
        result += html;

        const js = opts.editJs ? component.getScriptString() : '';
        result += js ? `<script>${js}</script>` : '';

        return result;
    }

    cssFormat(s) {
        s = s.replace(/\s*([\{\}\:\;\,])\s*/g, "$1");
        s = s.replace(/;\s*;/g, ";");
        s = s.replace(/\,[\s\.\#\d]*{/g, "{");
        s = s.replace(/([^\s])\{([^\s])/g, "$1 {\n\t$2");
        s = s.replace(/([^\s])\}([^\n]*)/g, "$1\n}\n$2");
        s = s.replace(/([^\s]);([^\s\}])/g, "$1;\n\t$2");
        return s;
    }
}
