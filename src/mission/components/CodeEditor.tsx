import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { EditorState, Prec } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { useEffect, useEffectEvent, useRef } from 'react';

interface CodeEditorProps {
  /** The code when the editor opens. Later changes come from the learner, not this prop. */
  initialCode: string;
  label: string;
  onChange: (code: string) => void;
  /** Ctrl+Enter or Cmd+Enter. */
  onRun: () => void;
}

const theme = EditorView.theme({
  '&': {
    fontSize: '15px',
    backgroundColor: '#ffffff',
    borderRadius: '0.75rem',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.6',
    minHeight: '12rem',
    maxHeight: '28rem',
  },
  '.cm-content': { padding: '0.75rem 0' },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    color: '#64748b',
    border: 'none',
    borderRight: '1px solid #e2e8f0',
    borderTopLeftRadius: '0.75rem',
    borderBottomLeftRadius: '0.75rem',
  },
  '.cm-activeLine': { backgroundColor: '#eff6ff' },
  '.cm-activeLineGutter': { backgroundColor: '#dbeafe', color: '#1e40af' },
  '&.cm-focused': { outline: '3px solid #2563eb', outlineOffset: '2px' },
});

/** A CodeMirror 6 Python editor. */
export function CodeEditor({ initialCode, label, onChange, onRun }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const change = useEffectEvent(onChange);
  const run = useEffectEvent(onRun);

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialCode,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          highlightActiveLine(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          python(),
          Prec.highest(
            keymap.of([
              {
                key: 'Mod-Enter',
                run: () => {
                  run();
                  return true;
                },
              },
            ]),
          ),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) change(update.state.doc.toString());
          }),
          EditorView.contentAttributes.of({
            'aria-label': label,
            autocapitalize: 'off',
            autocorrect: 'off',
            spellcheck: 'false',
          }),
          theme,
        ],
      }),
    });
    return () => view.destroy();
  }, [initialCode, label]);

  return <div ref={hostRef} className="rounded-xl ring-1 ring-slate-300" />;
}
