const openInEditor = require('open-in-editor');

const bulkJsonEdit = {
  openFile(filePath, openCallback) {
    var editor = openInEditor.configure({ editor: 'code' /* vscode */ }, console.error);
    editor
    .open(filePath)
    .then(openCallback)
    .catch(console.error)
  }
}

export default bulkJsonEdit
