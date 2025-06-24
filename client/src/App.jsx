import { useState, useEffect } from 'react';

export default function App() {
  const [fields, setFields] = useState({ title: '', content: '' });
  const [history, setHistory] = useState([]);
  const [sharedLink, setSharedLink] = useState('');

  useEffect(() => {
    fetch(`/document`)
      .then(res => res.json())
      .then(data => {
        if (data?.current) setFields(data.current);
        if (data?.history) setHistory(data.history);
      });
  }, []);

  const saveVersion = async () => {
    const res = await fetch(`/document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields)
    });
    const data = await res.json();
    setHistory(data.history);
  };

  const generateLink = async () => {
    const res = await fetch(`/share`, { method: 'POST' });
    const data = await res.json();
    setSharedLink(`${window.location.origin}/shared/${data.token}`);
  };

  return (
    <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '1rem' }}>
      <h1>Working Document</h1>
      <input
        style={{ width: '100%', marginBottom: '0.5rem' }}
        value={fields.title}
        onChange={(e) => setFields({ ...fields, title: e.target.value })}
        placeholder="Document Title"
      />
      <textarea
        style={{ width: '100%', height: '150px', marginBottom: '0.5rem' }}
        value={fields.content}
        onChange={(e) => setFields({ ...fields, content: e.target.value })}
        placeholder="Write your content here..."
      ></textarea>
      <div>
        <button onClick={saveVersion}>Save Version</button>
        <button onClick={generateLink} style={{ marginLeft: '1rem' }}>Share</button>
      </div>
      {sharedLink && <div style={{ marginTop: '1rem' }}>Shareable Link: <a href={sharedLink}>{sharedLink}</a></div>}
      <h2 style={{ marginTop: '2rem' }}>Version History</h2>
      {history.map((entry, idx) => (
        <div key={idx} style={{ border: '1px solid #ccc', padding: '0.5rem', marginBottom: '0.5rem' }}>
          <strong>{entry.title}</strong><br />
          <small>{new Date(entry.timestamp).toLocaleString()}</small>
          <div>{entry.content}</div>
        </div>
      ))}
    </div>
  );
}
