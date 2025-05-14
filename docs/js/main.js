// File: js/main.js (updated)
let pyodide = null;
let editor = null;
let tutorials = [];
let activeMarkers = [];

const elemt = document.getElementById

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

async function showHome() {
    // Show instructions only
    document.getElementById('tutorial-container').classList.remove('hidden');
    const instr = document.getElementById('instructions');
    instr.classList.remove('hidden');
    instr.innerHTML = `
        <h2>How to Get Started</h2>
        <p>
            1. Choose a tutorial from the list above.<br>
            2. Edit the code in the editor pane.<br>
            3. Click the <strong>Run</strong> button to execute your code.<br>
            4. If you get stuck, click <strong>Show Hint</strong> for guidance.<br>
            5. Check the output panel below for results and error messages.
        </p>
    `;
    // Hide editor and output
    editor.setValue('')
}

async function showTutorial(index) {
    const tut = tutorials[index];
    document.getElementById('tutorial-container').classList.remove('hidden');
    const instrEl = document.getElementById('instructions');
    instrEl.classList.remove('hidden');
    instrEl.innerText = tut.instructions;
    document.getElementById('editor-container').style.display = 'flex';
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
`
            );
            const output = pyodide.globals.get('output');
            document.getElementById('output').innerText = output || 'Ran successfully (no output).';
        } catch (err) {
            const msg = err.toString();
            document.getElementById('output').innerText = msg;
            const match = msg.match(/<ipython-input-\d+-(\d+)>/);
            if (match) {
                const lineNum = parseInt(match[1]) - 2;
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

    // Add Home tab
    const homeLi = document.createElement('li');
    homeLi.innerText = 'Home';
    homeLi.onclick = () => showHome();
    list.appendChild(homeLi);

    tutorials.forEach((t, i) => {
        const li = document.createElement('li');
        li.innerText = t.title;
        li.onclick = () => showTutorial(i);
        list.appendChild(li);
    });

    // Show Home by default
    showHome();
});
