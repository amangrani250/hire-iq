import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

function languageExtension(languageId: string): Extension[] {
  const extensions: Extension[] = [EditorView.lineWrapping];
  if (languageId === 'python') extensions.push(python());
  else if (languageId === 'typescript') extensions.push(javascript({ typescript: true }));
  else if (languageId === 'javascript') extensions.push(javascript());
  else if (languageId === 'java') extensions.push(java());
  return extensions;
}

export default function CodeEditor({
  value,
  languageId,
  dark,
  onChange,
}: {
  value: string;
  languageId: string;
  dark: boolean;
  onChange: (value: string) => void;
}) {
  const extensions = useMemo(() => languageExtension(languageId), [languageId]);

  return (
    <CodeMirror
      value={value}
      height="clamp(340px, 50vh, 580px)"
      theme={dark ? oneDark : 'light'}
      extensions={extensions}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        indentOnInput: true,
      }}
    />
  );
}
