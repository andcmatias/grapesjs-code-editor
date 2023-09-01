import { CodeEditor } from './code-editor';
export default (editor, opts) => {
    const cm = editor.Commands;
    let codeEditor = null;

    cm.add("code-editor", {
        run: (editor, sender) => {
            !codeEditor && (codeEditor = new CodeEditor(editor, opts)) && codeEditor.buildCodePanel();
            codeEditor.showCodePanel(sender);
        },
        stop: (editor, sender) => {
            codeEditor.hideCodePanel(sender);
        },
    });

}