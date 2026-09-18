import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import {
  bracketMatching,
  HighlightStyle,
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
import { tags } from '@lezer/highlight';
import { useEffect, useEffectEvent, useRef } from 'react';

interface CodeEditorProps {
  /** The code when the editor opens. Later changes come from the learner, not this prop. */
  initialCode: string;
  label: string;
  onChange: (code: string) => void;
  /** Ctrl+Enter or Cmd+Enter. */
  onRun: () => void;
}

/**
 * Colours come from the app's theme tokens (src/index.css), so the editor follows light and dark
 * mode without being rebuilt.
 */
const theme = EditorView.theme({
  '&': {
    fontSize: '15px',
    color: 'var(--color-slate-900)',
    backgroundColor: 'var(--color-surface)',
    borderRadius: '0.75rem',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.6',
    minHeight: '12rem',
    maxHeight: '28rem',
  },
  '.cm-content': { padding: '0.75rem 0', caretColor: 'var(--color-slate-900)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-slate-900)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    { backgroundColor: 'var(--color-current-100)' },
  '.cm-gutters': {
    backgroundColor: 'var(--color-slate-50)',
    color: 'var(--color-slate-500)',
    border: 'none',
    borderRight: '1px solid var(--color-slate-200)',
    borderTopLeftRadius: '0.75rem',
    borderBottomLeftRadius: '0.75rem',
  },
  '.cm-activeLine': { backgroundColor: 'var(--color-current-50)' },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--color-current-100)',
    color: 'var(--color-current-ink-800)',
  },
  '&.cm-focused': { outline: '3px solid var(--color-current-600)', outlineOffset: '2px' },
});

/** Python syntax colours, from the theme so they read well on light and dark backgrounds. */
const highlightStyle = HighlightStyle.define([
  {
    tag: [
      tags.keyword,
      tags.controlKeyword,
      tags.operatorKeyword,
      tags.definitionKeyword,
      tags.moduleKeyword,
    ],
    color: 'var(--color-syntax-keyword)',
  },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--color-syntax-string)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--color-syntax-number)' },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: 'var(--color-syntax-function)',
  },
  { tag: [tags.className, tags.typeName], color: 'var(--color-syntax-type)' },
  { tag: tags.comment, color: 'var(--color-syntax-comment)', fontStyle: 'italic' },
  { tag: tags.invalid, color: 'var(--color-incorrect-ink-800)' },
]);

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
          syntaxHighlighting(highlightStyle),
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
