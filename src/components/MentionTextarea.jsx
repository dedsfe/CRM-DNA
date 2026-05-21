import { useState, useRef } from 'react';
import { USERS } from '../mockData';
import { useAuth } from '../lib/auth';

const userEmoji = (u) => (u === 'André' ? '🧑' : '👩');

/* Regex: um @ no início ou após espaço, seguido de letras (inclui acento). */
const MENTION_RE = /(^|\s)@(\p{L}*)$/u;

/*
 * Textarea com autocomplete de menções estilo Notion.
 * Digite "@" e escolha André ou Danyelle.
 */
export default function MentionTextarea({ value, onChange, placeholder, rows = 3 }) {
  const ref = useRef(null);
  const { user } = useAuth();
  const [query, setQuery] = useState(null); // null = inativo; string = texto após o @

  const refreshQuery = (el) => {
    const before = el.value.slice(0, el.selectionStart);
    const m = before.match(MENTION_RE);
    setQuery(m ? m[2] : null);
  };

  const handleChange = (e) => {
    onChange(e.target.value);
    refreshQuery(e.target);
  };

  const matches = query === null
    ? []
    : USERS.filter(u => u !== user && u.toLowerCase().startsWith(query.toLowerCase()));

  const insertMention = (name) => {
    const el = ref.current;
    const cursor = el.selectionStart;
    const before = value.slice(0, cursor).replace(MENTION_RE, (_, pre) => `${pre}@${name} `);
    const after = value.slice(cursor);
    onChange(before + after);
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e) => {
    if (query === null || matches.length === 0) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      insertMention(matches[0]);
    } else if (e.key === 'Escape') {
      setQuery(null);
    }
  };

  return (
    <div className="mention-wrap">
      <textarea
        ref={ref}
        className="input textarea"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 120)}
      />
      {matches.length > 0 && (
        <div className="mention-menu">
          {matches.map(u => (
            <button
              type="button"
              key={u}
              className="mention-opt"
              onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
            >
              <span className="mention-opt-emoji">{userEmoji(u)}</span>
              {u}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
