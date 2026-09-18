import type { ReactNode } from 'react';
import type { StoryMessage } from '../../content/types';
import { ChatIcon, MailIcon } from '../icons';
import { RichText } from '../RichText';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface MessageCardProps {
  message: StoryMessage;
  /** Shown under the message, e.g. a button to reply. */
  children?: ReactNode;
}

/**
 * A message from a character in the story, styled as a chat message or an email so it reads as
 * a request from work rather than lesson text.
 */
export function MessageCard({ message, children }: MessageCardProps) {
  const label = `${message.channel === 'email' ? 'Email' : 'Message'} from ${message.from}, ${message.role}`;

  if (message.channel === 'email') {
    return (
      <article
        aria-label={label}
        className="overflow-hidden rounded-2xl bg-surface ring-1 ring-slate-300"
      >
        <header className="space-y-0.5 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-slate-900">
            <MailIcon aria-hidden="true" className="shrink-0 text-current-ink-700" />
            <span>
              {message.from} <span className="font-normal text-slate-600">· {message.role}</span>
            </span>
          </p>
          {message.subject && (
            <p className="text-slate-700">
              <span className="font-semibold">Subject:</span> {message.subject}
            </p>
          )}
        </header>
        <div className="space-y-3 px-4 py-3">
          <RichText text={message.text} className="space-y-2 leading-relaxed text-slate-800" />
          {children}
        </div>
      </article>
    );
  }

  return (
    <article aria-label={label} className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-current-600 font-bold text-white"
      >
        {initials(message.from)}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className="font-bold text-slate-900">{message.from}</span>
          <span className="text-slate-600">{message.role}</span>
          <ChatIcon aria-hidden="true" className="text-slate-500" />
        </p>
        <div className="space-y-3 rounded-2xl rounded-tl-sm bg-current-50 px-4 py-3 ring-1 ring-current-100">
          <RichText text={message.text} className="space-y-2 leading-relaxed text-slate-800" />
          {children}
        </div>
      </div>
    </article>
  );
}
