/* File: js/main.js */
let pyodide = null;
let editor = null;
let tutorials = [];
let activeMarkers = [];

async function loadPyodideAndPackages() {
    pyodide = await loadPyodide();
}

function loadTutorials() {
    return fetch('tutorials/tutorials.json')
        .then(res => res.json());
}

function initEditor(code) {
    if (editor) {
        editor.toTextArea();
        activeMarkers.forEach(marker => editor.removeLineClass(marker.line, 'background', 'error-line'));
        activeMarkers = [];
    }
    editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: 'python',
        theme: 'eclipse',
        lineNumbers: true
    });
    editor.setValue(code);
}

async function showTutorial(index) {
    const tut = tutorials[index];
    document.getElementById('tutorial-container').classList.remove('hidden');
    document.getElementById('instructions').innerText = tut.instructions;
    initEditor(tut.code);
    document.getElementById('output').innerText = '';

    document.getElementById('run-btn').onclick = async () => {
        activeMarkers.forEach(marker => editor.removeLineClass(marker.line, 'background', 'error-line'));
        activeMarkers = [];
        try {
            const result = await pyodide.runPythonAsync(
                `
import sys, io
_buf = io.StringIO()
sys.stdout = _buf
sys.stderr = _buf
try:
${editor.getValue().split('\n').map(line => '    ' + line).join('\n')}
finally:
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__
output = _buf.getvalue()
`);
            const output = pyodide.globals.get('output');
            document.getElementById('output').innerText = output || 'Ran successfully (no output).';
        } catch (err) {
            const msg = err.toString();
            document.getElementById('output').innerText = msg;
            const match = msg.match(/<ipython-input-\d+-(\d+)>/);
            if (match) {
                const lineNum = parseInt(match[1]) - 2; // adjust for wrapper
                editor.addLineClass(lineNum, 'background', 'error-line');
                activeMarkers.push({ line: lineNum });
            }
        }
    };

    document.getElementById('hint-btn').onclick = () => {
        alert(tut.hint);
    };
}

window.addEventListener('load', async () => {
    await loadPyodideAndPackages();
    tutorials = await loadTutorials();
    const list = document.getElementById('tutorial-list');
    tutorials.forEach((t, i) => {
        const li = document.createElement('li');
        li.innerText = t.title;
        li.onclick = () => showTutorial(i);
        list.appendChild(li);
    });
});